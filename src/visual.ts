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
import * as d3 from "d3";

import { VisualFormattingSettingsModel } from "./settings";

import { v4 as uuid } from "uuid";

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

export class Visual implements IVisual {
    private target: HTMLElement;
    private id: string; 

    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<Element,Object,Element,Object>;

    constructor(options: VisualConstructorOptions) {
        this.id = uuid()
        console.info("Constellation #",this.id," Constructed")

        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        
        if (document) {
            this.svg = d3.select(this.target).append("svg")
                .attr("id","network" + this.id)
                .attr('width',options.element.clientWidth)
                .attr('height',options.element.clientHeight)
                .attr("viewBox", [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight])
                .attr("style", "width: 100%; height: 100%;");


            this.svg.append("g").attr("id","link_group_" + this.id)

            this.svg.append("g").attr("id","node_group_" + this.id)

            this.svg.append("g").attr("id","label_group_" + this.id)

            console.info("current svg:", this.svg)
        }
    }

    public update(options: VisualUpdateOptions) {
        //TODO: figure out why a dataview is passed to options even when the field has been removed from the viusal
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews[0]);

        try{
            var nodes : Array<CustomNode> = []
            var links : Array<CustomLink> = []

            console.info("Constellation #",this.id," - Nodes: ", nodes)
            console.info("Constellation #",this.id," - Links: ", links)

            var source_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.source_node)
            var source_fill_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.source_fill)
        
            var target_column_index: number = options.dataViews[0].table.columns.findIndex((element) => element.roles?.target_node)
            var distance_column_index: number =  options.dataViews[0].table.columns.findIndex((element) => element.roles?.distance)

            var link_color_column_index: number =  options.dataViews[0].table.columns.findIndex((element) => element.roles?.link_color)

            if (source_column_index == -1){
                throw new Error("Sources column is required")
            }

            options.dataViews[0].table.rows.forEach((row) => {
                var source: CustomNode = {
                    label: row[source_column_index].toString(),
                    //TODO: can probably simplify this
                    fill: source_fill_column_index > -1 && typeof row[source_fill_column_index] === "string" ? row[source_fill_column_index].toString()  : undefined
                }

                //TODO: find a more efficient way to do this
                var source_exists = false
                nodes.forEach((node) => {
                    if (node.label === source.label){
                        source_exists = true

                        if (!node.fill){
                            node.fill = source.fill
                        }
                    }
                })
                if (!source_exists && source && source !== undefined){
                    nodes.push(source)
                }
            
                // Check if target column exists
                var target: CustomNode = undefined
                
                
                if (row[target_column_index] && row[target_column_index] !== null){
                    target = {
                        label: row[target_column_index].toString()
                    }

                    // Check if target exists in nodes
                    var target_exists = false
                    nodes.forEach((node) => {
                        if (node.label === target.label){
                            target_exists = true
                        }
                    })
                    if (target_exists === false && target && target !== undefined){
                        nodes.push(target)
                    }
                }    

                var link_exists = false
                links.forEach((link) => {
                    if (link.source === source.label && link.target == target.label){
                        link_exists = true
                    }
                })

                if (!link_exists && target && target !== undefined){
                    links.push(<CustomLink>{
                        source: source.label,
                        target: target.label,
                        distance: row[distance_column_index] !== null ? row[distance_column_index] : undefined,
                        color: row[link_color_column_index] !== null ? row[link_color_column_index] : undefined,
                        x: 0,
                        y: 0
                    })
                }
        })

        const radius = this.formattingSettings.SourceSettings.radius.value || 15

        const simulation = d3.forceSimulation<CustomNode>(nodes)
            .force("link", d3.forceLink<CustomNode, CustomLink>(links).id((d) => d.label).distance((d) => this.formattingSettings.LinkSettings.distance.value))
            .force("charge", d3.forceManyBody().strength(this.formattingSettings.LinkSettings.gravity.value || -30))

        const node_element = this.svg.select("#node_group_" + this.id)
            .selectAll("circle")
            .data<CustomNode>(nodes)
            .join("circle")
            .attr("r", radius)
            .attr("stroke",d => "#0A0A0A")
            .attr("stroke-width",d => 2.5)
            .attr("fill", d => d.fill || this.formattingSettings.SourceSettings.node_color.value.value || "#9D00FF")
            .call(d3.drag<SVGCircleElement,CustomNode>()
                    .on("start", drag_start)
                    .on("drag", drag)
                    .on("end", drag_end)
            )

        const label_element = this.svg.select("#label_group_" + this.id)
            .selectAll("text")
            .data<CustomNode>(nodes)
            .join("text")
            .text((d) => d.label)
            
        const link_element = this.svg.select("#link_group_" + this.id)
            .selectAll('line')
            .data(links)
            .join('line')
            .attr("stroke", d => d.color || this.formattingSettings.LinkSettings.color.value.value || "#999999")
            .attr("stroke-opacity", this.formattingSettings.LinkSettings.opacity.value * 0.01 || 0.6)
            .attr("stroke-width", d => this.formattingSettings.LinkSettings.width.value || 5);

        // Set the position attributes of links and nodes each time the simulation ticks.
        simulation.on("tick", () => {

            // [-this.target.clientWidth / 2, -this.target.clientHeight / 2, this.target.clientWidth, this.target.clientHeight]
            node_element
                .attr("cx", (d) => {
                    if (d.x - radius < (-this.target.clientWidth / 2)){
                        d.x = (-this.target.clientWidth / 2) + radius
                        d.vx = -d.vx
                    }
                    if (d.x + radius > (this.target.clientWidth / 2)){
                        d.x = (this.target.clientWidth / 2) - radius
                        d.vx = -d.vx
                    }
                    return d.x
                })
                .attr("cy", (d) => {
                    if (d.y - radius < (-this.target.clientHeight / 2)){
                        d.y = (-this.target.clientHeight / 2) + radius
                        d.vy = -d.vy
                    }

                    if (d.y + radius > (this.target.clientHeight / 2)){
                        d.y = (this.target.clientHeight / 2) - radius
                        d.vy = -d.vy
                    }
                    return d.y
                })

            label_element
                .attr("x", d => d.x + this.formattingSettings.SourceSettings.radius.value || 15)
                .attr("y", d => d.y - this.formattingSettings.SourceSettings.radius.value || 15)


            link_element
                .attr("x1", d => typeof d.source !== "string" ? d.source.x : undefined)
                .attr("y1", d => typeof d.source !== "string" ? d.source.y : undefined)
                .attr("x2", d => typeof d.target !== "string" ? d.target.x : undefined)
                .attr("y2", d => typeof d.target !== "string" ? d.target.y : undefined);
        });

        
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
    }catch(update_exception){
        console.error("update error: ",update_exception)
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