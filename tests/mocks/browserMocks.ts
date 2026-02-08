import { jest } from '@jest/globals';

/**
 * Installs in-memory mocks for browser globals used in tests.
 *
 * Sets window.localStorage and window.sessionStorage to Storage-like mocks, replaces
 * window.history with a controllable history implementation (pushState, replaceState,
 * back, forward, and state), substitutes window.location with a safe mock that avoids
 * JSDOM navigation side effects, and mocks window.requestAnimationFrame to schedule
 * callbacks via a zero-delay timer.
 */
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
      length: 0,
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

  // Use a proxy or just define properties on the existing location if possible,
  // but JSDOM location is tricky. Let's try to just mock the parts we use.
  try {
      delete (window as any).location;
      window.location = mockLocation as any;
  } catch (e) {
      // If delete fails, try to just override properties
      (window.location as any).hash = '';
  }

  (window as any).requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(0), 0);
  });
}