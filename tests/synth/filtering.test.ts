import { FilterCoefficients, DynamicBiquadFilter } from '../../synth/filtering';

describe('filtering', () => {
  it('should create FilterCoefficients', () => {
    const coeff = new FilterCoefficients();
    expect(coeff).toBeDefined();
  });

  it('should compute lowPass1stOrderButterworth', () => {
    const coeff = new FilterCoefficients();
    coeff.lowPass1stOrderButterworth(0.1);
    expect(coeff.a[1]).toBeDefined();
    expect(coeff.b[0]).toBeDefined();
    expect(coeff.order).toBe(1);
  });

  it('should create DynamicBiquadFilter', () => {
    const filter = new DynamicBiquadFilter();
    expect(filter).toBeDefined();
  });
});
