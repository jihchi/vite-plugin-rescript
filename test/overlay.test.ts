import { EOL } from 'os';
import parseLog from '../src/overlay';

const start = '#Start(1638790229265)';
const done = '#Done(1638790229437)';

const warning = `
  Warning number 27
  /path/to/file.res:2:13-18

  1 │ @react.component
  2 │ let make = (~error, ~status) => {
  3 │   switch error {
  4 │   | #NetworkError => React.null

  unused variable status.
`;

const error = `
  We've found a bug for you!
  /path/to/file.res:3:3-8

  1 │ @react.component
  2 │ let make = (~error) => {
  3 │   whoops
  4 │   switch error {
  5 │   | #NetworkError => React.null

  The value whoops can't be found
`;

const syntaxError = `
  Syntax error!
  /path/to/file.res:3:20

  1 │ @react.component
  2 │ let make = (~error) => {
  3 │   let list = list[1, 2, 3]
  4 │   switch error {
  5 │   | #NetworkError => React.null

  Did you forget a \`]\` here?
`;

const warningError = `
  Warning number 27 (configured as error) 
  /path/to/file.res:2:13-18

  1 │ @react.component
  2 │ let make = (~error, ~status) => {
  3 │   switch error {
  4 │   | #NetworkError => React.null

  unused variable status.
`;

// https://github.com/rescript-lang/rescript-vscode/blob/7ab2d231f91fee2f93cbf6cae1b38f94c06a58c1/server/src/utils.ts#L291
const ppxError = `
  We've found a bug for you!
  /path/to/file.res

  1 │ @react.component
  2 │ let make = (~error) => {
  4 │   switch error {
  5 │   | #NetworkError => React.null

  Something went wrong...
`;

const errorFrame = `
————————————————————————————————————————————————————————————————————————————————
  1 | @react.component
  2 | let make = (~error) => {
> 3 |   whoops
  4 |   switch error {
  5 |   | #NetworkError => React.null
`.trim(); // Trim newlines while also matching vite overlay trim behavior

const syntaxErrorFrame = `
————————————————————————————————————————————————————————————————————————————————
  1 | @react.component
  2 | let make = (~error) => {
> 3 |   let list = list[1, 2, 3]
  4 |   switch error {
  5 |   | #NetworkError => React.null
`.trim(); // Trim newlines while also matching vite overlay trim behavior

const warningErrorFrame = `
————————————————————————————————————————————————————————————————————————————————
  1 | @react.component
> 2 | let make = (~error, ~status) => {
  3 |   switch error {
  4 |   | #NetworkError => React.null
`.trim(); // Trim newlines while also matching vite overlay trim behavior

const ppxErrorFrame = `
————————————————————————————————————————————————————————————————————————————————
  1 | @react.component
  2 | let make = (~error) => {
  4 |   switch error {
  5 |   | #NetworkError => React.null
`.trim(); // Trim newlines while also matching vite overlay trim behavior

function expectParseLog(...sections: string[]) {
  return expect(parseLog(sections.join(EOL)));
}

describe('@jihchi/vite-plugin-rescript/overlay', () => {
  it('returns null for empty string', () => {
    expectParseLog('').toBe(null);
  });

  it('returns null when compiler has just started', () => {
    expectParseLog(start).toBe(null);
  });

  it('returns null when compiler is not yet done', () => {
    expectParseLog(start, error).toBe(null);
  });

  it('returns null when compiler log contains no errors', () => {
    expectParseLog(start, done).toBe(null);
  });

  it('returns null when compiler log contains only warning', () => {
    expectParseLog(start, warning, done).toBe(null);
  });

  it('returns error when compiler log contains error', () => {
    expectParseLog(start, error, done).toEqual({
      message: "The value whoops can't be found",
      stack: '',
      id: '/path/to/file.res:3:3-8',
      frame: errorFrame,
    });
  });

  it('returns error when compiler log contains syntax error', () => {
    expectParseLog(start, syntaxError, done).toEqual({
      message: 'Did you forget a `]` here?',
      stack: '',
      id: '/path/to/file.res:3:20',
      frame: syntaxErrorFrame,
    });
  });

  it('returns error when compiler log contains warning configured as error', () => {
    expectParseLog(start, warningError, done).toEqual({
      message: 'unused variable status.',
      stack: '',
      id: '/path/to/file.res:2:13-18',
      frame: warningErrorFrame,
    });
  });

  it('returns error without frame pointer when path has no location', () => {
    expectParseLog(start, ppxError, done).toEqual({
      message: 'Something went wrong...',
      stack: '',
      id: '/path/to/file.res',
      frame: ppxErrorFrame,
    });
  });

  it('returns error when compiler log contains error and warning', () => {
    expectParseLog(start, error, warning, done).toEqual({
      message: "The value whoops can't be found",
      stack: '',
      id: '/path/to/file.res:3:3-8',
      frame: errorFrame,
    });
  });

  it('returns error when compiler log contains error with odd vertical bars', () => {
    expectParseLog(start, error.replace('│', '┆'), warning, done).toEqual({
      message: "The value whoops can't be found",
      stack: '',
      id: '/path/to/file.res:3:3-8',
      frame: errorFrame,
    });
  });

  it('returns only the first error', () => {
    expectParseLog(start, error, syntaxError, done).toEqual({
      message: "The value whoops can't be found",
      stack: '',
      id: '/path/to/file.res:3:3-8',
      frame: errorFrame,
    });
  });

  it('returns error with multiple messages', () => {
    const hint = '  Did you mean whooops?';
    expectParseLog(start, error, hint, done).toEqual({
      message: "The value whoops can't be found\nDid you mean whooops?",
      stack: '',
      id: '/path/to/file.res:3:3-8',
      frame: errorFrame,
    });
  });
});
