import type { TreeNodeDto } from "../../shared/api-schemas";
import type { NodeFile, ResultVersionFile } from "../area/file-schemas";

// Pure tree functions (TechSpec 2.4 "Baumregeln", ADR-005): numbers are never stored but computed from the position.
// Children are sorted by (position, id) in byte order; the id decides for equal position keys (parallel work).

type TreeSource = { nodes: readonly NodeFile[]; results: ReadonlyMap<string, readonly ResultVersionFile[]> };

/** The nodes in tree order (pre-order) as `TreeNodeDto`; the root has the number null and depth 0. */
export function buildTree(plan: TreeSource): TreeNodeDto[] {
  const children = new Map<string | null, NodeFile[]>();
  for (const node of plan.nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  for (const siblings of children.values()) siblings.sort(compareSiblings);

  const tree: TreeNodeDto[] = [];
  const visit = (node: NodeFile, depth: number, number: string | null): number => {
    const own = children.get(node.id) ?? [];
    const dto: TreeNodeDto = {
      id: node.id,
      parentId: node.parentId,
      depth,
      number,
      title: node.title,
      resultStatus: resultStatus(plan.results.get(node.id) ?? []),
      childCount: own.length,
      descendantCount: 0,
      // AI drafts live in the AiDraftStore of the instance (TechSpec 2.10); it follows with its task.
      hasAiDraft: false,
    };
    tree.push(dto);
    own.forEach((child, index) => {
      const childNumber = number === null ? `${index + 1}` : `${number}.${index + 1}`;
      dto.descendantCount += 1 + visit(child, depth + 1, childNumber);
    });
    return dto.descendantCount;
  };
  for (const root of children.get(null) ?? []) visit(root, 0, null);
  return tree;
}

/** `open` without a version, else the status of the latest version by (createdAt, id). */
export function resultStatus(versions: readonly ResultVersionFile[]): TreeNodeDto["resultStatus"] {
  let latest: ResultVersionFile | null = null;
  for (const version of versions) {
    if (latest === null || compareBytes(version.createdAt, latest.createdAt) > 0) latest = version;
    else if (version.createdAt === latest.createdAt && compareBytes(version.id, latest.id) > 0) latest = version;
  }
  return latest === null ? "open" : latest.status;
}

function compareSiblings(a: NodeFile, b: NodeFile): number {
  return compareBytes(a.position, b.position) || compareBytes(a.id, b.id);
}

/** Byte order; positions and ids contain only ASCII, so code unit order is byte order. */
function compareBytes(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
