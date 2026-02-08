import { jest } from '@jest/globals';

export function setupBrowserMocks() {
  const storageMock = () => {
    let store: { [key: string]: string } = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: any) => {
        store[key] = (value === null || value === undefined) ? "" : value.toString();
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
    };
  };

  Object.defineProperty(window, 'localStorage', { value: storageMock(), configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: storageMock(), configurable: true });

  const historyState: any[] = [];
  let currentIndex = -1;

  Object.defineProperty(window, 'history', {
    value: {
      pushState: jest.fn((state: any, title: string, url?: string) => {
        currentIndex++;
        historyState.splice(currentIndex);
        historyState.push({ state, title, url });
      }),
      replaceState: jest.fn((state: any, title: string, url?: string) => {
        if (currentIndex === -1) currentIndex = 0;
        historyState[currentIndex] = { state, title, url };
      }),
      get state() {
        return historyState[currentIndex]?.state || null;
      },
      back: jest.fn(() => {
        if (currentIndex > 0) currentIndex--;
      }),
      forward: jest.fn(() => {
        if (currentIndex < historyState.length - 1) currentIndex++;
      }),
    },
    configurable: true
  });

  // Mock location without triggering JSDOM navigation error
  const mockLocation = {
    hash: '',
    pathname: '/',
    href: 'http://localhost/',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  };

  try {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockLocation,
    });
  } catch (e) {
    // If defineProperty fails, this environment might not allow it.
    // Just try to set the hash if possible.
    try {
        (window.location as any).hash = '';
    } catch (e2) {}
  }

  (window as any).requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(0), 0);
  });
}
