
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";

const { button, div, h2, select, option } = HTML;

export class VisualizerModePrompt implements Prompt {
	private readonly _modeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: 0 }, "0: Discrete frequencies"),
		option({ value: 1 }, "1: 1/24th octave bands"),
		option({ value: 2 }, "2: 1/12th octave bands"),
		option({ value: 3 }, "3: 1/8th octave bands"),
		option({ value: 4 }, "4: 1/6th octave bands"),
		option({ value: 5 }, "5: 1/4th octave bands"),
		option({ value: 6 }, "6: 1/3rd octave bands"),
		option({ value: 7 }, "7: 1/2nd octave bands"),
		option({ value: 8 }, "8: 1 octave bands"),
		option({ value: 10 }, "10: Pulse"),
	);
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, "Okay");
    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 250px;" },
		h2("Visualizer Mode"),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ class: "selectContainer", style: "width: 100%;" }, this._modeSelect),
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		this._modeSelect.value = String(this._doc.prefs.visualizerMode);
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
	}

	private _close = (): void => {
		this._doc.undo();
	}

	public cleanUp = (): void => {
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
		this._doc.prefs.visualizerMode = parseInt(this._modeSelect.value);
		this._doc.prefs.save();
		this._doc.prompt = null;
		this._doc.undo();
	}
}
