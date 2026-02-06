// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { Config } from "../synth/SynthConfig";
import { Note, Song } from "../synth/synth";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { ChangeGroup } from "./Change";
import { ChangeNoteAdded } from "./changes";

const { button, div, h2, input, select, option, span } = HTML;

export class AdvancedChordPrompt implements Prompt {
	private readonly _chordTypeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: "triad" }, "Triad"),
		option({ value: "7th" }, "7th"),
		option({ value: "9th" }, "9th"),
		option({ value: "sus2" }, "Sus2"),
		option({ value: "sus4" }, "Sus4"),
		option({ value: "power" }, "Power Chord"),
		option({ value: "octave" }, "Octave"),
		option({ value: "thirds" }, "Added 3rds (Above & Below)"),
		option({ value: "fifths" }, "Added 5ths (Above & Below)"),
		option({ value: "both" }, "Added 3rds & 5ths"),
		option({ value: "custom" }, "Custom"),
	);
	private readonly _rootRoleSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: "0" }, "Old note is Root"),
		option({ value: "1" }, "Old note is 2nd"),
		option({ value: "2" }, "Old note is 3rd"),
		option({ value: "3" }, "Old note is 4th"),
		option({ value: "4" }, "Old note is 5th"),
		option({ value: "5" }, "Old note is 6th"),
		option({ value: "6" }, "Old note is 7th"),
	);
	private readonly _customOffsetsInput: HTMLInputElement = input({ style: "width: 100%;", type: "text", placeholder: "e.g. 0, 2, 4" });

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 300px;" },
		h2("Advanced Chord Creator"),
		div({ style: "display: flex; flex-direction: column; gap: 0.5em;" },
			div({ class: "selectRow" }, span({ style: "flex-grow: 1;" }, "Chord Type:"), div({ class: "selectContainer", style: "width: 60%;" }, this._chordTypeSelect)),
			div({ class: "selectRow" }, span({ style: "flex-grow: 1;" }, "Old Note Role:"), div({ class: "selectContainer", style: "width: 60%;" }, this._rootRoleSelect)),
			div({ id: "customOffsetsRow", style: "display: none; flex-direction: column; gap: 0.2em;" },
				span("Custom Offsets (scale steps, comma separated):"),
				this._customOffsetsInput
			),
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between; margin-top: 1.5em;" },
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._chordTypeSelect.addEventListener("change", this._updateVisibility);
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		this._updateVisibility();
	}

	private _updateVisibility = (): void => {
		const isCustom = this._chordTypeSelect.value === "custom";
		this.container.querySelector<HTMLElement>("#customOffsetsRow")!.style.display = isCustom ? "flex" : "none";
	}

	private _close = (): void => {
		this._doc.prompt = null;
	}

	public cleanUp = (): void => {
		this._chordTypeSelect.removeEventListener("change", this._updateVisibility);
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}

	private _saveChanges = (): void => {
		const group: ChangeGroup = new ChangeGroup();
		const song = this._doc.song;
		const selection = this._doc.selection;

		const scaleFlags = song.scale == Config.scales.dictionary["Custom"].index ? song.scaleCustom : Config.scales[song.scale].flags;
		let scaleLength = 0;
		for (const flag of scaleFlags) {
			if (flag) scaleLength++;
		}
		if (scaleLength === 0) scaleLength = 12;

		let offsets: number[] = [];
		switch (this._chordTypeSelect.value) {
			case "triad": offsets = [0, 2, 4]; break;
			case "7th": offsets = [0, 2, 4, 6]; break;
			case "9th": offsets = [0, 2, 4, 6, 8]; break;
			case "sus2": offsets = [0, 1, 4]; break;
			case "sus4": offsets = [0, 3, 4]; break;
			case "power": offsets = [0, 4]; break;
			case "octave": offsets = [0, scaleLength]; break;
			case "thirds": offsets = [-2, 0, 2]; break;
			case "fifths": offsets = [-4, 0, 4]; break;
			case "both": offsets = [-4, -2, 0, 2, 4]; break;
			case "custom":
				offsets = this._customOffsetsInput.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
				if (offsets.length === 0) offsets = [0];
				break;
		}

		const roleShift = parseInt(this._rootRoleSelect.value);
		const finalOffsets = offsets.map(o => o - roleShift);

		for (let channelIndex = selection.boxSelectionChannel; channelIndex < selection.boxSelectionChannel + selection.boxSelectionHeight; channelIndex++) {
			if (song.getChannelIsMod(channelIndex)) continue;

            const handledPatterns: { [index: number]: boolean } = {};

			for (let bar = selection.boxSelectionBar; bar < selection.boxSelectionBar + selection.boxSelectionWidth; bar++) {
				const patternIndex = song.channels[channelIndex].bars[bar];
                if (patternIndex == 0) continue;
                if (handledPatterns[patternIndex]) continue;
                handledPatterns[patternIndex] = true;

                const pattern = song.channels[channelIndex].patterns[patternIndex - 1];
                const oldNotes = pattern.notes;
                const newNotes: Note[] = [];

                for (const note of oldNotes) {
                    if (selection.patternSelectionActive && (note.end <= selection.patternSelectionStart || note.start >= selection.patternSelectionEnd)) {
                        newNotes.push(note.clone());
                        continue;
                    }

                    const newPitches = new Set<number>();
                    for (const oldPitch of note.pitches) {
                        for (const offset of finalOffsets) {
                            const newPitch = this._shiftPitchInScale(song, oldPitch, offset);
                            if (newPitch >= 0 && newPitch <= (song.getChannelIsNoise(channelIndex) ? Config.drumCount - 1 : Config.maxPitch)) {
                                newPitches.add(newPitch);
                            }
                        }
                    }

                    const newNote = note.clone();
                    newNote.pitches = Array.from(newPitches).sort((a, b) => a - b);
                    if (newNote.pitches.length > Config.maxChordSize) {
                        newNote.pitches.length = Config.maxChordSize;
                    }
                    if (newNote.pitches.length === 0) newNote.pitches = [note.pitches[0]]; // fallback
                    newNotes.push(newNote);
                }

                for (let i = pattern.notes.length - 1; i >= 0; i--) {
                    group.append(new ChangeNoteAdded(this._doc, pattern, pattern.notes[i], i, true));
                }
                for (let i = 0; i < newNotes.length; i++) {
                    group.append(new ChangeNoteAdded(this._doc, pattern, newNotes[i], i));
                }
			}
		}

		this._doc.prompt = null;
		this._doc.record(group, true);
	}

	private _shiftPitchInScale(song: Song, pitch: number, steps: number): number {
		if (steps === 0) return pitch;
		const scale = song.scale == Config.scales.dictionary["Custom"].index ? song.scaleCustom : Config.scales[song.scale].flags;
		let currentPitch = pitch;
		let remainingSteps = Math.abs(steps);
		let direction = Math.sign(steps);
		const maxPitch = Config.maxPitch;

		while (remainingSteps > 0) {
			currentPitch += direction;
			if (currentPitch < 0 || currentPitch > maxPitch) break;
			if (scale[(currentPitch % 12 + 12) % 12]) {
				remainingSteps--;
			}
		}
		return currentPitch;
	}
}
