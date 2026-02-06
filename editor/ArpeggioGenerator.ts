// Copyright (C) 2024 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

import { Config } from "../synth/SynthConfig";
import { SongDocument } from "./SongDocument";
import { ChangeGroup } from "./Change";
import { ChangeEnsurePatternExists, ChangePatternNumbers, ChangeNoteAdded, ChangeNoteTruncate } from "./changes";
import { Note } from "../synth/synth";

export interface ArpeggioParams {
    style: string;
    speed: number;
    range: number;
    mode: string;
    density: number;
    followChords: boolean;
    lockRoot: boolean;
    bassSafe: boolean;
    barAmount: number;
}

export class ArpeggioGenerator {
    public static generate(params: ArpeggioParams, doc: SongDocument): ChangeGroup {
        const group: ChangeGroup = new ChangeGroup();
        const startBar = doc.selection.boxSelectionActive ? doc.selection.boxSelectionBar : doc.bar;
        const channelIndex = doc.channel;
        const beatsPerBar = doc.song.beatsPerBar;
        const partsPerBar = Config.partsPerBeat * beatsPerBar;

        let basePitches: number[] = [];
        if (params.mode === "note") {
            const pattern = doc.song.getPattern(channelIndex, startBar);
            if (pattern && pattern.notes.length > 0) {
                basePitches = [pattern.notes[0].pitches[0]];
            } else {
                basePitches = [Config.keys[doc.song.key].basePitch];
            }
        } else if (params.mode === "scale") {
            const scaleFlags = Config.scales[doc.song.scale].flags;
            const rootPitch = Config.keys[doc.song.key].basePitch;
            for (let i = 0; i < scaleFlags.length; i++) {
                if (scaleFlags[i]) basePitches.push(rootPitch + i);
            }
        }

        for (let b = 0; b < params.barAmount; b++) {
            const bar = startBar + b;
            if (bar >= doc.song.barCount) break;

            if (params.mode === "chord" || (params.followChords && (params.mode === "note" || params.mode === "chord"))) {
                const pattern = doc.song.getPattern(channelIndex, bar);
                if (pattern && pattern.notes.length > 0) {
                    const uniquePitches = new Set<number>();
                    for (const note of pattern.notes) {
                        for (const p of note.pitches) uniquePitches.add(p);
                    }
                    basePitches = Array.from(uniquePitches).sort((a, b) => a - b);
                } else if (!params.followChords && basePitches.length === 0) {
                    basePitches = [Config.keys[doc.song.key].basePitch];
                }
            }

            if (basePitches.length === 0) continue;

            let arpPitches = [...basePitches];
            if (params.range === 2) {
                arpPitches = arpPitches.concat(basePitches.map(p => p + 12));
            }
            arpPitches.sort((a, b) => a - b);

            let sequence: number[] = [];
            if (params.style === "up") sequence = arpPitches;
            else if (params.style === "down") sequence = [...arpPitches].reverse();
            else if (params.style === "upDown") sequence = arpPitches.concat([...arpPitches].reverse().slice(1, -1));
            else if (params.style === "random") {
                sequence = [...arpPitches];
                // Deterministic shuffle for this bar
                let seed = bar;
                for (let i = sequence.length - 1; i > 0; i--) {
                    seed = (seed * 9301 + 49297) % 233280;
                    const j = Math.floor((seed / 233280) * (i + 1));
                    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
                }
            } else if (params.style === "chiptune") {
                sequence = arpPitches.slice(0, 3);
            }

            group.append(new ChangePatternNumbers(doc, 0, bar, channelIndex, 1, 1));
            group.append(new ChangeEnsurePatternExists(doc, channelIndex, bar));
            const pattern = doc.song.getPattern(channelIndex, bar);
            if (pattern == null) continue;
            group.append(new ChangeNoteTruncate(doc, pattern, 0, partsPerBar));

            let seqIdx = 0;
            let noteIdx = 0;
            for (let part = 0; part < partsPerBar; part += params.speed) {
                // Density check
                let seed = bar * partsPerBar + part;
                seed = (seed * 9301 + 49297) % 233280;
                if (seed / 233280 > params.density) {
                    continue;
                }

                let pitch = sequence[seqIdx % sequence.length];

                if (params.lockRoot && part % Config.partsPerBeat === 0) {
                    // Deterministic random selection of a base pitch for the beat.
                    let rootSeed = bar * partsPerBar + part;
                    rootSeed = (rootSeed * 9301 + 49297) % 233280;
                    const basePitchIndex = Math.floor((rootSeed / 233280) * basePitches.length);
                    pitch = basePitches[basePitchIndex];
                }

                if (params.bassSafe && pitch > 47) {
                    pitch = pitch % 12 + 36;
                }

                const note = new Note(pitch, part, part + params.speed, Config.noteSizeMax);
                group.append(new ChangeNoteAdded(doc, pattern, note, noteIdx));
                noteIdx++;
                seqIdx++;
            }
        }
        return group;
    }
}
