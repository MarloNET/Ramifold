import { useMemo, useRef, type KeyboardEvent } from "react";
import { Button, Tree, TreeItem, TreeItemContent, type Key, type TreeItemContentRenderProps } from "react-aria-components";
import type { TreeNodeDto } from "../../../shared/api-schemas";
import { Icon, type IconName } from "../../components/Icon";
import { messages } from "../../text/messages";
import { STATUS_WORD, treeRowName } from "./tree-row-text";
import { TreeRowTooltip } from "./TreeRowTooltip";

// The tree of UI-003 (TechSpec 2.16 "Baumzeile", 2.4; ARIA tree pattern of React Aria `Tree`, role treegrid): per row
// the expand arrow (only with children), number, title (one line, shortened with "…") and the status symbol; the
// accessible name of the row comes from `treeRowName`. One tab stop, arrow keys, Home/End, Enter selects the node.
// "+n", "Draft" and "AI running" in the row follow with their tasks (#77, #131, #112).

const STATUS_ICON: Record<TreeNodeDto["resultStatus"], IconName> = {
  open: "status-none",
  concept: "status-concept",
  fixed: "status-fixed",
};

export function PlanTree(props: {
  nodes: readonly TreeNodeDto[];
  selectedNodeId: string | null;
  expandedIds: ReadonlySet<string>;
  onSelect: (nodeId: string) => void;
  onExpandedChange: (expandedIds: ReadonlySet<string>) => void;
}) {
  const { nodes, selectedNodeId, expandedIds, onSelect, onExpandedChange } = props;
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TreeNodeDto[]>();
    for (const node of nodes) map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]);
    return map;
  }, [nodes]);

  const renderItem = (node: TreeNodeDto) => (
    <TreeItem
      key={node.id}
      id={node.id}
      textValue={treeRowName(node)}
      className="tree-row"
      data-root={node.parentId === null || undefined}
      style={{ paddingInlineStart: `${8 + node.depth * 16}px` }}
    >
      <TreeItemContent>{(state) => <PlanTreeRow node={node} state={state} />}</TreeItemContent>
      {(childrenOf.get(node.id) ?? []).map(renderItem)}
    </TreeItem>
  );

  return (
    // Only for the key → on an expanded row (see `focusFirstChild`); all other keys are React Aria's.
    <div onKeyDownCapture={focusFirstChild}>
      <Tree
        className="plan-tree"
        aria-label={messages["UI-003.plan"]}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={selectedNodeId === null ? [] : [selectedNodeId]}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const [key] = keys;
          if (key !== undefined) onSelect(String(key));
        }}
        expandedKeys={expandedIds as Set<Key>}
        onExpandedChange={(keys) => onExpandedChange(new Set([...keys].map(String)))}
      >
        {(childrenOf.get(null) ?? []).map(renderItem)}
      </Tree>
    </div>
  );
}

/**
 * → on an expanded row moves the focus to its first child (UI-003 "→ aufklappen bzw. in Kind", DER-19-05). React Aria
 * expands a collapsed row with → but moves the focus into the row (to the arrow) when it is already expanded.
 */
function focusFirstChild(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowRight" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const row = event.target as HTMLElement;
  if (row.getAttribute("role") !== "row" || row.getAttribute("aria-expanded") !== "true") return;
  const next = row.nextElementSibling;
  if (!(next instanceof HTMLElement) || Number(next.getAttribute("aria-level")) !== Number(row.getAttribute("aria-level")) + 1) return;
  event.preventDefault();
  event.stopPropagation();
  // React Aria takes the focused row over from the focus event.
  next.focus();
}

function PlanTreeRow({ node, state }: { node: TreeNodeDto; state: TreeItemContentRenderProps }) {
  const titleRef = useRef<HTMLSpanElement>(null);
  return (
    <>
      {state.hasChildItems ? (
        // Not a focus stop of its own: React Aria takes the arrow out of the tab order of the tree.
        <Button slot="chevron" className="tree-row__chevron">
          <Icon name={state.isExpanded ? "collapse" : "expand"} size="compact" />
        </Button>
      ) : (
        <span className="tree-row__chevron" />
      )}
      {node.number !== null && <span className="tree-row__number">{node.number}</span>}
      <span ref={titleRef} className="tree-row__title">
        {node.title}
      </span>
      <span className="tree-row__status" data-status={node.resultStatus}>
        <Icon name={STATUS_ICON[node.resultStatus]} size="compact" />
      </span>
      <TreeRowTooltip
        isHovered={state.isHovered}
        isFocusVisible={state.isFocusVisible}
        titleRef={titleRef}
        title={node.title}
        statusWord={STATUS_WORD[node.resultStatus]}
      />
    </>
  );
}
