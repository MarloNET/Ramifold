import { describe, expect, it } from "vitest";
import type { NodeFile, ResultVersionFile } from "../../src/server/area/file-schemas";
import { buildTree } from "../../src/server/plan/tree-model";

// TechSpec 2.4 "Baumregeln" and 6: order of the children by (position, id), numbers from the position (REQ-008),
// depth, childCount, descendantCount (REQ-009), resultStatus from the latest version by (createdAt, id) (REQ-007).

const AT = "2026-11-03T10:00:00.000Z";
const id = (suffix: string) => `01JDQ7Z8M3A6Y2W4X5V7T9R${suffix}`;

function node(suffix: string, parent: string | null, position: string): NodeFile {
  return {
    id: id(suffix),
    parentId: parent === null ? null : id(parent),
    position,
    title: `Node ${suffix}`,
    objective: "",
    createdAt: AT,
    updatedAt: AT,
  };
}

function version(nodeSuffix: string, versionSuffix: string, status: "concept" | "fixed", createdAt: string): ResultVersionFile {
  return { id: id(versionSuffix), nodeId: id(nodeSuffix), status, content: "x", createdAt };
}

function plan(nodes: NodeFile[], versions: ResultVersionFile[] = []) {
  const results = new Map<string, ResultVersionFile[]>();
  for (const v of versions) results.set(v.nodeId, [...(results.get(v.nodeId) ?? []), v]);
  return { nodes, results };
}

describe("buildTree", () => {
  it("lists the nodes in pre-order with numbers 1, 2, 2.1 from the position; the root has the number null", () => {
    // Files in a different order than the tree.
    const tree = buildTree(
      plan([node("C21", "C20", "a0"), node("C20", "C00", "a1"), node("C00", null, "a0"), node("C10", "C00", "a0")]),
    );
    expect(tree.map((n) => [n.id, n.number, n.depth, n.parentId])).toEqual([
      [id("C00"), null, 0, null],
      [id("C10"), "1", 1, id("C00")],
      [id("C20"), "2", 1, id("C00")],
      [id("C21"), "2.1", 2, id("C20")],
    ]);
    expect(tree.map((n) => n.title)).toEqual(["Node C00", "Node C10", "Node C20", "Node C21"]);
  });

  it("sorts siblings by position (byte order), with equal positions the id decides", () => {
    const tree = buildTree(
      plan([
        node("C00", null, "a0"),
        node("C30", "C00", "a1"),
        node("C20", "C00", "a1"),
        node("C10", "C00", "Zz"), // "Z" < "a" in byte order
        node("C40", "C00", "a0V"),
      ]),
    );
    expect(tree.map((n) => [n.id, n.number])).toEqual([
      [id("C00"), null],
      [id("C10"), "1"],
      [id("C40"), "2"],
      [id("C20"), "3"],
      [id("C30"), "4"],
    ]);
  });

  it("counts children and all descendants", () => {
    const tree = buildTree(
      plan([
        node("C00", null, "a0"),
        node("C10", "C00", "a0"),
        node("C20", "C00", "a1"),
        node("C21", "C20", "a0"),
        node("C22", "C20", "a1"),
        node("C23", "C20", "a2"),
        node("C2A", "C21", "a0"),
      ]),
    );
    const counts = Object.fromEntries(tree.map((n) => [n.number ?? "root", [n.childCount, n.descendantCount]]));
    expect(counts).toEqual({
      root: [2, 6],
      "1": [0, 0],
      "2": [3, 4],
      "2.1": [1, 1],
      "2.1.1": [0, 0],
      "2.2": [0, 0],
      "2.3": [0, 0],
    });
  });

  it("resultStatus is open without a version, else the status of the latest version by (createdAt, id)", () => {
    const tree = buildTree(
      plan(
        [node("C00", null, "a0"), node("C10", "C00", "a0"), node("C20", "C00", "a1"), node("C21", "C20", "a0")],
        [
          // Node 2: the later version is fixed, listed first in the files.
          version("C20", "V02", "fixed", "2026-11-05T10:00:00.000Z"),
          version("C20", "V01", "concept", "2026-11-04T10:00:00.000Z"),
          // Node 2.1: same createdAt, the larger id is the latest.
          version("C21", "V12", "concept", "2026-11-04T10:00:00.000Z"),
          version("C21", "V11", "fixed", "2026-11-04T10:00:00.000Z"),
        ],
      ),
    );
    expect(tree.map((n) => [n.number, n.resultStatus])).toEqual([
      [null, "open"],
      ["1", "open"],
      ["2", "fixed"],
      ["2.1", "concept"],
    ]);
  });

  it("has no AI draft without a draft store (hasAiDraft false)", () => {
    expect(buildTree(plan([node("C00", null, "a0")]))[0]!.hasAiDraft).toBe(false);
  });
});
