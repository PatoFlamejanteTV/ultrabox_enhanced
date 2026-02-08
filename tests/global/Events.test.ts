import { jest } from '@jest/globals';
import { events } from '../../global/Events';

describe('EventManager', () => {
  it('should listen and raise events', () => {
    const callback = jest.fn();
    events.listen('test-event', callback);
    events.raise('test-event', { data: 123 });
    expect(callback).toHaveBeenCalledWith({ data: 123 }, undefined);
  });

  it('should unlisten events', () => {
    const callback = jest.fn();
    events.listen('test-event-2', callback);
    events.unlisten('test-event-2', callback);
    events.raise('test-event-2', { data: 123 });
    expect(callback).not.toHaveBeenCalled();
  });

  it('should unlistenAll events', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    events.listen('test-event-3', callback1);
    events.listen('test-event-3', callback2);
    events.unlistenAll('test-event-3');
    events.raise('test-event-3', {});
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });
});
