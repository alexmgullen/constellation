/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings, FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";

import { VisualFormattingSettingsModel } from "./settings";

import { v4 as uuid } from "uuid";

export interface DataNode extends d3.SimulationNodeDatum{
    /*
        inherited values
    */
    index?: number | undefined;
    // current postion 
    x?: number | undefined;
    y?: number | undefined;
    // velocities
    vx?: number | undefined;
    vy?: number | undefined;
    // fixed position if position is fixed
    fx?: number | null | undefined;
    fy?: number | null | undefined;

    /*
        custom values
    */
    label: string;
    fill: string;
    stroke: string;
    radius: number;
    selectionId: powerbi.extensibility.ISelectionId;
}

export interface DataLink extends d3.SimulationLinkDatum<DataNode>{
    /*
        inherited values
    */
    source: string | DataNode;
    target: string | DataNode;
    index?: number | undefined;

    /*
        custom values
    */
    fill?: string;
    distance: number;
    stroke: string;
    opacity: number;
    width: number;
}

class ParameterError extends Error {
    constructor(message, options){
        super(message, options)
    }
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;
    private id: string; 

    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private renderingEvents: powerbi.extensibility.IVisualEventService;
    private selectionManager: powerbi.extensibility.ISelectionManager;

    //Visual elements
    private svg: d3.Selection<Element,Object,Element,Object>;
    private nodes: Record<string,DataNode>;

    constructor(options: VisualConstructorOptions) {
        this.id = uuid()
        
        this.host = options.host
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        this.renderingEvents = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        
        if (document) {
            this.svg = d3.select(this.target).append("svg")
                .attr("id","constellation" + this.id)
                .attr('width',options.element.clientWidth)
                .attr('height',options.element.clientHeight)
                .attr("style", "width: 100%; height: 100%;")

            //Create an invisible background for the canvas to allow background clicks to clear selection
            this.svg.append("g").attr("id","background_" + this.id).append("rect")
                .attr("x",-this.target.clientWidth / 2)
                .attr("y",-this.target.clientHeight / 2)
                .attr("width",this.target.clientWidth)
                .attr("height",this.target.clientHeight)
                .attr("fill","rgb(0 0 0 / 0%)")
            
            this.svg.append("g").attr("id","link_group_" + this.id)

            this.svg.append("g").attr("id","node_group_" + this.id)

            this.svg.append("g").attr("id","label_group_" + this.id)
        }
    }

