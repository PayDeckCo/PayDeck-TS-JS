import { add } from '.';
import { expect, describe, it } from 'vitest';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
