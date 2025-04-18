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

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Data Point Formatting Card
 */

class SourceSettings extends FormattingSettingsCard {

    node_color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Default Color",
        value: { value: "#A0A0A0" },
        visible: true
    });

    radius = new formattingSettings.NumUpDown({
        name: "radius",
        displayName: "Node Radius",
        value: 15,
        visible: true
    })

    name: string = "source";
    displayName: string = "Source Node Options";
    slices: Array<FormattingSettingsSlice> = [this.node_color,this.radius];
}

class LinkSettings extends FormattingSettingsCard {

    distance = new formattingSettings.NumUpDown({
        name: "link_distance",
        displayName: "Distance between nodes",
        value: 75,
        visible: true
    })

    gravity = new formattingSettings.NumUpDown({
        name: "link_gravity",
        displayName: "Gravity",
        value: -30,
        visible: true
    })

    width = new formattingSettings.NumUpDown({
        name: "link_width",
        displayName: "Link Width",
        value: 15,
        visible: true
    })

    color = new formattingSettings.ColorPicker({
        name: "link_color",
        displayName: "Color",
        value: { value: "#999999" },
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
    slices: Array<FormattingSettingsSlice> = [this.distance,this.gravity,this.width,this.color,this.opacity];
}

class AdvancedSettings extends FormattingSettingsCard{
    seperator = new formattingSettings.TextInput({
        name: "advanced_seperator",
        displayName: "Seperator used internally in list",
        value: "<SEPERATOR>",
        placeholder: "<SEPERATOR>",
        visible: true
    })

    name: string = "advanced";
    displayName: string = "Advanced Visual Options";
    slices: Array<FormattingSettingsSlice> = [this.seperator];
}

/**
* visual settings model class
*
*/
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards

    SourceSettings = new SourceSettings()
    LinkSettings = new LinkSettings()
    AdvancedSettings = new AdvancedSettings()

    cards = [this.SourceSettings,this.LinkSettings,this.AdvancedSettings];
}