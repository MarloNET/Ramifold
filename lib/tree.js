// Pure helpers over the plan tree. No I/O here.
'use strict';

function getNode(plan, id) {
  const node = plan.nodes[id];
  if (!node) throw new Error(`Unknown node ${id}`);
  return node;
}

// Root has the number "" (it is the Vorhaben itself); children are 1, 2, 2.1, ...
function numberOf(plan, id) {
  const parts = [];
  let node = getNode(plan, id);
  while (node.parentId) {
    const parent = getNode(plan, node.parentId);
    parts.unshift(parent.children.indexOf(node.id) + 1);
    node = parent;
  }
  return parts.join('.');
}

function ancestorsOf(plan, id) {
  const result = [];
  let node = getNode(plan, id);
  while (node.parentId) {
    node = getNode(plan, node.parentId);
    result.unshift(node);
  }
  return result;
}

function siblingsOf(plan, id) {
  const node = getNode(plan, id);
  if (!node.parentId) return [];
  return getNode(plan, node.parentId).children.filter((c) => c !== id).map((c) => getNode(plan, c));
}

function label(plan, node) {
  const n = numberOf(plan, node.id);
  return n ? `${n} ${node.title}` : node.title;
}

// Depth-first walk in display order.
function walk(plan, fn, id = plan.rootId, depth = 0) {
  const node = getNode(plan, id);
  fn(node, depth);
  for (const c of node.children) walk(plan, fn, c, depth + 1);
}

// A parent is "stale" when a child's fixed plan changed after the parent's own result.
function hasNewChildPlans(plan, id) {
  const node = getNode(plan, id);
  const since = node.resultAt || '';
  return node.children.some((c) => {
    const child = getNode(plan, c);
    return child.status === 'final' && (child.resultAt || '') > since;
  });
}

module.exports = { getNode, numberOf, ancestorsOf, siblingsOf, label, walk, hasNewChildPlans };
