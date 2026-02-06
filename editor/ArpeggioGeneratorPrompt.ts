// Copyright (C) 2024 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

import { Config } from "../synth/SynthConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { ColorConfig } from "./ColorConfig";
import { ChangeGroup } from "./Change";
import { ArpeggioGenerator } from "./ArpeggioGenerator";

const { button, div, h2, input, select, option } = HTML;

export class ArpeggioGeneratorPrompt implements Prompt {
    private readonly _styleSelect: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ value: "up" }, "Up"),
        option({ value: "down" }, "Down"),
        option({ value: "upDown" }, "Up-Down"),
        option({ value: "random" }, "Random"),
        option({ value: "chiptune" }, "Classic Chiptune"),
    );

    private readonly _speedSelect: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ value: "24" }, "Slow (1/4)"),
        option({ value: "12" }, "Medium (1/8)"),
        option({ value: "6" }, "Fast (1/16)"),
        option({ value: "3" }, "Insane (1/32)"),
    );

    private readonly _rangeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ value: "1" }, "1 Octave"),
        option({ value: "2" }, "2 Octaves"),
    );

    private readonly _modeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
        option({ value: "chord" }, "Chord → Arpeggio"),
        option({ value: "note" }, "Note → Arpeggio"),
        option({ value: "scale" }, "Scale-based Arpeggio"),
    );

    private readonly _densitySlider: HTMLInputElement = input({ style: "width: 100%;", type: "range", min: "0.1", max: "1.0", step: "0.1", value: "1.0" });

    private readonly _followChordsBox: HTMLInputElement = input({ type: "checkbox", checked: true });
    private readonly _lockRootBox: HTMLInputElement = input({ type: "checkbox" });
    private readonly _bassSafeBox: HTMLInputElement = input({ type: "checkbox" });

    private readonly _barAmountStepper: HTMLInputElement = input({ style: "width: 3em; margin-left: 1em;", type: "number", min: "1", max: Config.barCountMax, value: "1", step: "1" });

    private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width: 45%;" }, "Okay");
    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

    public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 400px;" },
        h2("Arpeggio Generator"),
        div({ style: "display: flex; flex-direction: column; gap: 1em;" },
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Mode"),
                div({ style: "width: 60%;" }, this._modeSelect),
            ),
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Style"),
                div({ style: "width: 60%;" }, this._styleSelect),
            ),
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Speed"),
                div({ style: "width: 60%;" }, this._speedSelect),
            ),
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Range"),
                div({ style: "width: 60%;" }, this._rangeSelect),
            ),
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Density"),
                div({ style: "width: 60%;" }, this._densitySlider),
            ),
            div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Length (bars)"),
                this._barAmountStepper,
            ),
            div({ style: "display: flex; flex-direction: row; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Follow Chord Changes"),
                this._followChordsBox,
            ),
            div({ style: "display: flex; flex-direction: row; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Lock Root Note"),
                this._lockRootBox,
            ),
            div({ style: "display: flex; flex-direction: row; justify-content: space-between;" },
                div({ style: `color: ${ColorConfig.primaryText};` }, "Bass-Safe Mode"),
                this._bassSafeBox,
            ),
        ),
        div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between; margin-top: 1.5em;" },
            this._okayButton,
        ),
        this._cancelButton,
    );

    constructor(private _doc: SongDocument) {
        this._barAmountStepper.value = (this._doc.selection.boxSelectionActive ? this._doc.selection.boxSelectionWidth : 1) + "";

        this._okayButton.addEventListener("click", this._saveChanges);
        this._cancelButton.addEventListener("click", this._close);
        this.container.addEventListener("keydown", this._whenKeyPressed);
    }

    public cleanUp = (): void => {
        this._okayButton.removeEventListener("click", this._saveChanges);
        this._cancelButton.removeEventListener("click", this._close);
        this.container.removeEventListener("keydown", this._whenKeyPressed);
    }

    private _close = (): void => {
        this._doc.undo();
    }

    private _whenKeyPressed = (event: KeyboardEvent): void => {
        if ((<Element>event.target).tagName !== "BUTTON" && event.key === "Enter") {
            // Enter key
            this._saveChanges();
        }
    }

    private _saveChanges = (): void => {
        const group: ChangeGroup = ArpeggioGenerator.generate({
            style: this._styleSelect.value,
            speed: parseInt(this._speedSelect.value),
            range: parseInt(this._rangeSelect.value),
            mode: this._modeSelect.value,
            density: parseFloat(this._densitySlider.value),
            followChords: this._followChordsBox.checked,
            lockRoot: this._lockRootBox.checked,
            bassSafe: this._bassSafeBox.checked,
            barAmount: parseInt(this._barAmountStepper.value),
        }, this._doc);

        this._doc.prompt = null;
        this.cleanUp();
        this._doc.record(group, true);
    }
}
