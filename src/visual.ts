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
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import * as d3 from "d3";

import { VisualFormattingSettingsModel } from "./settings";

import { v4 as uuid } from "uuid";

interface DataNode extends d3.SimulationNodeDatum{
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
}

interface DataLink extends d3.SimulationLinkDatum<DataNode>{
    /*
        inherited values
    */
    source: string | CustomNode;
    target: string | CustomNode;
    index?: number | undefined;
}

interface CustomNode extends d3.SimulationNodeDatum{
    /*
        base class functions
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
        custom attributes
    */

    label: string
    fill?: string
    size?: number
    selections: Record<string,powerbi.extensibility.ISelectionId>
}

interface CustomLink extends d3.SimulationLinkDatum<CustomNode>{
    /*
        base class functions
    */
    source: string | CustomNode;
    target: string | CustomNode;
    index?: number | undefined;

    /*
        custom attributes
    */
    distance?: number
    color?: string

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
    private svg: d3.Selection<Element,Object,Element,Object>;

    private renderingEvents: powerbi.extensibility.IVisualEventService;
    private selectionManager: powerbi.extensibility.ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.id = uuid()
        
        this.host = options.host
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        this.renderingEvents = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        
        if (document) {
            this.svg = d3.select(this.target).append("svg")
                .attr("id","network" + this.id)
                .attr('width',options.element.clientWidth)
                .attr('height',options.element.clientHeight)
                .attr("style", "width: 100%; height: 100%;");

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

            console.debug("constellation custom visual # ", this.id, " current svg:", this.svg)
        }
        console.log("svg: ", this.svg)


    }

    public update(options: VisualUpdateOptions){
        this.svg.attr("viewBox", [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight])

        const nodes: Record<string,DataNode> = {};
        const links: Record<string,DataLink> = {};
        try{

            if (!options.dataViews 
                || !options.dataViews[0] 
                || !options.dataViews[0].categorical
                || !options.dataViews[0].categorical.values
                || !options.dataViews[0].categorical.values.grouped
            ){
                throw new ParameterError("Not enough parameters, Make sure the Sources, Targets and Distances Columns are populated",{});
            }

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

            //parse formatting settings
            const formattingRadius = this.formattingSettings.SourceSettings.radius.value || 15
            const formattingDistance = this.formattingSettings.LinkSettings.distance.value || 75
            const formattingGravity = this.formattingSettings.LinkSettings.gravity.value || -30
            const formattingColor = this.formattingSettings.SourceSettings.node_color.value.value || "#9D00FF"

            const categories = options.dataViews[0].categorical.categories[0].values;
            
            const data = options.dataViews[0].categorical.values.grouped();

            console.log("categories:", categories)
            console.log("data", data)

            data.forEach((target,targetIndex) => {
                console.log("target: ", target)


                //Create a node for target if it exists

                if (target.name){
                    console.log("target", target)
                    if(target.name.toString() in nodes == false){
                        nodes[target.name.toString()] = <DataNode>{
                            label: target.name.toString()
                        }
                    }
                }
                // Create a node for each source if they exist

                target.values[0].values.forEach((distance, distanceIndex) => {
                    
                    if (distance){
                        console.log("categories, index: ", categories[distanceIndex])

                        if(categories[distanceIndex].toString() in nodes == false){
                            nodes[categories[distanceIndex].toString()] = <DataNode>{
                                label: categories[distanceIndex].toString()
                            }
                        }
                    }

                    //Create a link if the source and the target are valid
                    if (target.name && distance){
                        links[target.name + "<SEPERATOR>" + categories[distanceIndex].toString()] = <DataLink>{
                            source: nodes[target.name.toString()],
                            target: nodes[categories[distanceIndex].toString()]
                        }
                    }
                })
            })

            console.log("nodes: ", nodes)
            console.log("links: ", links)
    
        }catch(e){
            this.renderingEvents.renderingFailed(options, <string>e);

            if( e instanceof ParameterError){
                this.host.displayWarningIcon("Invalid Parameter",e.toString())
            }else{
                this.host.displayWarningIcon("Error",e.toString())
            }
        }
    }

    public old_update(options: VisualUpdateOptions) {

        //update the size of the svg to match the container
        this.svg.attr("viewBox", [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight])

        //TODO: figure out why a dataview is passed to options even when the field has been removed from the viusal
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

        //parse formatting settings
        const formattingRadius = this.formattingSettings.SourceSettings.radius.value || 15
        const formattingDistance = this.formattingSettings.LinkSettings.distance.value || 75
        const formattingGravity = this.formattingSettings.LinkSettings.gravity.value || -30
        const formattingColor = this.formattingSettings.SourceSettings.node_color.value.value || "#9D00FF"

        
        console.log("constellation - update called")
        try{
            this.renderingEvents.renderingStarted(options);

            var nodes : Record<string,CustomNode> = {}
            var links : Record<string,CustomLink> = {}

            var source_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.source_node)
            var source_fill_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.source_fill)
            const source_size_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.source_size)

        
            var target_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.target_node)
            var distance_column_index: number =  options.dataViews[0].table.columns.findIndex((element) => element.roles?.distance)

            var link_color_column_index: number =  options.dataViews[0].table.columns.findIndex((element) => element.roles?.link_color)

            if (source_column_index == -1){
                throw new Error("Sources column is required")
            }

            for (let rowIndex = 0; rowIndex < options.dataViews[0].table.rows.length; rowIndex += 1){
                let row =  options.dataViews[0].table.rows[rowIndex]


                //associate target with both source and target if the target is available
                const selectionId = this.host.createSelectionIdBuilder().withTable(options.dataViews[0].table, rowIndex).createSelectionId()
                const selectionIdKey = selectionId.getKey()
                const tmpRecord : Record<string,powerbi.extensibility.ISelectionId> = {};
                tmpRecord[selectionIdKey] = selectionId
                
                var source: CustomNode = {
                    label: row[source_column_index].toString(),
                    //TODO: can probably simplify this
                    fill: source_fill_column_index > -1 && typeof row[source_fill_column_index] === "string" ? row[source_fill_column_index].toString()  : undefined,
                    size: source_size_column_index > -1 && typeof row[source_size_column_index] === "string" && !Number.isNaN(Number(row[source_size_column_index])) ? Number(row[source_size_column_index]) : undefined,
                    selections: tmpRecord
                }

                if (source.label in nodes){
                    if (!nodes[source.label].fill){
                        nodes[source.label].fill = source.fill
                    }
                    if (!nodes[source.label].size){
                        nodes[source.label].size = source.size
                    }

                    if (!(selectionIdKey in nodes[source.label].selections)){
                        nodes[source.label].selections[selectionIdKey] = selectionId
                    }
                }else{
                    nodes[source.label] = source
                }

                var target: CustomNode = undefined
                
                if (row[target_column_index] && row[target_column_index] !== null){
                    target = {
                        label: row[target_column_index].toString(),
                        selections: tmpRecord
                    }

                    if (target.label in nodes){
                        if(!nodes[target.label].fill){
                            nodes[target.label].fill = target.fill
                        }

                        if(!(selectionIdKey in nodes[target.label].selections)){
                            //TODO: figure out the logic behind this
                            //nodes[target.label].selections[selectionIdKey] = selectionId
                        }

                    }else{
                        nodes[target.label] = target
                    }
                }

		        //create a link if both source and target exist
		        if(source && target){

                    //TODO: abstract the <SEPERATOR> to an "advanced parameter" to prevent undefined behaviour
			        const link_key = `${source.label}<SEPERATOR>${target.label}`
			        if(source && target && ! (link_key in links)){
				        links[link_key] = <CustomLink>{
					        source: source.label,
					        target: target.label,
					        distance: row[distance_column_index] !== null ? row[distance_column_index] : undefined,
					        color: row[link_color_column_index] !== null ? row[link_color_column_index] : undefined,
					        x: 0,
					        y: 0
				        } 
                    }
                }
            }

        const simulation = d3.forceSimulation<CustomNode>(Object.keys(nodes).map((k) => nodes[k]))
            .force("link", d3.forceLink<CustomNode, CustomLink>(Object.keys(links).map((k) => links[k])).id((d) => d.label).distance((d) => formattingDistance))
            .force("charge", d3.forceManyBody().strength(formattingGravity))

        const node_element = this.svg.select("#node_group_" + this.id)
            .selectAll("circle")
            .data<CustomNode>(Object.keys(nodes).map((k)=> nodes[k]))
            .join("circle")
            .attr("r", (d) => d.size || formattingRadius)
            .attr("stroke",d => "#0A0A0A")
            .attr("stroke-width",d => 2.5)
            .attr("fill", d => d.fill || formattingColor)
            .call(d3.drag<SVGCircleElement,CustomNode>()
                    .on("start", drag_start)
                    .on("drag", drag)
                    .on("end", drag_end)
            )
            .on("click", (event, data) => node_click(event,data))

        const background_element = this.svg.select("#background_" + this.id)

        const label_element = this.svg.select("#label_group_" + this.id)
            .selectAll("text")
            .data<CustomNode>(Object.keys(nodes).map((k) => nodes[k]))
            .join("text")
            .text((d) => d.label)
            
        const link_element = this.svg.select("#link_group_" + this.id)
            .selectAll('line')
            .data(Object.keys(links).map((k) => links[k]))
            .join('line')
            .attr("stroke", d => d.color || this.formattingSettings.LinkSettings.color.value.value || "#999999")
            .attr("stroke-opacity", this.formattingSettings.LinkSettings.opacity.value * 0.01 || 0.6)
            .attr("stroke-width", d => this.formattingSettings.LinkSettings.width.value || 5);

        // clear the background when the user clicks on an invisible background element
        background_element.on("click",(event,d) => background_click(event,d))

        // Set the position attributes of links and nodes each time the simulation ticks.
        simulation.on("tick", () => {
            // [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight]
            node_element
                .attr("cx", (d) => {
                    //Bounds checking to ensure nodes don't leave the visual space
                    if (d.x - formattingRadius < (-this.target.clientWidth / 2)){
                        d.x = (-this.target.clientWidth / 2) + formattingRadius
                        d.vx = -d.vx
                    }
                    if (d.x + formattingRadius > (this.target.clientWidth / 2)){
                        d.x = (this.target.clientWidth / 2) - formattingRadius
                        d.vx = -d.vx
                    }

                    //Regular behaviour if nodes are inside the bounds of our visual
                    return d.x
                })
                .attr("cy", (d) => {
                    //Bounds checking to ensure nodes don't leave the visual space
                    if (d.y - formattingRadius < (-this.target.clientHeight / 2)){
                        d.y = (-this.target.clientHeight / 2) + formattingRadius
                        d.vy = -d.vy
                    }

                    if (d.y + formattingRadius > (this.target.clientHeight / 2)){
                        d.y = (this.target.clientHeight / 2) - formattingRadius
                        d.vy = -d.vy
                    }

                    //Regular behaviour if nodes are inside the bounds of our visual
                    return d.y
                })

            label_element
                .attr("x", d => d.x + formattingRadius)
                .attr("y", d => d.y - formattingRadius)


            link_element
                .attr("x1", d => typeof d.source !== "string" ? d.source.x : undefined)
                .attr("y1", d => typeof d.source !== "string" ? d.source.y : undefined)
                .attr("x2", d => typeof d.target !== "string" ? d.target.x : undefined)
                .attr("y2", d => typeof d.target !== "string" ? d.target.y : undefined);
        });

        //interactions
        let node_click = (event, data) => {
            if (event.defaultPrevented) return;

            this.selectionManager.select(Object.values(data.selections))

            node_element
                .attr("fill", (d) => {
                    if (d.label === data.label){
                        return d.fill || formattingColor
                    }
                    return `${d.fill || formattingColor }66`
                })
                .attr("stroke", (d) => {
                    if (d.label === data.label){
                        return "#0A0A0A"
                    }
                    return "#0A0A0A66"
                })
        }

        let background_click = (event, data) => {
            node_element
                .attr("fill", (d) => d.fill || formattingColor )
                .attr("stroke", (d) => "#0A0A0A")
            this.selectionManager.clear()
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
    }catch(update_exception){
        this.host.displayWarningIcon("update error: ", update_exception.toString())
        this.renderingEvents.renderingFailed(options, <string>update_exception);
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
