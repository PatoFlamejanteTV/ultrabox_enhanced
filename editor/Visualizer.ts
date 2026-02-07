
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { SongDocument } from './SongDocument';

export class Visualizer {
    private _analyzer: AudioMotionAnalyzer | null = null;
    private _canvas: HTMLCanvasElement;
    private _audioCtx: AudioContext | null = null;
    private _source: AudioNode | null = null;

    constructor(private _doc: SongDocument, canvas: HTMLCanvasElement) {
        this._canvas = canvas;
    }

    public setVisible(visible: boolean, audioCtx: AudioContext | null, source: AudioNode | null): void {
        if (visible) {
            if (audioCtx && source && (!this._analyzer || this._audioCtx !== audioCtx || this._source !== source)) {
                if (this._analyzer) this._analyzer.destroy();
                this._audioCtx = audioCtx;
                this._source = source;
                this._analyzer = new AudioMotionAnalyzer(undefined, {
                    canvas: this._canvas,
                    audioCtx: audioCtx,
                    source: source,
                    fftSize: 1024,
                    smoothing: 0.7,
                    showScaleX: false,
                    showScaleY: false,
                    showPeaks: false,
                    showFPS: false,
                    mode: this._doc.prefs.visualizerMode,
                    maxFPS: 30,
                    barSpace: 0,
                    gradient: 'classic',
                });
            }
        } else {
            if (this._analyzer) {
                this._analyzer.destroy();
                this._analyzer = null;
            }
            this._audioCtx = null;
            this._source = null;
        }
    }

    public setMode(mode: number): void {
        if (this._analyzer) {
            this._analyzer.mode = mode;
        }
    }
}
