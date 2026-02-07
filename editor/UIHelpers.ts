// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { InstrumentType } from "../synth/SynthConfig";
import { EditorConfig, Preset, PresetCategory } from "./EditorConfig";

const { select, option, optgroup } = HTML;

export function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    for (let index: number = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}

// Similar to the above, but adds a non-interactive header to the list.
// @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!

export function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

    for (const item of items) {
        menu.appendChild(option({ value: item }, item));
    }
    return menu;
}

export function buildPresetOptions(isNoise: boolean, idSet: string): HTMLSelectElement {
    const menu: HTMLSelectElement = select({ id: idSet });


    // Show the "spectrum" custom type in both pitched and noise channels.
    //const customTypeGroup: HTMLElement = optgroup({label: EditorConfig.presetCategories[0].name});
    if (isNoise) {
        menu.appendChild(option({ value: InstrumentType.noise }, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
        menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
        menu.appendChild(option({ value: InstrumentType.drumset }, EditorConfig.valueToPreset(InstrumentType.drumset)!.name));
    } else {
        menu.appendChild(option({ value: InstrumentType.chip }, EditorConfig.valueToPreset(InstrumentType.chip)!.name));
        menu.appendChild(option({ value: InstrumentType.customChipWave }, EditorConfig.valueToPreset(InstrumentType.customChipWave)!.name));
        menu.appendChild(option({ value: InstrumentType.pwm }, EditorConfig.valueToPreset(InstrumentType.pwm)!.name));
        menu.appendChild(option({ value: InstrumentType.supersaw}, EditorConfig.valueToPreset(InstrumentType.supersaw)!.name));
        menu.appendChild(option({ value: InstrumentType.fm }, EditorConfig.valueToPreset(InstrumentType.fm)!.name));
        menu.appendChild(option({ value: InstrumentType.fm6op }, EditorConfig.instrumentToPreset(InstrumentType.fm6op)!.name));
        menu.appendChild(option({ value: InstrumentType.harmonics }, EditorConfig.valueToPreset(InstrumentType.harmonics)!.name));
        menu.appendChild(option({ value: InstrumentType.pickedString }, EditorConfig.valueToPreset(InstrumentType.pickedString)!.name));
        menu.appendChild(option({ value: InstrumentType.spectrum }, EditorConfig.valueToPreset(InstrumentType.spectrum)!.name));
        menu.appendChild(option({ value: InstrumentType.noise }, EditorConfig.valueToPreset(InstrumentType.noise)!.name));
    }

    // TODO - When you port over the Dogebox2 import/export buttons be sure to uncomment these
    const randomGroup: HTMLElement = optgroup({ label: "Randomize ▾" });
    // const randomGroup: HTMLElement = optgroup({ label: "▾ Randomize" });
    randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset"));
    randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated"));
    menu.appendChild(randomGroup);

    let firstCategoryGroup: HTMLElement | null = null;
    let customSampleCategoryGroup: HTMLElement | null = null;

    for (let categoryIndex: number = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
        const category: PresetCategory = EditorConfig.presetCategories[categoryIndex];
        const group: HTMLElement = optgroup({ label: category.name + " ▾" });
        // const group: HTMLElement = optgroup({ label: "▾ " + category.name });
        let foundAny: boolean = false;
        for (let presetIndex: number = 0; presetIndex < category.presets.length; presetIndex++) {
            const preset: Preset = category.presets[presetIndex];
            if ((preset.isNoise == true) == isNoise) {
                group.appendChild(option({ value: (categoryIndex << 6) + presetIndex }, preset.name));
                foundAny = true;
            }
        }

        if (categoryIndex === 1 && foundAny) {
            firstCategoryGroup = group;
        } else if (category.name === "Custom Sample Presets" && foundAny) {
            customSampleCategoryGroup = group;
        }

        // Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
        if (category.name == "String Presets" && foundAny) {

            // Put violin 2 after violin 1
            let moveViolin2 = group.removeChild(group.children[11]);
            group.insertBefore(moveViolin2, group.children[1]);
        }

        if (category.name == "Flute Presets" && foundAny) {

            // Put flute 2 after flute 1
            let moveFlute2 = group.removeChild(group.children[11]);
            group.insertBefore(moveFlute2, group.children[1]);
        }

        if (category.name == "Keyboard Presets" && foundAny) {

            // Put grand piano 2 and 3 after grand piano 1
            let moveGrandPiano2 = group.removeChild(group.children[9]);
            let moveGrandPiano3 = group.removeChild(group.children[9]);
            group.insertBefore(moveGrandPiano3, group.children[1]);
            group.insertBefore(moveGrandPiano2, group.children[1]);
        }

        if (foundAny) menu.appendChild(group);
    }

    if (firstCategoryGroup != null && customSampleCategoryGroup != null) {
        // Put the custom sample presets at the top.
        const parent: HTMLSelectElement = <HTMLSelectElement>customSampleCategoryGroup.parentNode;
        parent.removeChild(customSampleCategoryGroup);
        parent.insertBefore(customSampleCategoryGroup, firstCategoryGroup);
    }

    return menu;
}

export function setSelectedValue(menu: HTMLSelectElement, value: number, isSelect2: boolean = false): void {
    const stringValue = value.toString();
    if (menu.value != stringValue) {
        menu.value = stringValue;

        // Change select2 value, if this select is a member of that class.
        if (isSelect2) {
            $(menu).val(value).trigger('change.select2');
        }
    }
}
