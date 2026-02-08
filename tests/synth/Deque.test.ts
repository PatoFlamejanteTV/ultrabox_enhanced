import { Deque } from '../../synth/Deque';

describe('Deque', () => {
  let deque: Deque<number>;

  beforeEach(() => {
    deque = new Deque<number>();
  });

  it('should push and pop front', () => {
    deque.pushFront(1);
    deque.pushFront(2);
    expect(deque.count()).toBe(2);
    expect(deque.popFront()).toBe(2);
    expect(deque.popFront()).toBe(1);
    expect(deque.count()).toBe(0);
  });

  it('should push and pop back', () => {
    deque.pushBack(1);
    deque.pushBack(2);
    expect(deque.count()).toBe(2);
    expect(deque.popBack()).toBe(2);
    expect(deque.popBack()).toBe(1);
    expect(deque.count()).toBe(0);
  });

  it('should get and set elements', () => {
    deque.pushBack(1);
    deque.pushBack(2);
    expect(deque.get(0)).toBe(1);
    expect(deque.get(1)).toBe(2);
    deque.set(0, 3);
    expect(deque.get(0)).toBe(3);
  });

  it('should remove elements', () => {
    deque.pushBack(1);
    deque.pushBack(2);
    deque.pushBack(3);
    deque.remove(1); // remove 2
    expect(deque.count()).toBe(2);
    expect(deque.get(0)).toBe(1);
    expect(deque.get(1)).toBe(3);
  });

  it('should expand capacity', () => {
      for(let i=0; i<100; i++) {
          deque.pushBack(i);
      }
      expect(deque.count()).toBe(100);
      expect(deque.get(50)).toBe(50);
  });
});
