import { describe, expect, it } from "vitest";
import { hasConflictMarkers } from "../../src/server/area/conflict-markers";

// TechSpec 2.3 rule 2: a line that starts with "<<<<<<< ", ">>>>>>> " or is exactly "=======".

describe("hasConflictMarkers", () => {
  it("finds the three Git conflict markers", () => {
    expect(hasConflictMarkers("{\n<<<<<<< HEAD\n")).toBe(true);
    expect(hasConflictMarkers('{\n  "a": 1\n=======\n}')).toBe(true);
    expect(hasConflictMarkers(">>>>>>> feature/x\n")).toBe(true);
  });

  it("finds markers in files with CRLF line ends", () => {
    expect(hasConflictMarkers("a\r\n=======\r\nb\r\n")).toBe(true);
  });

  it("ignores similar text that is no marker", () => {
    expect(hasConflictMarkers('{"title": "<<<<<<< not at line start"}\n')).toBe(false);
    expect(hasConflictMarkers("========\n")).toBe(false);
    expect(hasConflictMarkers(" =======\n")).toBe(false);
    expect(hasConflictMarkers("<<<<<<<\n")).toBe(false);
    expect(hasConflictMarkers("")).toBe(false);
  });

  it("checks only the first line when asked to", () => {
    expect(hasConflictMarkers('{"t":"chat"}\n=======\n', { firstLineOnly: true })).toBe(false);
    expect(hasConflictMarkers('<<<<<<< HEAD\n{"t":"chat"}\n', { firstLineOnly: true })).toBe(true);
  });
});
