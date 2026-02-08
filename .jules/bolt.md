## 2026-02-07 - [FFT Bit-Reversal Caching]
**Learning:** FFT bit-reversal calculation is a significant portion of small/real-only FFTs. Caching swap pairs for common power-of-two lengths avoids redundant bit-fiddling.
**Action:** Always consider memoization for deterministic algorithms that operate on a limited set of input sizes in performance-critical paths.

## 2026-02-07 - [Synthesis Loop Filter-Skip Optimization]
**Learning:** The `applyFilters` function is called for every sample in the synthesis loops, even when no filters are active (filterCount == 0). While recent changes added an `if` check inside the loop, moving it *outside* the loop and duplicating the loop (creating a "fast path") provides even better performance by removing the conditional branch from the high-frequency inner loop.
**Action:** Implemented "fast path" synthesis loops that check `filterCount == 0` outside the loop. This avoids thousands of conditional checks per tick for unfiltered instruments. Applied to Chip, Noise, Harmonics, PulseWidth, Supersaw, Spectrum, Drumset, and FM synthesis.
**Impact:** Maximal reduction in CPU usage for instruments not using note-level filters.
