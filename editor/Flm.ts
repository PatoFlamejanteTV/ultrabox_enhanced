// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export const enum FlmChunkType {
	header = 0x464C4D20, // "FLM "
	track = 0x54524B20,  // "TRK "
}

export const flmInstrumentMap: { [flmInstrument: string]: string } = {
	"Sawer": "sawtooth lead 1",
	"SuperSaw": "supersaw lead",
	"Harmless": "FM organ",
	"MiniSynth": "square lead",
	"Transistor Bass": "FM bass",
	"FPC": "standard drumset",
	"FPC Kit": "standard drumset",
	"DirectWave": "grand piano 1",
	"Drum": "standard drumset",
	"Drums": "standard drumset",
	"Kit": "standard drumset",
};
