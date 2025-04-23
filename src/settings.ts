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

    default_fill = new formattingSettings.ColorPicker({
        name: "node_default_fill",
        displayName: "Default Color",
        value: { value: "#A0A0A0" }
    })

    default_stroke = new formattingSettings.ColorPicker({
        name: "node_default_stroke",
        displayName: "Default Border Color",
        value: { value: "#0A0A0A"}
    })

    default_radius = new formattingSettings.NumUpDown({
        name: "node_default_radius",
        displayName: "Default Radius",
        value: 15
    })

    slices: formattingSettings.Slice[] = [this.default_fill,this.default_stroke,this.default_radius];
}

class LinkSettings extends formattingSettings.SimpleCard {

    default_stroke = new formattingSettings.ColorPicker({
        name: "link_default_stroke",
        displayName: "Color",
        value: { value: "#A0A0A0" },
        visible: true
    })

    default_opacity = new formattingSettings.NumUpDown({
        name: "link_default_opacity",
        displayName: "Opacity (% of 100)",
        value: 60,
        options: {
            minValue : { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue : { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    })

    default_width = new formattingSettings.NumUpDown({
        name: "link_default_width",
        displayName: "Line Width",
        value: 10,
        visible: true
    })

    default_gravity = new formattingSettings.NumUpDown({
        name: "link_default_gravity",
        displayName: "Gravity",
        value: -30,
        visible: true
    })

    name: string = "link";
    displayName: string = "Link Settings"
    slices: Array<formattingSettings.Slice> = [this.default_stroke,this.default_opacity,this.default_width,this.default_gravity];
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
    nodeSettings = new NodeSettings()
    linkSettings = new LinkSettings()
    advancedSettings = new AdvancedSettings()
    cards: Array<SimpleCard> = [this.nodeSettings, this.linkSettings, this.advancedSettings]
}