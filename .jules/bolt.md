## 2026-02-07 - [FFT Bit-Reversal Caching]
**Learning:** FFT bit-reversal calculation is a significant portion of small/real-only FFTs. Caching swap pairs for common power-of-two lengths avoids redundant bit-fiddling.
**Action:** Always consider memoization for deterministic algorithms that operate on a limited set of input sizes in performance-critical paths.
