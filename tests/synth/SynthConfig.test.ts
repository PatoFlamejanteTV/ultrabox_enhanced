import { Config, getPulseWidthRatio, toNameMap } from '../../synth/SynthConfig';

describe('SynthConfig', () => {
  it('should have valid Config object', () => {
    expect(Config).toBeDefined();
    expect(Config.keys).toBeDefined();
    expect(Config.keys.length).toBe(12);
  });

  it('should compute pulse width ratio correctly', () => {
    expect(getPulseWidthRatio(0)).toBe(0);
    expect(getPulseWidthRatio(Config.pulseWidthRange)).toBe(0.5);
  });

  it('should convert array to name map', () => {
     const arr = [{name: 'a', val: 1}, {name: 'b', val: 2}];
     const map = toNameMap(arr);
     expect(map.dictionary['a']).toEqual({name: 'a', val: 1, index: 0});
     expect(map.dictionary['b']).toEqual({name: 'b', val: 2, index: 1});
  });
});