    public update(options: VisualUpdateOptions){
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0])
        this.svg.attr("viewBox", [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight])
        try{

            let formattingNodeDefaultFill: string = "#A0A0A0";
            let formattingNodeDefaultStroke: string = "#0A0A0A";
            let formattingNodeDefaultRadius: number = 15;
            
            let formattingLinkDefaultStroke: string = "#A0A0A0";
            let formattingLinkDefaultOpacity: number = 0.6;
            let formattingLinkDefaultWidth: number = 10;
            let formattingLinkDefaultGravity: number = -30;

            let formattingAdvancedSeperator: string = "<SEPERATOR>";

            if( this.formattingSettings ){

                formattingNodeDefaultFill = this.formattingSettings.nodeSettings.default_fill.value.value || formattingNodeDefaultFill;
                formattingNodeDefaultStroke = this.formattingSettings.nodeSettings.default_stroke.value.value || formattingNodeDefaultStroke;
                formattingNodeDefaultRadius = this.formattingSettings.nodeSettings.default_radius.value || formattingNodeDefaultRadius;

                formattingLinkDefaultStroke = this.formattingSettings.linkSettings.default_stroke.value.value || formattingLinkDefaultStroke;
                formattingLinkDefaultOpacity = this.formattingSettings.linkSettings.default_opacity.value * 0.01 || formattingLinkDefaultOpacity;
                formattingLinkDefaultWidth = this.formattingSettings.linkSettings.default_width.value || formattingLinkDefaultWidth;
                formattingLinkDefaultGravity = this.formattingSettings.linkSettings.default_gravity.value || formattingLinkDefaultGravity;

                formattingAdvancedSeperator = this.formattingSettings.advancedSettings.seperator.value || formattingAdvancedSeperator;
            }

            this.nodes = {};
            const links: Record<string,DataLink> = {};

            if (!options.dataViews 
                || !options.dataViews[0] 
                || !options.dataViews[0].categorical
                || !options.dataViews[0].categorical.values
                || !options.dataViews[0].categorical.values.grouped
            ){
                throw new ParameterError("Not enough parameters, Make sure the Sources, Targets and Distances Columns are populated",{});
            }

            const categoryColumn = options.dataViews[0].categorical.categories[0];
            const categories = options.dataViews[0].categorical.categories[0].values;
            const targets = options.dataViews[0].categorical.values.grouped();

            targets.forEach((target,targetIndex) => {
                //Create a node for target if it exists
                if (target.name){
                    if(target.name.toString() in this.nodes == false){
                        this.nodes[target.name.toString()] = <DataNode>{
                            label: target.name.toString(),
                            fill: formattingNodeDefaultFill,
                            stroke: formattingNodeDefaultStroke,
                            radius: formattingNodeDefaultRadius,
                            selectionId: undefined
                        }
                    }
                }

                //iterate over the sources associated with each target
                target.values[0].values.forEach((distance, distanceIndex) => {
                    
                    // Create a node for each source if they exist
                    if (distance){

                        if(categories[distanceIndex].toString() in this.nodes == false){
                            this.nodes[categories[distanceIndex].toString()] = <DataNode>{
                                label: categories[distanceIndex].toString(),
                                fill: formattingNodeDefaultFill,
                                stroke: formattingNodeDefaultStroke,
                                radius: formattingNodeDefaultRadius,
                                selectionId: this.host.createSelectionIdBuilder().withCategory(categoryColumn,distanceIndex).createSelectionId()
                            }
                        }else{
                            //if the node exists in nodes, but is missing some values, populate those values.
                            if(!this.nodes[categories[distanceIndex].toString()].radius){
                                this.nodes[categories[distanceIndex].toString()].radius = formattingNodeDefaultRadius;
                            }
                            if(!this.nodes[categories[distanceIndex].toString()].selectionId){
                                this.nodes[categories[distanceIndex].toString()].selectionId = this.host.createSelectionIdBuilder().withCategory(categoryColumn,distanceIndex).createSelectionId();
                            }
                        }
                    }

                    //Create a link if the source and the target are valid
                    if (target.name && distance){
                        links[target.name + formattingAdvancedSeperator + categories[distanceIndex].toString()] = <DataLink>{
                            source: this.nodes[target.name.toString()],
                            target: this.nodes[categories[distanceIndex].toString()],
                            distance: distance,
                            stroke: formattingLinkDefaultStroke,
                            opacity: formattingLinkDefaultOpacity,
                            width: formattingLinkDefaultWidth
                        }
                    }
                })
            })

            //Start simulation

            this.renderingEvents.renderingStarted(options);
            const simulation = d3.forceSimulation<DataNode>(Object.keys(this.nodes).map((k) => this.nodes[k]))
            .force("link", d3.forceLink<DataNode, DataLink>(Object.keys(links).map((k) => links[k])).id((d) => d.label).distance((d) => d.distance))
            .force("charge", d3.forceManyBody().strength(formattingLinkDefaultGravity))

            const node_element = this.svg.select("#node_group_" + this.id)
                .selectAll("circle")
                .data<DataNode>(Object.keys(this.nodes).map((k)=> this.nodes[k]))
                .join("circle")
                .attr("r", (d) => d.radius)
                .attr("stroke", (d) => d.stroke)
                .attr("stroke-width",(d) => 2.5)
                .attr("fill", (d) => d.fill)
                .call(d3.drag<SVGCircleElement,DataNode>()
                        .on("start", drag_start)
                        .on("drag", drag)
                        .on("end", drag_end)
                )
                .on("click", (event, d) => node_click(event,d))
                .on("contextmenu", (event, d) => node_contextmenu(event,d))

            // clear the background when the user clicks on an invisible background element
            const background_element = this.svg.select("#background_" + this.id)
                .on("click", (event,d) => background_click(event,d))
                .on("contextmenu", (event,d) => background_contextmenu(event,d))

            const label_element = this.svg.select("#label_group_" + this.id)
                .selectAll("text")
                .data<DataNode>(Object.keys(this.nodes).map((k) => this.nodes[k]))
                .join("text")
                .text((d) => d.label)
                    
            const link_element = this.svg.select("#link_group_" + this.id)
                .selectAll('line')
                .data(Object.keys(links).map((k) => links[k]))
                .join('line')
                .attr("stroke", d => d.stroke)
                .attr("stroke-opacity", d => d.opacity )
                .attr("stroke-width", d => d.width);

            // Set the position attributes of links and nodes each time the simulation ticks.
            simulation.on("tick", () => draw());

            //interactions
            let draw = () => {
                node_element
                    .attr("cx", (d) => {
                        //Bounds checking to ensure nodes don't leave the visual space
                        if (d.x - formattingNodeDefaultRadius < (-this.target.clientWidth / 2)){
                            d.x = (-this.target.clientWidth / 2) + formattingNodeDefaultRadius
                            d.vx = -d.vx
                        }
                        if (d.x + formattingNodeDefaultRadius > (this.target.clientWidth / 2)){
                            d.x = (this.target.clientWidth / 2) - formattingNodeDefaultRadius
                            d.vx = -d.vx
                        }

                        //Regular behaviour if nodes are inside the bounds of our visual
                        return d.x
                    })
                    .attr("cy", (d) => {
                        //Bounds checking to ensure nodes don't leave the visual space
                        if (d.y - formattingNodeDefaultRadius < (-this.target.clientHeight / 2)){
                            d.y = (-this.target.clientHeight / 2) + formattingNodeDefaultRadius
                            d.vy = -d.vy
                        }

                        if (d.y + formattingNodeDefaultRadius > (this.target.clientHeight / 2)){
                            d.y = (this.target.clientHeight / 2) - formattingNodeDefaultRadius
                            d.vy = -d.vy
                        }

                        //Regular behaviour if nodes are inside the bounds of our visual
                        return d.y
                    })

                label_element
                    .attr("x", d => d.x + formattingNodeDefaultRadius)
                    .attr("y", d => d.y - formattingNodeDefaultRadius)

                link_element
                    .attr("x1", d => typeof d.source !== "string" ? d.source.x : undefined)
                    .attr("y1", d => typeof d.source !== "string" ? d.source.y : undefined)
                    .attr("x2", d => typeof d.target !== "string" ? d.target.x : undefined)
                    .attr("y2", d => typeof d.target !== "string" ? d.target.y : undefined)
            }


            let node_click = (event, data) => {
                if (event.defaultPrevented) return;

                this.selectionManager.select(data.selectionId)

                node_element
                    .attr("fill", (d) => {
                        if (d.label === data.label){
                            return d.fill
                        }
                        return `${d.fill }66`
                    })
                    .attr("stroke", (d) => {
                        if (d.label === data.label){
                            return "#0A0A0A"
                        }
                        return "#0A0A0A66"
                    })
                }

            let node_contextmenu = (event, data) => {
                event.preventDefault()
                this.selectionManager.showContextMenu(data.selectionId,{
                    x: event.clientX,
                    y: event.clientY
                })
            }

            let background_click = (event, data) => {
                node_element
                    .attr("fill", (d) => d.fill )
                    .attr("stroke", (d) => d.stroke )
                this.selectionManager.clear()
            }

            let background_contextmenu = (event, data) => {
                event.preventDefault()
                this.selectionManager.showContextMenu({},{
                    x: event.clientX,
                    y: event.clientY
                })

            }

            function drag_start(event){
                if (!event.active) {
                    simulation.alphaTarget(0.3).restart()
                }
                event.subject.fx = event.subject.x
                event.subject.fy = event.subject.y
            }

            function drag(event){
                event.subject.fx = event.x
                event.subject.fy = event.y
            }

            function drag_end(event){
                if (!event.active) simulation.alphaTarget(0)
                event.subject.fx = null
                event.subject.fy = null
            }

            this.renderingEvents.renderingFinished(options);
        
        }catch(e){
            this.renderingEvents.renderingFailed(options, <string>e);

            if( e instanceof ParameterError){
                this.host.displayWarningIcon("Invalid Parameter",e.toString())
            }else{
                this.host.displayWarningIcon("Error",e.toString())
            }
        }
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}


class NodeGroupCard extends formattingSettings.SimpleCard{
    constructor(name, displayName, analyticsPane){
        super()
        this.name = name;
        this.displayName = displayName;
        this.analyticsPane = analyticsPane;
        this.slices = []
    }
}
