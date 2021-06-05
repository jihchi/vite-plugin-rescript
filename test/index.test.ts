import Plugin from '../src';

describe('@jihchi/vite-plugin-rescript', () => {
  it('works', () => {
    const actual = Plugin();
    expect(actual).toHaveProperty('name', '@jihchi/vite-plugin-rescript');
    expect(actual).toHaveProperty('buildStart');
    expect(actual.buildStart).toBeInstanceOf(Function);
  });
});
