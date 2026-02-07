// Copyright (C) 2024 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

import { Config } from "../synth/SynthConfig";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Prompt } from "./Prompt";
import { ColorConfig } from "./ColorConfig";
import { ChangeGroup } from "./Change";
import { ChangeEnsurePatternExists, ChangePatternNumbers, ChangeNoteAdded, ChangeInsertBars } from "./changes";
import { Note } from "../synth/synth";
import { RhythmicGenerator, RhythmStep, RhythmMode, RhythmComplexity, RhythmStyle } from "./RhythmicGenerator";

const { button, div, h2, input, select, option, span } = HTML;

interface Sequence {
	mode: RhythmMode;
	steps: number;
	density: number;
	rotation: number;
	complexity: RhythmComplexity;
	style: RhythmStyle;
	seed: number;
	stepSizeNumerator: number;
	stepSizeDenominator: number;
	channel: number;
	pitch: number;
	invert: boolean;
	generateFadingNotes: boolean;
}




export class AlgorithmicRhythmPrompt implements Prompt {
	private readonly _minSteps: number = 2;
	private readonly _maxSteps: number = 64;
	private readonly _maxSequences: number = 14;
	private _maxChannel: number = Config.pitchChannelCountMax + Config.noiseChannelCountMax - 1;

	private readonly _localStorageKey: string = "algorithmicRhythmMemory";

	private readonly _sequences: Sequence[];
	private _generatedSequences: RhythmStep[][];
	private _sequenceIndex: number = 0;

	private _startBar: number = 0;
	private _barAmount: number = 1;
	private _barsAvailable: number = Config.barCountMax;

	private _barPreviewBarIndex: number = 0;
	private readonly _barPreviewWidth: number = 400;
	private readonly _barPreviewHeight: number = 20;

	private readonly _clockWidth: number = 120;
	private readonly _clockHeight: number = 120;
	private readonly _clockPointMinRadius: number = 2;
	private readonly _clockPointMaxRadius: number = 6;
	private readonly _clockPadding: number = 4;
	private readonly _clockRadius: number = this._clockWidth / 2 - this._clockPointMaxRadius - this._clockPadding;

	private readonly _sequenceButtons: HTMLButtonElement[] = [];
	private readonly _sequenceRemoveButton: HTMLButtonElement = button({ class: "no-underline", style: "flex-grow: 0; flex-basis: 30px;" },
		SVG.svg({ width: "26", height: "26", viewBox: "-13 -13 26 26", "pointer-events": "none" },
			SVG.path({ d: "M -7.07 -5.66 L -5.66 -7.07 L 0 -1.4 L 5.66 -7.07 L 7.07 -5.66 L 1.4 0 L 7.07 5.66 L 5.66 7.07 L 0 1.4 L -5.66 7.07 L -7.07 5.66 L -1.4 0 z", fill: ColorConfig.primaryText })
		)
	);
	private readonly _sequenceAddButton: HTMLButtonElement = button({ class: "no-underline last-button", style: "flex-grow: 0; flex-basis: 30px;" },
		SVG.svg({ width: "26", height: "26", viewBox: "-13 -13 26 26", "pointer-events": "none" },
			SVG.path({ d: "M -8 -1 L -1 -1 L -1 -8 L 1 -8 L 1 -1 L 8 -1 L 8 1 L 1 1 L 1 8 L -1 8 L -1 1 L -8 1 z", fill: ColorConfig.primaryText })
		)
	);
	private readonly _sequenceButtonContainer: HTMLDivElement = div({ class: "instrument-bar", style: "justify-content: center; width: 100%;" },
		this._sequenceRemoveButton,
		this._sequenceAddButton
	);

	private readonly _barPreviewBackground: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _barPreviewSteps: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _barPreviewLabel: HTMLDivElement = div({ style: `flex-grow: 1; color: ${ColorConfig.secondaryText}; text-align: center;` });

