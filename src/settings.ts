/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import powerbi from "powerbi-visuals-api"
import data = powerbi.data

import FormattingSettingsModel = formattingSettings.Model;

import { DataNode } from "./visual"
import { ColorPicker, SimpleCard } from "powerbi-visuals-utils-formattingmodel/lib/FormattingSettingsComponents";

/**
 * Data Point Formatting Card
 */

class NodeSettings extends formattingSettings.SimpleCard {
    name: string = "node";
    displayName: string = "Node Formatting";
    slices: formattingSettings.Slice[] = [];
}

class LinkSettings extends formattingSettings.SimpleCard {

    gravity = new formattingSettings.NumUpDown({
        name: "link_gravity",
        displayName: "Gravity",
        value: -30,
        visible: true
    })

    color = new formattingSettings.ColorPicker({
        name: "link_color",
        displayName: "Color",
        value: { value: "#999999" },
        visible: true
    })

    width = new formattingSettings.NumUpDown({
        name: "width",
        displayName: "Line Width",
        value: 10,
        visible: true
    })

    opacity = new formattingSettings.NumUpDown({
        name: "link_opacity",
        displayName: "Opacity (% of 100)",
        value: 60,
        options: {
            minValue : { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue : { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    })

    name: string = "link";
    displayName: string = "Link Settings"
    slices: Array<formattingSettings.Slice> = [this.gravity,this.width,this.color,this.opacity];
}

class AdvancedSettings extends formattingSettings.SimpleCard{
    seperator = new formattingSettings.TextInput({
        name: "advanced_seperator",
        displayName: "Seperator used internally in list",
        value: "<SEPERATOR>",
        placeholder: "<SEPERATOR>",
        visible: true
    })

    name: string = "advanced";
    displayName: string = "Advanced Visual Options";
    slices: Array<formattingSettings.Slice> = [this.seperator];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards

    nodeSettings = new NodeSettings()
    linkSettings = new LinkSettings()
    advancedSettings = new AdvancedSettings()
    cards: Array<SimpleCard> = [this.nodeSettings,this.linkSettings,this.advancedSettings]

    populateNodeSettings(dataPoints: Record<string,DataNode>){
        const slices: formattingSettings.Slice[] = this.nodeSettings.slices;

        if(dataPoints){
            Object.keys(dataPoints).forEach((key) => {
                console.log(key)
                slices.push(new ColorPicker({
                    name: "fill",
                    displayName: key,
                    value: { value: dataPoints[key].fill },
                    selector: dataPoints[key].selectionId ? (dataPoints[key].selectionId as any).getSelector() : undefined
                }))
            })
        }

    }
}