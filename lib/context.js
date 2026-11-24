// Builds the context a node's AI receives. This is the core rule under test:
// down the tree flow mission + result of all ancestors and title + mission of siblings;
// up the tree flow the fixed plans of the children. Chats never leave their node:
// this module only ever reads plan.json, never chat files.
'use strict';

const { getNode, ancestorsOf, siblingsOf, label } = require('./tree');

const STATUS_TEXT = { open: 'no result yet', concept: 'CONCEPT (not final)', final: 'FIXED PLAN' };

function resultBlock(node) {
  if (node.status === 'open' || !node.result) return '_No result yet._';
  return `Result (${STATUS_TEXT[node.status]}):\n${node.result.trim()}`;
}

function buildNodeContext(plan, nodeId) {
  const node = getNode(plan, nodeId);
  const root = getNode(plan, plan.rootId);
  const out = [];

  out.push(
    'You are the AI inside one node of Ramifold, a tool that plans a larger undertaking as a tree.',
    'Every node has its own chat. Between nodes only results (mission, concept, fixed plan) flow, never chats.',
    'Below you get everything decided above this node, the neighbouring points, and the fixed plans of its sub-points.',
    'Rules:',
    '- Stay on the mission of THIS node. Topics of sibling nodes are planned there; refer to them instead of planning them here.',
    '- Treat fixed plans of ancestors as binding decisions. Concepts are drafts and may be questioned.',
    '- Do not ask the user to re-explain context that is given below.',
    '- Use web research when current facts matter (models, libraries, prices, versions) and cite sources.',
    '- Do not modify any files. You are planning, not implementing.',
    "- Answer in the user's language.",
    '',
    `# Undertaking: ${root.title}`,
  );

  const ancestors = ancestorsOf(plan, nodeId);
  if (ancestors.length) {
    out.push('', '# Ancestors (top-down)');
    for (const a of ancestors) {
      out.push('', `## ${label(plan, a) || a.title}`, `Mission: ${a.mission || '-'}`, resultBlock(a));
    }
  }

  out.push('', `# THIS NODE: ${label(plan, node)}`, `Mission: ${node.mission || '-'}`);
  if (node.result && node.status !== 'open') out.push(`Current ${resultBlock(node)}`);

  const siblings = siblingsOf(plan, nodeId);
  if (siblings.length) {
    out.push('', '# Sibling nodes (planned elsewhere; title and mission only)');
    for (const s of siblings) out.push(`- ${label(plan, s)}: ${s.mission || '-'}`);
  }

  if (node.children.length) {
    out.push('', '# Sub-points of this node');
    for (const c of node.children.map((id) => getNode(plan, id))) {
      if (c.status === 'final') {
        out.push('', `## ${label(plan, c)} (FIXED PLAN)`, `Mission: ${c.mission || '-'}`, c.result.trim());
      } else {
        out.push('', `## ${label(plan, c)} (not fixed yet)`, `Mission: ${c.mission || '-'}`);
      }
    }
  }

  return out.join('\n');
}

const SUGGEST_PROMPT = `Propose the sub-points for THIS node, based on its mission, the context above and our conversation so far.
Each sub-point becomes its own node with its own chat, so give each one a clear, self-contained mission (what has to be clarified/decided there, 1-3 sentences).
Usually 3-7 sub-points; do not overlap with sibling nodes or existing sub-points.
Do not ask the user for more information; propose from what is given.
Reply with ONLY a JSON object, no prose, in exactly this form:
{"children":[{"title":"short title","mission":"what to clarify in this sub-point"}]}`;

const SUMMARIZE_PROMPT = `Write the plan for THIS node as the result of our conversation so far.
Integrate the fixed plans of the sub-points (listed in the context) instead of repeating them verbatim, and keep it consistent with the ancestors' decisions.
Use Markdown with these sections, leaving out sections that do not apply:
## Goal
## Decisions (with short rationale)
## Plan (steps, components, data model, interfaces, as relevant)
## Acceptance criteria
## Open questions
Everything you have is the node context (system prompt) and the conversation above; there is nothing else to look up.
Do not ask the user for more information. Write the best plan possible from what is given and list what is missing under "Open questions".
Reply with ONLY the plan in Markdown, no preamble.`;

module.exports = { buildNodeContext, SUGGEST_PROMPT, SUMMARIZE_PROMPT };
