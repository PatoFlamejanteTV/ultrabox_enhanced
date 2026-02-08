import { scaleElementsByFactor, fastFourierTransform, forwardRealFourierTransform } from '../../synth/FFT';

describe('FFT', () => {
  describe('scaleElementsByFactor', () => {
    it('should scale elements by factor', () => {
      const arr = [1, 2, 3, 4];
      scaleElementsByFactor(arr, 2);
      expect(arr).toEqual([2, 4, 6, 8]);
    });
  });

  describe('fastFourierTransform', () => {
    it('should throw error for non-power-of-2 length', () => {
      const real = [1, 2, 3];
      const imag = [0, 0, 0];
      expect(() => fastFourierTransform(real, imag)).toThrow("FFT array length must be a power of 2.");
    });

    it('should throw error for short length', () => {
      const real = [1, 2];
      const imag = [0, 0];
      expect(() => fastFourierTransform(real, imag)).toThrow("FFT array length must be at least 4.");
    });

    it('should compute FFT correctly for a simple case', () => {
      const real = new Float32Array([1, 0, -1, 0]);
      const imag = new Float32Array([0, 0, 0, 0]);
      fastFourierTransform(real, imag);
      // For input [1, 0, -1, 0], the DFT is [0, 2, 0, 2].
      expect(real[0]).toBeCloseTo(0); // DC component: sum(x)
      expect(imag[0]).toBeCloseTo(0);
      expect(real[1]).toBeCloseTo(2); // real part of X[1]
      expect(imag[1]).toBeCloseTo(0); // imag part of X[1]
      expect(real[2]).toBeCloseTo(0); // Nyquist: sum(x * (-1)^n)
      expect(imag[2]).toBeCloseTo(0);
      expect(real[3]).toBeCloseTo(2); // real part of X[3]
      expect(imag[3]).toBeCloseTo(0); // imag part of X[3]
    });
  });

  describe('forwardRealFourierTransform', () => {
     it('should compute forward real FFT', () => {
        const arr = new Float32Array([1, 0, -1, 0]);
        forwardRealFourierTransform(arr);
        expect(arr.length).toBe(4);
     });
  });
});