	private readonly _clockWire: SVGCircleElement = SVG.circle({ cx: this._clockWidth / 2, cy: this._clockHeight / 2, r: this._clockRadius, stroke: ColorConfig.primaryText, "stroke-width": "0.5", fill: "none" });
	private readonly _clockPoints: SVGSVGElement = SVG.svg({ "pointer-events": "none" });

	private readonly _modeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: RhythmMode.Euclidean }, "Euclidean"),
		option({ value: RhythmMode.Clusters }, "Clusters"),
		option({ value: RhythmMode.BalancedBinary }, "Balanced Binary"),
		option({ value: RhythmMode.Accents }, "Accents"),
		option({ value: RhythmMode.Polyrhythmic }, "Polyrhythmic"),
		option({ value: RhythmMode.Subdivision }, "Subdivision"),
		option({ value: RhythmMode.Mirrored }, "Mirrored"),
		option({ value: RhythmMode.Probabilistic }, "Probabilistic"),
		option({ value: RhythmMode.QuestionAndAnswer }, "Question & Answer"),
		option({ value: RhythmMode.VisualShape }, "Visual Shape"),
	);

	private readonly _densitySlider: HTMLInputElement = input({ style: "width: 100%;", type: "range", min: "0", max: "1", step: "0.01", value: "0.5" });
	private readonly _stepsStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: this._minSteps, max: this._maxSteps, value: "8", step: "1" });
	private readonly _rotationStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "0", max: this._maxSteps, value: "0", step: "1" });

	private readonly _complexitySelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: RhythmComplexity.Suave }, "Suave"),
		option({ value: RhythmComplexity.Notable }, "Notable"),
		option({ value: RhythmComplexity.Bold }, "Bold"),
	);

	private readonly _styleSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: RhythmStyle.Regular }, "Regular"),
		option({ value: RhythmStyle.Saltado }, "Saltado"),
		option({ value: RhythmStyle.Vivo }, "Vivo"),
	);

	private readonly _seedInput: HTMLInputElement = input({ style: "width: 4em;", type: "number", min: "0", value: "0", step: "1" });
	private readonly _regenerateButton: HTMLButtonElement = button({ style: "margin-left: 0.5em;" }, "Regenerate");

	private readonly _stepSizeNumeratorStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "1", max: Config.partsPerBeat, value: "1", step: "1" });
	private readonly _stepSizeDenominatorStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "1", max: Config.partsPerBeat, value: "4", step: "1" });
	private readonly _channelStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "1", max: this._maxChannel + 1, value: "1", step: "1" });
	private readonly _pitchStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "0", max: Config.maxPitch, value: "0", step: "1" });
	private readonly _barAmountStepper: HTMLInputElement = input({ style: "width: 3em;", type: "number", min: "1", max: Config.barCountMax, value: "1", step: "1" });

	private readonly _generateFadingNotesBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em;" });
	private readonly _invertBox: HTMLInputElement = input({ type: "checkbox", style: "width: 1em;" });

	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width: 45%;" }, "Okay");
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Algorithmic Rhythm Generator"),
		div({ style: "display: flex; flex-direction: row; align-items: center; margin-bottom: 0.5em;" },
			this._sequenceButtonContainer
		),
		div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 0.5em;" },
			button({ style: "width: 30px;", onclick: () => this._whenBarPreviewGoBackClicked() }, "<"),
			this._barPreviewLabel,
			button({ style: "width: 30px;", onclick: () => this._whenBarPreviewGoForwardClicked() }, ">"),
		),
		div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: center; margin-bottom: 1em;" },
			SVG.svg({ "pointer-events": "none", style: "touch-action: none; overflow: hidden; border: 1px solid "+ColorConfig.uiWidgetBackground, width: "100%", height: "24px", viewBox: `0 0 ${this._barPreviewWidth} ${this._barPreviewHeight}`, preserveAspectRatio: "none" },
				this._barPreviewBackground,
				this._barPreviewSteps
			),
		),
		div({ style: "display: flex; flex-direction: row; align-items: flex-start; justify-content: space-evenly;" },
			div({ style: "max-width: 150px; text-align: center;" },
				SVG.svg({ "pointer-events": "none", width: "120", height: "120", style: "touch-action: none; overflow: hidden; margin-bottom: 0.5em;", viewBox: `0 0 ${this._clockWidth} ${this._clockHeight}` },
					this._clockWire,
					this._clockPoints
				),
				div({ style: "display: flex; align-items: center; justify-content: center;" },
					span({ style: "color: " + ColorConfig.primaryText + "; margin-right: 0.5em;" }, "Seed"),
					this._seedInput,
					this._regenerateButton
				)
			),
			div({ style: "flex-grow: 1; margin-left: 1em; display: flex; flex-direction: column; gap: 0.4em;" },
				div({ style: "display: flex; align-items: center;" },
					div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Mode"),
					div({ class: "selectContainer", style: "flex-grow: 1;" }, this._modeSelect)
				),
				div({ style: "display: flex; align-items: center;" },
					div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Density"),
					this._densitySlider
				),
				div({ style: "display: flex; align-items: center; justify-content: space-between;" },
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Steps"),
						this._stepsStepper
					),
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Rotation"),
						this._rotationStepper
					)
				),
				div({ style: "display: flex; align-items: center;" },
					div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Complexity"),
					div({ class: "selectContainer", style: "flex-grow: 1;" }, this._complexitySelect)
				),
				div({ style: "display: flex; align-items: center;" },
					div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Style"),
					div({ class: "selectContainer", style: "flex-grow: 1;" }, this._styleSelect)
				),
				div({ style: "display: flex; align-items: center; justify-content: space-between;" },
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Channel"),
						this._channelStepper
					),
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Pitch"),
						this._pitchStepper
					)
				),
				div({ style: "display: flex; align-items: center; justify-content: space-between;" },
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Size"),
						this._stepSizeNumeratorStepper,
						span({ style: "margin: 0 0.2em; color: " + ColorConfig.primaryText }, "/"),
						this._stepSizeDenominatorStepper
					),
					div({ style: "display: flex; align-items: center;" },
						div({ style: `width: 6em; text-align: right; color: ${ColorConfig.primaryText}; margin-right: 1em;` }, "Bars"),
						this._barAmountStepper
					)
				),
				div({ style: "display: flex; align-items: center; justify-content: flex-end; gap: 1em;" },
					div({ style: "display: flex; align-items: center;" },
						span({ style: "color: " + ColorConfig.primaryText + "; margin-right: 0.5em;" }, "Fading"),
						this._generateFadingNotesBox
					),
					div({ style: "display: flex; align-items: center;" },
						span({ style: "color: " + ColorConfig.primaryText + "; margin-right: 0.5em;" }, "Invert"),
						this._invertBox
					)
				)
			)
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between; margin-top: 1em;" },
			this._okayButton
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._startBar = this._doc.bar;
		this._barPreviewBarIndex = this._startBar;
		this._barsAvailable = Config.barCountMax - this._startBar;
		this._barAmountStepper.max = this._barsAvailable + "";
		this._maxChannel = this._doc.song.pitchChannelCount + this._doc.song.noiseChannelCount - 1;
		this._channelStepper.max = (this._maxChannel + 1) + "";

		const defaultSteps: number = Math.max(this._minSteps, Math.min(this._maxSteps, this._doc.song.beatsPerBar * 4));

		this._sequences = [{
			mode: RhythmMode.Euclidean,
			steps: defaultSteps,
			density: 0.5,
			rotation: 0,
			complexity: RhythmComplexity.Suave,
			style: RhythmStyle.Regular,
			seed: Math.floor(Math.random() * 1000),
			stepSizeNumerator: 1,
			stepSizeDenominator: 4,
			channel: Math.max(0, Math.min(this._maxChannel, this._doc.channel)),
			pitch: 0,
			invert: false,
			generateFadingNotes: false,
		}];

		let savedData: any = null;
		try {
			savedData = JSON.parse(String(window.localStorage.getItem(this._localStorageKey)));
		} catch (error) {
			console.error("Failed to parse saved algorithmic rhythm data:", error);
		}

		if (savedData != null && Array.isArray(savedData.sequences)) {
			this._sequences = savedData.sequences.map((s: any) => ({
				mode: s.mode ?? RhythmMode.Euclidean,
				steps: Math.max(this._minSteps, Math.min(this._maxSteps, s.steps ?? this._minSteps)),
				density: Math.min(1, Math.max(0, s.density ?? 0.5)),
				rotation: Math.max(0, s.rotation ?? 0),
				complexity: s.complexity ?? RhythmComplexity.Suave,
				style: s.style ?? RhythmStyle.Regular,
				seed: s.seed ?? Math.floor(Math.random() * 1000),
				stepSizeNumerator: Math.max(1, Math.min(Config.partsPerBeat, s.stepSizeNumerator ?? 1)),
				stepSizeDenominator: Math.max(1, Math.min(Config.partsPerBeat, s.stepSizeDenominator ?? 4)),
				channel: Math.max(0, Math.min(this._maxChannel, s.channel ?? 0)),
				pitch: Math.max(0, Math.min(Config.maxPitch, s.pitch ?? 0)),
				invert: !!s.invert,
				generateFadingNotes: !!s.generateFadingNotes,
			}));
			this._barAmount = Math.max(1, Math.min(this._barsAvailable, Number.isFinite(savedData.barAmount) ? savedData.barAmount : 1));
		}

		this._generateAllSequences();

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		this._sequenceButtonContainer.addEventListener("click", this._whenSelectSequence);

		this._modeSelect.addEventListener("change", this._whenModeChanges);
		this._densitySlider.addEventListener("input", this._whenDensityChanges);
		this._stepsStepper.addEventListener("change", this._whenStepsChanges);
		this._rotationStepper.addEventListener("change", this._whenRotationChanges);
		this._complexitySelect.addEventListener("change", this._whenComplexityChanges);
		this._styleSelect.addEventListener("change", this._whenStyleChanges);
		this._seedInput.addEventListener("change", this._whenSeedChanges);
		this._regenerateButton.addEventListener("click", this._whenRegenerateClicked);
		this._channelStepper.addEventListener("change", this._whenChannelChanges);
		this._pitchStepper.addEventListener("change", this._whenPitchChanges);
		this._stepSizeNumeratorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.addEventListener("change", this._whenStepSizeChanges);
		this._barAmountStepper.addEventListener("change", this._whenBarAmountChanges);
		this._invertBox.addEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.addEventListener("change", this._whenGenerateFadingNotesChanges);

		this._initialRender();
		this._render();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
		this._sequenceButtonContainer.removeEventListener("click", this._whenSelectSequence);
		this._modeSelect.removeEventListener("change", this._whenModeChanges);
		this._densitySlider.removeEventListener("input", this._whenDensityChanges);
		this._stepsStepper.removeEventListener("change", this._whenStepsChanges);
		this._rotationStepper.removeEventListener("change", this._whenRotationChanges);
		this._complexitySelect.removeEventListener("change", this._whenComplexityChanges);
		this._styleSelect.removeEventListener("change", this._whenStyleChanges);
		this._seedInput.removeEventListener("change", this._whenSeedChanges);
		this._regenerateButton.removeEventListener("click", this._whenRegenerateClicked);
		this._channelStepper.removeEventListener("change", this._whenChannelChanges);
		this._pitchStepper.removeEventListener("change", this._whenPitchChanges);
		this._stepSizeNumeratorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._stepSizeDenominatorStepper.removeEventListener("change", this._whenStepSizeChanges);
		this._barAmountStepper.removeEventListener("change", this._whenBarAmountChanges);
		this._invertBox.removeEventListener("change", this._whenInvertChanges);
		this._generateFadingNotesBox.removeEventListener("change", this._whenGenerateFadingNotesChanges);
	}

	private _close = (): void => {
		this._doc.undo();
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		const group: ChangeGroup = new ChangeGroup();
		const beatsPerBar: number = this._doc.song.beatsPerBar;
		const partsPerBeat: number = Config.partsPerBeat;
		const partsPerBar: number = partsPerBeat * beatsPerBar;
		const firstBar: number = this._startBar;
		const lastBar: number = firstBar + this._barAmount;

		if (lastBar > this._doc.song.barCount) {
			group.append(new ChangeInsertBars(this._doc, this._doc.song.barCount, lastBar - this._doc.song.barCount));
		}

		let allNewNotesByChannel: Map<number, Note[][]> = new Map();

		for (let bar = firstBar; bar < lastBar; bar++) {
			const relativeBar = bar - firstBar;
			const partOffset = relativeBar * partsPerBar;

			for (let sequenceIndex = 0; sequenceIndex < this._sequences.length; sequenceIndex++) {
				const sequence = this._sequences[sequenceIndex];
				const generatedSequence = this._generatedSequences[sequenceIndex];
				if (generatedSequence.length === 0) continue;

				const stepSize = sequence.stepSizeNumerator / Math.max(1, sequence.stepSizeDenominator);
				const pitch = sequence.pitch;
				const channelIndex = sequence.channel;
				const invert = sequence.invert;
				const generateFadingNotes = sequence.generateFadingNotes;

				if (!allNewNotesByChannel.has(channelIndex)) {
					const channelNotes: Note[][] = [];
					for (let i = 0; i < this._barAmount; i++) channelNotes.push([]);
					allNewNotesByChannel.set(channelIndex, channelNotes);
				}
				const resultingBar = allNewNotesByChannel.get(channelIndex)![relativeBar];

				const firstStep = Math.floor((beatsPerBar * relativeBar) / stepSize);
				const lastStep = Math.ceil((beatsPerBar * (relativeBar + 1)) / stepSize);

				for (let step = firstStep; step < lastStep; step++) {
					const genStep = generatedSequence[step % sequence.steps];
					let isActive = genStep.active;
					if (invert) isActive = !isActive;

					if (isActive) {
						const rawStepPartStart = Math.floor(step * partsPerBeat * stepSize) - partOffset;
						const rawStepPartEnd = Math.floor((step + 1) * partsPerBeat * stepSize) - partOffset;
						const stepPartStart = Math.max(0, Math.min(partsPerBar, rawStepPartStart));
						const stepPartEnd = Math.max(0, Math.min(partsPerBar, rawStepPartEnd));

						if (stepPartStart < stepPartEnd) {
							const size = genStep.accent ? Config.noteSizeMax : Math.round(Config.noteSizeMax * 0.75);
							const note = new Note(pitch, stepPartStart, stepPartEnd, size, generateFadingNotes);
							if (rawStepPartStart < 0) note.continuesLastPattern = true;
							resultingBar.push(note);
						}
					}
				}
			}
		}

		for (const [channelIndex, resultingChannel] of allNewNotesByChannel.entries()) {
			for (let resultingBarIndex = 0; resultingBarIndex < resultingChannel.length; resultingBarIndex++) {
				const bar = resultingBarIndex + firstBar;
				const patternNotes = resultingChannel[resultingBarIndex];

				group.append(new ChangePatternNumbers(this._doc, 0, bar, channelIndex, 1, 1));
				group.append(new ChangeEnsurePatternExists(this._doc, channelIndex, bar));
				const pattern = this._doc.song.getPattern(channelIndex, bar);
				if (pattern) {
					pattern.notes = [];
					patternNotes.forEach((note, idx) => {
						group.append(new ChangeNoteAdded(this._doc, pattern, note, idx));
					});
				}
			}
		}

		this._doc.record(group, true);
		window.localStorage.setItem(this._localStorageKey, JSON.stringify({
			sequences: this._sequences,
			barAmount: this._barAmount,
		}));
	}

	private _generateAllSequences = (): void => {
		this._generatedSequences = [];
		for (let i = 0; i < this._sequences.length; i++) {
			this._generateSequence(i);
		}
	}

	private _generateSequence = (index: number): void => {
		const s = this._sequences[index];
		this._generatedSequences[index] = RhythmicGenerator.generate(
			s.mode, s.steps, s.density, s.rotation, s.complexity, s.style, s.seed
		);
	}

	private _generateCurrentSequence = (): void => {
		this._generateSequence(this._sequenceIndex);
	}

	private _whenModeChanges = (): void => {
		this._sequences[this._sequenceIndex].mode = this._modeSelect.value as RhythmMode;
		this._generateCurrentSequence();
		this._render();
	}

	private _whenDensityChanges = (): void => {
		this._sequences[this._sequenceIndex].density = parseFloat(this._densitySlider.value);
		this._generateCurrentSequence();
		this._render();
	}

	private _whenStepsChanges = (): void => {
		const value = parseInt(this._stepsStepper.value);
		this._sequences[this._sequenceIndex].steps = Math.max(this._minSteps, Math.min(this._maxSteps, isNaN(value) ? this._minSteps : value));
		this._stepsStepper.value = this._sequences[this._sequenceIndex].steps + "";
		this._generateCurrentSequence();
		this._render();
	}

	private _whenRotationChanges = (): void => {
		const value = parseInt(this._rotationStepper.value);
		this._sequences[this._sequenceIndex].rotation = isNaN(value) ? 0 : Math.max(0, value);
		this._rotationStepper.value = this._sequences[this._sequenceIndex].rotation + "";
		this._generateCurrentSequence();
		this._render();
	}

	private _whenComplexityChanges = (): void => {
		this._sequences[this._sequenceIndex].complexity = parseInt(this._complexitySelect.value) as RhythmComplexity;
		this._generateCurrentSequence();
		this._render();
	}

	private _whenStyleChanges = (): void => {
		this._sequences[this._sequenceIndex].style = parseInt(this._styleSelect.value) as RhythmStyle;
		this._generateCurrentSequence();
		this._render();
	}

	private _whenSeedChanges = (): void => {
		const value = parseInt(this._seedInput.value);
		this._sequences[this._sequenceIndex].seed = isNaN(value) ? 0 : Math.max(0, value);
		this._seedInput.value = this._sequences[this._sequenceIndex].seed + "";
		this._generateCurrentSequence();
		this._render();
	}

	private _whenRegenerateClicked = (): void => {
		this._sequences[this._sequenceIndex].seed = Math.floor(Math.random() * 1000);
		this._seedInput.value = this._sequences[this._sequenceIndex].seed + "";
		this._generateCurrentSequence();
		this._render();
	}

	private _whenChannelChanges = (): void => {
		const value = parseInt(this._channelStepper.value);
		this._sequences[this._sequenceIndex].channel = Math.max(0, Math.min(this._maxChannel, (isNaN(value) ? 1 : value) - 1));
		this._channelStepper.value = (this._sequences[this._sequenceIndex].channel + 1) + "";
		this._render();
	}

	private _whenPitchChanges = (): void => {
		const value = parseInt(this._pitchStepper.value);
		this._sequences[this._sequenceIndex].pitch = Math.max(0, Math.min(Config.maxPitch, isNaN(value) ? 0 : value));
		this._pitchStepper.value = this._sequences[this._sequenceIndex].pitch + "";
		this._render();
	}

	private _whenStepSizeChanges = (): void => {
		const num = parseInt(this._stepSizeNumeratorStepper.value);
		const den = parseInt(this._stepSizeDenominatorStepper.value);
		this._sequences[this._sequenceIndex].stepSizeNumerator = Math.max(1, Math.min(Config.partsPerBeat, isNaN(num) ? 1 : num));
		this._sequences[this._sequenceIndex].stepSizeDenominator = Math.max(1, Math.min(Config.partsPerBeat, isNaN(den) ? 1 : den));
		this._stepSizeNumeratorStepper.value = this._sequences[this._sequenceIndex].stepSizeNumerator + "";
		this._stepSizeDenominatorStepper.value = this._sequences[this._sequenceIndex].stepSizeDenominator + "";
		this._render();
	}

	private _whenBarAmountChanges = (): void => {
		this._barAmount = parseInt(this._barAmountStepper.value);
		this._render();
	}

	private _whenInvertChanges = (): void => {
		this._sequences[this._sequenceIndex].invert = this._invertBox.checked;
		this._render();
	}

	private _whenGenerateFadingNotesChanges = (): void => {
		this._sequences[this._sequenceIndex].generateFadingNotes = this._generateFadingNotesBox.checked;
		this._render();
	}

	private _whenBarPreviewGoBackClicked = (): void => {
		this._barPreviewBarIndex = ((this._barPreviewBarIndex - this._startBar - 1 + this._barAmount) % this._barAmount) + this._startBar;
		this._render();
	}

	private _whenBarPreviewGoForwardClicked = (): void => {
		this._barPreviewBarIndex = ((this._barPreviewBarIndex - this._startBar + 1) % this._barAmount) + this._startBar;
		this._render();
	}

	private _whenSelectSequence = (event: MouseEvent): void => {
		const btn = (event.target as HTMLElement).closest("button");
		if (btn == this._sequenceAddButton) {
			const s = this._sequences[this._sequenceIndex];
			this._sequences.push({ ...s, seed: Math.floor(Math.random() * 1000) });
			this._sequenceIndex = this._sequences.length - 1;
			this._generateCurrentSequence();
			this._refreshSequenceWidgets();
			this._render();
		} else if (btn == this._sequenceRemoveButton) {
			if (this._sequences.length > 1) {
				this._sequences.splice(this._sequenceIndex, 1);
				this._generatedSequences.splice(this._sequenceIndex, 1);
				this._sequenceIndex = Math.min(this._sequenceIndex, this._sequences.length - 1);
				this._refreshSequenceWidgets();
				this._render();
			}
		} else {
			const index = this._sequenceButtons.indexOf(btn as HTMLButtonElement);
			if (index !== -1) {
				this._sequenceIndex = index;
				this._refreshSequenceWidgets();
				this._render();
			}
		}
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((event.target as HTMLElement).tagName !== "BUTTON" && event.keyCode === 13) {
			this._saveChanges();
		}
	}

	private _initialRender = (): void => {
		const beatsPerBar = this._doc.song.beatsPerBar;
		const beatWidth = this._barPreviewWidth / beatsPerBar;
		for (let i = 0; i < beatsPerBar; i++) {
			this._barPreviewBackground.appendChild(SVG.rect({
				x: i * beatWidth + 1, y: 1, width: beatWidth - 2, height: this._barPreviewHeight - 2,
				style: `fill: ${ColorConfig.pitchBackground};`
			}));
		}
		this._refreshSequenceWidgets();
	}

	private _refreshSequenceWidgets = (): void => {
		const s = this._sequences[this._sequenceIndex];
		this._modeSelect.value = s.mode;
		this._densitySlider.value = s.density + "";
		this._stepsStepper.value = s.steps + "";
		this._rotationStepper.value = s.rotation + "";
		this._complexitySelect.value = s.complexity + "";
		this._styleSelect.value = s.style + "";
		this._seedInput.value = s.seed + "";
		this._channelStepper.value = (s.channel + 1) + "";
		this._pitchStepper.value = s.pitch + "";
		this._stepSizeNumeratorStepper.value = s.stepSizeNumerator + "";
		this._stepSizeDenominatorStepper.value = s.stepSizeDenominator + "";
		this._barAmountStepper.value = this._barAmount + "";
		this._invertBox.checked = s.invert;
		this._generateFadingNotesBox.checked = s.generateFadingNotes;
	}

	private _render = (): void => {
		this._renderClock();
		this._renderBarPreview();
		this._renderLabel();
		this._renderSequenceButtons();
	}

	private _renderSequenceButtons = (): void => {
		while (this._sequenceButtons.length < this._sequences.length) {
			const btn = button({ class: "no-underline" }, (this._sequenceButtons.length + 1) + "");
			this._sequenceButtons.push(btn);
			this._sequenceButtonContainer.insertBefore(btn, this._sequenceRemoveButton);
		}
		this._sequenceButtons.forEach((btn, i) => {
			btn.style.display = i < this._sequences.length ? "" : "none";
			btn.classList.toggle("selected-instrument", i === this._sequenceIndex);
			btn.style.color = i === this._sequenceIndex ? "" : ColorConfig.primaryText;
		});
		this._sequenceRemoveButton.style.display = this._sequences.length > 1 ? "" : "none";
		this._sequenceAddButton.style.display = this._sequences.length < this._maxSequences ? "" : "none";

		const colors = ColorConfig.getChannelColor(this._doc.song, this._sequences[this._sequenceIndex].channel);
		this._sequenceButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this._sequenceButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this._sequenceButtonContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
		this._sequenceButtonContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);
	}

	private _renderLabel = (): void => {
		const s = this._sequences[this._sequenceIndex];
		const pitchIndex = ((s.pitch + Config.keys[this._doc.song.key].basePitch) % 12 + 12) % 12;
		const pitchName = Config.keys[pitchIndex].name;
		this._barPreviewLabel.innerText = `Bar ${this._barPreviewBarIndex + 1}, Ch ${s.channel + 1}, Pitch ${pitchName}${Math.floor(s.pitch / 12)}`;
	}

	private _renderClock = (): void => {
		const s = this._sequences[this._sequenceIndex];
		const gen = this._generatedSequences[this._sequenceIndex];
		const color = ColorConfig.getChannelColor(this._doc.song, s.channel).primaryNote;

		this._clockWire.setAttribute("stroke", color);
		while (this._clockPoints.firstChild) this._clockPoints.removeChild(this._clockPoints.firstChild);

		const pointRadius = Math.max(this._clockPointMinRadius, Math.min(this._clockPointMaxRadius, this._clockWidth / s.steps / 2));
		for (let i = 0; i < s.steps; i++) {
			const angle = (i / s.steps) * Math.PI * 2 - Math.PI / 2;
			const x = this._clockWidth / 2 + Math.cos(angle) * this._clockRadius;
			const y = this._clockHeight / 2 + Math.sin(angle) * this._clockRadius;
			const step = gen[i % gen.length];
			const active = s.invert ? !step.active : step.active;

			this._clockPoints.appendChild(SVG.circle({
				cx: x, cy: y, r: pointRadius * (step.accent ? 1.5 : 1),
				style: `stroke: ${color}; fill: ${active ? color : ColorConfig.editorBackground}; stroke-width: ${step.accent ? 2 : 0.5}`
			}));
		}
	}

	private _renderBarPreview = (): void => {
		while (this._barPreviewSteps.firstChild) this._barPreviewSteps.removeChild(this._barPreviewSteps.firstChild);
		const s = this._sequences[this._sequenceIndex];
		const gen = this._generatedSequences[this._sequenceIndex];
		const beatsPerBar = this._doc.song.beatsPerBar;
		const partsPerBar = beatsPerBar * Config.partsPerBeat;
		const stepSize = s.stepSizeNumerator / s.stepSizeDenominator;
		const bar = this._barPreviewBarIndex - this._startBar;
		const partOffset = bar * partsPerBar;
		const color = ColorConfig.getChannelColor(this._doc.song, s.channel).primaryNote;
		const partWidth = this._barPreviewWidth / partsPerBar;

		const firstStep = Math.floor((beatsPerBar * bar) / stepSize);
		const lastStep = Math.ceil((beatsPerBar * (bar + 1)) / stepSize);

		for (let i = firstStep; i < lastStep; i++) {
			const step = gen[i % s.steps];
			let active = step.active;
			if (s.invert) active = !active;
			if (active) {
				const start = Math.max(0, Math.min(partsPerBar, Math.floor(i * Config.partsPerBeat * stepSize) - partOffset));
				const end = Math.max(0, Math.min(partsPerBar, Math.floor((i + 1) * Config.partsPerBeat * stepSize) - partOffset));
				if (start < end) {
					this._barPreviewSteps.appendChild(SVG.rect({
						x: start * partWidth, y: step.accent ? 2 : 5, width: (end - start) * partWidth, height: step.accent ? 16 : 10,
						style: `fill: ${color}; opacity: ${step.probability ?? 1};`
					}));
				}
			}
		}
	}
}
