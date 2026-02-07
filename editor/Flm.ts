// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export const enum FlmChunkType {
	header = 0x464C4D20, // "FLM "
	track = 0x54524B20,  // "TRK "
}

export const flmInstrumentMap: { [flmInstrument: string]: string } = {
	"sawer": "sawtooth lead 1",
	"supersaw": "supersaw lead",
	"harmless": "FM organ",
	"minisynth": "square lead",
	"transistor bass": "FM bass",
	"fpc": "standard drumset",
	"fpc kit": "standard drumset",
	"directwave": "grand piano 1",
	"drum": "standard drumset",
	"drums": "standard drumset",
	"kit": "standard drumset",
};
