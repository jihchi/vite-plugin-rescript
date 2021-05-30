import Plugin from '../src';

describe('vite-plugin-rescript', () => {
  it('works', () => {
    const actual = Plugin();
    expect(actual).toHaveProperty('name', 'rollup-plugin-rescript');
    expect(actual).toHaveProperty('buildStart');
    expect(actual.buildStart).toBeInstanceOf(Function);
  });
});
