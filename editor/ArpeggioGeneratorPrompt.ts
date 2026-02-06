// Copyright (C) 2024 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

import { Config } from "../synth/SynthConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { ColorConfig } from "./ColorConfig";
import { ChangeGroup } from "./Change";
import { ChangeEnsurePatternExists, ChangePatternNumbers, ChangeNoteAdded, ChangeNoteTruncate } from "./changes";
import { Note } from "../synth/synth";

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
        if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) {
            // Enter key
            this._saveChanges();
        }
    }

    private _saveChanges = (): void => {
        const style = this._styleSelect.value;
        const speed = parseInt(this._speedSelect.value);
        const range = parseInt(this._rangeSelect.value);
        const mode = this._modeSelect.value;
        const density = parseFloat(this._densitySlider.value);
        const followChords = this._followChordsBox.checked;
        const lockRoot = this._lockRootBox.checked;
        const bassSafe = this._bassSafeBox.checked;
        const barAmount = parseInt(this._barAmountStepper.value);

        const group: ChangeGroup = new ChangeGroup();
        const startBar = this._doc.selection.boxSelectionActive ? this._doc.selection.boxSelectionBar : this._doc.bar;
        const channelIndex = this._doc.channel;
        const beatsPerBar = this._doc.song.beatsPerBar;
        const partsPerBar = Config.partsPerBeat * beatsPerBar;

        let basePitches: number[] = [];
        if (mode === "note") {
            const pattern = this._doc.song.getPattern(channelIndex, startBar);
            if (pattern && pattern.notes.length > 0) {
                basePitches = [pattern.notes[0].pitches[0]];
            } else {
                basePitches = [Config.keys[this._doc.song.key].basePitch];
            }
        } else if (mode === "scale") {
            const scaleFlags = Config.scales[this._doc.song.scale].flags;
            const rootPitch = Config.keys[this._doc.song.key].basePitch;
            for (let i = 0; i < scaleFlags.length; i++) {
                if (scaleFlags[i]) basePitches.push(rootPitch + i);
            }
        }

        for (let b = 0; b < barAmount; b++) {
            const bar = startBar + b;
            if (bar >= this._doc.song.barCount) break;

            if (mode === "chord" || (followChords && (mode === "note" || mode === "chord"))) {
                const pattern = this._doc.song.getPattern(channelIndex, bar);
                if (pattern && pattern.notes.length > 0) {
                    const uniquePitches = new Set<number>();
                    for (const note of pattern.notes) {
                        for (const p of note.pitches) uniquePitches.add(p);
                    }
                    basePitches = Array.from(uniquePitches).sort((a, b) => a - b);
                } else if (!followChords && basePitches.length === 0) {
                    basePitches = [Config.keys[this._doc.song.key].basePitch];
                }
            }

            if (basePitches.length === 0) continue;

            let arpPitches = [...basePitches];
            if (range === 2) {
                arpPitches = arpPitches.concat(basePitches.map(p => p + 12));
            }
            arpPitches.sort((a, b) => a - b);

            let sequence: number[] = [];
            if (style === "up") sequence = arpPitches;
            else if (style === "down") sequence = [...arpPitches].reverse();
            else if (style === "upDown") sequence = arpPitches.concat([...arpPitches].reverse().slice(1, -1));
            else if (style === "random") {
                sequence = [...arpPitches];
                // Deterministic shuffle for this bar
                let seed = bar;
                for (let i = sequence.length - 1; i > 0; i--) {
                    seed = (seed * 9301 + 49297) % 233280;
                    const j = Math.floor((seed / 233280) * (i + 1));
                    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
                }
            } else if (style === "chiptune") {
                sequence = arpPitches.slice(0, 3);
            }

            group.append(new ChangePatternNumbers(this._doc, 0, bar, channelIndex, 1, 1));
            group.append(new ChangeEnsurePatternExists(this._doc, channelIndex, bar));
            const pattern = this._doc.song.getPattern(channelIndex, bar);
            if (pattern == null) continue;
            group.append(new ChangeNoteTruncate(this._doc, pattern, 0, partsPerBar));

            let seqIdx = 0;
            let noteIdx = 0;
            for (let part = 0; part < partsPerBar; part += speed) {
                // Density check
                let seed = bar * partsPerBar + part;
                seed = (seed * 9301 + 49297) % 233280;
                if (seed / 233280 > density) {
                    continue;
                }

                let pitch = sequence[seqIdx % sequence.length];

                if (lockRoot && part % Config.partsPerBeat === 0) {
                    pitch = arpPitches[0];
                }

                if (bassSafe && pitch > 48) {
                    while (pitch > 48) pitch -= 12;
                }

                const note = new Note(pitch, part, part + speed, Config.noteSizeMax);
                group.append(new ChangeNoteAdded(this._doc, pattern, note, noteIdx));
                noteIdx++;
                seqIdx++;
            }
        }

        this._doc.prompt = null;
        this._doc.record(group, true);
    }
}
