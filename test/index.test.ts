import { describe, expect, it } from 'vitest';
import Plugin from '../src';

describe('@jihchi/vite-plugin-rescript', () => {
  it('works', () => {
    const actual = Plugin();
    expect(actual).toHaveProperty('name', '@jihchi/vite-plugin-rescript');
    expect(actual).toHaveProperty('configResolved');
    expect(actual.configResolved).toBeInstanceOf(Function);
  });
});
