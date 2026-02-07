import { jest } from '@jest/globals';
import { SongDocument } from '../../editor/SongDocument';
import { setupBrowserMocks } from '../mocks/browserMocks';

describe('SongDocument', () => {
  beforeEach(() => {
    setupBrowserMocks();
    // Mocking window.alert to avoid issues during tests
    window.alert = jest.fn();
  });

  it('should initialize with a default song', () => {
    const doc = new SongDocument();
    expect(doc.song).toBeDefined();
    expect(doc.song.channels.length).toBeGreaterThan(0);
  });

  it('should update volume', () => {
    const doc = new SongDocument();
    doc.setVolume(25);
    expect(doc.prefs.volume).toBe(25);
  });
});
