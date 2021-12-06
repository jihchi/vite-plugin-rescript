import { EOL } from 'os';

// https://github.com/rescript-lang/rescript-vscode/blob/7ab2d231f91fee2f93cbf6cae1b38f94c06a58c1/server/src/utils.ts#L288
const fileAndRangeRegex = /(.+):(\d+):(\d+)(-(\d+)(:(\d+))?)?$/;

// https://github.com/rescript-lang/rescript-vscode/blob/7ab2d231f91fee2f93cbf6cae1b38f94c06a58c1/server/src/utils.ts#L433
const codeRegex = /^  +([0-9]+| +|\.) (│|┆)/;

// Compiler can treat warnings as hard errors based on `warnings` object in bsconfig.json
const warningErrorRegex = /Warning number \d+ \(configured as error\)/;

// Returns true if the line indicates the start of an error block
function isErrorLine(line: string) {
  if (line.startsWith("  We've found a bug for you!")) return true;
  if (line.startsWith('  Syntax error!')) return true;
  if (warningErrorRegex.test(line)) return true;
  return false;
}

export default function parseErrorLog(log: string) {
  // Split by line endings and remove empty lines
  const lines = log.split(EOL).filter(Boolean);

  // Optimization; only parse log when compiler is done
  if (lines[lines.length - 1]?.startsWith('#Done(')) {
    let foundError = false;
    let path = '';
    let startLine = 0;

    // There can be additional messages such as hints
    const messages = [];

    // Avoid trimming the indentation in vite overlay by adding a horizontal ruler
    // https://github.com/vitejs/vite/blob/96591bf9989529de839ba89958755eafe4c445ae/packages/vite/src/client/overlay.ts#L144
    const frame = ['—'.repeat(80)];

    // Parse the log file line by line. It might seem weird having to resort to log parsing,
    // but this is actually how the official rescript language server works:
    // https://github.com/rescript-lang/rescript-vscode/blob/7ab2d231f91fee2f93cbf6cae1b38f94c06a58c1/server/src/utils.ts#L368
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (isErrorLine(line)) {
        // An error has already been found, but only one can be handled. Do the sane thing
        // here by considering the parsing done. It might be possible to combine the multiple
        // error messages into one, but that does not seem worth it at the moment.
        if (foundError) break;
        foundError = true;

        // Optimization; the next line is always the file + range, which means it
        // can be parsed now and the next iteration (line) can be skipped.
        path = lines[i + 1].trim();

        // Extract the start line
        const match = path.match(fileAndRangeRegex);
        if (match) startLine = parseInt(match[2], 10);

        // Skip the next line since it was handled here
        i += 1;
      } else if (!foundError) {
        // Only run below checks once an error has been found
      } else if (line.startsWith('  Warning number ')) {
        // Reached the end of the error
        break;
      } else if (line.startsWith('#Done(')) {
        // Reached the end of the log file
        break;
      } else {
        // This can now only be code lines or messages
        const match = line.match(codeRegex);
        if (match) {
          // Replace strange vertical bars with regular ones in order to match
          // the code frame regex defined in the vite overlay file:
          // https://github.com/vitejs/vite/blob/96591bf9989529de839ba89958755eafe4c445ae/packages/vite/src/client/overlay.ts#L116
          let codeFrameLine = line.replace('┆', '|').replace('│', '|');

          // Since the red color indicator is lost when parsing the log file,
          // this adds a pointer (`>`) to the line where the error starts.
          if (parseInt(match[1], 10) === startLine) {
            codeFrameLine = `> ${codeFrameLine.substring(2)}`;
          }

          frame.push(codeFrameLine);
        } else if (line.startsWith('  ')) {
          // It has to be a message by now
          messages.push(line.trim());
        }
      }
    }

    if (foundError) {
      return {
        message: messages.join('\n'),
        frame: `${frame.join('\n')}`,
        stack: '',
        id: path,
      };
    }
  }

  return null;
}
