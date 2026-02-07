## 2026-02-07 - [FFT Bit-Reversal Caching]
**Learning:** FFT bit-reversal calculation is a significant portion of small/real-only FFTs. Caching swap pairs for common power-of-two lengths avoids redundant bit-fiddling.
**Action:** Always consider memoization for deterministic algorithms that operate on a limited set of input sizes in performance-critical paths.

## 2026-02-07 - [Baseline Benchmarking]
**Benchmark:** 10s song, 4 channels (FM, Chip, Harmonics mix), Reverb/Chorus enabled.
**Result:** 53.56x real-time (186.71ms).

## 2026-02-07 - [Limiter Optimization]
**Optimization:** Replaced branchless limiter logic with if-else and precomputed constants in `Synth.synthesize`.
**Result:** 60.53x real-time (165.22ms). ~13% improvement.

## 2026-02-07 - [Filter Optimization]
**Optimization:** Added fast-paths for `applyFilters` when deltas are zero and added skip-logic in synth loops when no filters are active.
**Result:** 126.63x real-time (78.97ms) in warmed-up Node environment.

## 2026-02-07 - [Inner-Loop & BitField Optimization]
**Optimization:** Refactored `BitField` to use `Uint8Array`, optimized `distortion` and `PWM` loops to avoid `Math.abs` and redundant divisions.
**Result:** Stable at ~125x-130x real-time.
