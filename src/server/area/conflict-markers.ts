// Git conflict markers in plan files (TechSpec 2.3 rule 2, REQ-072): a line that starts with `<<<<<<< ` or
// `>>>>>>> `, or is exactly `=======`. A trailing `\r` (CRLF line ends) does not hide a marker.

const MARKER = /^(?:<<<<<<< |>>>>>>> |=======\r?$)/;

export function hasConflictMarkers(text: string, options: { firstLineOnly?: boolean } = {}): boolean {
  const lines = text.split("\n");
  return (options.firstLineOnly ? lines.slice(0, 1) : lines).some((line) => MARKER.test(line));
}
