import { ArrayBufferReader } from '../../editor/ArrayBufferReader';
import { ArrayBufferWriter } from '../../editor/ArrayBufferWriter';

describe('ArrayBuffer Utilities', () => {
  it('should write and read Uint32', () => {
    const writer = new ArrayBufferWriter(10);
    writer.writeUint32(0x12345678);
    const reader = new ArrayBufferReader(new DataView(writer.toCompactArrayBuffer()));
    expect(reader.readUint32()).toBe(0x12345678);
  });

  it('should write and read Uint24', () => {
    const writer = new ArrayBufferWriter(10);
    writer.writeUint24(0x123456);
    const reader = new ArrayBufferReader(new DataView(writer.toCompactArrayBuffer()));
    expect(reader.readUint24()).toBe(0x123456);
  });

  it('should write and read Uint16', () => {
    const writer = new ArrayBufferWriter(10);
    writer.writeUint16(0x1234);
    const reader = new ArrayBufferReader(new DataView(writer.toCompactArrayBuffer()));
    expect(reader.readUint16()).toBe(0x1234);
  });

  it('should write and read Uint8', () => {
    const writer = new ArrayBufferWriter(10);
    writer.writeUint8(0x12);
    const reader = new ArrayBufferReader(new DataView(writer.toCompactArrayBuffer()));
    expect(reader.readUint8()).toBe(0x12);
  });

  it('should handle variable length MIDI values', () => {
    const writer = new ArrayBufferWriter(10);
    writer.writeMidiVariableLength(0x3FFF);
    const reader = new ArrayBufferReader(new DataView(writer.toCompactArrayBuffer()));
    expect(reader.readMidiVariableLength()).toBe(0x3FFF);
  });
});
