// File storage inside the user's project folder:
//   <project>/ramifold/<plan-id>/plan.json         tree, missions, results
//   <project>/ramifold/<plan-id>/chats/<node>.json chat history per node
//   <project>/ramifold/<plan-id>/PLAN.md           export of the whole tree
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getNode, numberOf, walk } = require('./tree');

// Strictly increasing timestamps, so "changed after" comparisons work within one millisecond.
let lastTime = 0;
function now() {
  lastTime = Math.max(Date.now(), lastTime + 1);
  return new Date(lastTime).toISOString();
}

function newId() {
  return crypto.randomBytes(4).toString('hex');
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug || 'plan';
}

function newNode(parentId, title, mission) {
  return {
    id: newId(),
    parentId,
    children: [],
    title: String(title || '').trim() || 'Untitled',
    mission: String(mission || '').trim(),
    status: 'open', // open | concept | final
    result: '',
    resultAt: null,
    sessionId: null,
  };
}

class Store {
  constructor(projectDir) {
    this.baseDir = path.join(projectDir, 'ramifold');
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  planDir(planId) {
    if (!/^[a-z0-9-]+$/.test(planId)) throw new Error('Invalid plan id');
    return path.join(this.baseDir, planId);
  }

  listPlans() {
    return fs
      .readdirSync(this.baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(this.baseDir, d.name, 'plan.json')))
      .map((d) => {
        const plan = this.loadPlan(d.name);
        return { id: plan.id, title: plan.nodes[plan.rootId].title, createdAt: plan.createdAt };
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  createPlan(title, mission) {
    let id = slugify(title);
    while (fs.existsSync(this.planDir(id))) id = `${slugify(title)}-${newId().slice(0, 4)}`;
    const root = newNode(null, title, mission);
    const plan = { id, createdAt: now(), rootId: root.id, nodes: { [root.id]: root } };
    fs.mkdirSync(path.join(this.planDir(id), 'chats'), { recursive: true });
    this.savePlan(plan);
    return plan;
  }

  loadPlan(planId) {
    return JSON.parse(fs.readFileSync(path.join(this.planDir(planId), 'plan.json'), 'utf8'));
  }

  savePlan(plan) {
    const file = path.join(this.planDir(plan.id), 'plan.json');
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(plan, null, 2));
    fs.renameSync(`${file}.tmp`, file);
  }

  // Applies fn(plan) and saves. Everything is synchronous, so no interleaving within one process.
  update(planId, fn) {
    const plan = this.loadPlan(planId);
    const value = fn(plan);
    this.savePlan(plan);
    return value;
  }

  addChild(planId, parentId, title, mission) {
    return this.update(planId, (plan) => {
      const parent = getNode(plan, parentId);
      const node = newNode(parentId, title, mission);
      plan.nodes[node.id] = node;
      parent.children.push(node.id);
      return node;
    });
  }

  editNode(planId, nodeId, fields) {
    return this.update(planId, (plan) => {
      const node = getNode(plan, nodeId);
      if (fields.title !== undefined) node.title = String(fields.title).trim() || node.title;
      if (fields.mission !== undefined) node.mission = String(fields.mission).trim();
      if (fields.result !== undefined || fields.status !== undefined) {
        const status = fields.status ?? node.status;
        if (!['open', 'concept', 'final'].includes(status)) throw new Error('Invalid status');
        node.status = status;
        if (fields.result !== undefined) node.result = String(fields.result);
        if (status === 'open') node.result = '';
        node.resultAt = now();
      }
      return node;
    });
  }

  moveNode(planId, nodeId, delta) {
    return this.update(planId, (plan) => {
      const node = getNode(plan, nodeId);
      if (!node.parentId) return;
      const list = getNode(plan, node.parentId).children;
      const i = list.indexOf(nodeId);
      const j = i + delta;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
    });
  }

  deleteNode(planId, nodeId) {
    return this.update(planId, (plan) => {
      const node = getNode(plan, nodeId);
      if (!node.parentId) throw new Error('The root node cannot be deleted');
      const parent = getNode(plan, node.parentId);
      parent.children = parent.children.filter((c) => c !== nodeId);
      const removed = [];
      walk(plan, (n) => removed.push(n.id), nodeId);
      for (const id of removed) {
        delete plan.nodes[id];
        fs.rmSync(this.chatFile(planId, id), { force: true });
      }
    });
  }

  setSession(planId, nodeId, sessionId) {
    this.update(planId, (plan) => {
      getNode(plan, nodeId).sessionId = sessionId;
    });
  }

  chatFile(planId, nodeId) {
    if (!/^[a-f0-9]+$/.test(nodeId)) throw new Error('Invalid node id');
    return path.join(this.planDir(planId), 'chats', `${nodeId}.json`);
  }

  loadChat(planId, nodeId) {
    const file = this.chatFile(planId, nodeId);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }

  appendChat(planId, nodeId, message) {
    const chat = this.loadChat(planId, nodeId);
    chat.push({ ...message, at: now() });
    fs.writeFileSync(this.chatFile(planId, nodeId), JSON.stringify(chat, null, 2));
  }

  exportMarkdown(planId) {
    const plan = this.loadPlan(planId);
    const md = renderMarkdown(plan);
    fs.writeFileSync(path.join(this.planDir(planId), 'PLAN.md'), md);
    return md;
  }
}

const STATUS_LABEL = { open: 'offen', concept: 'Konzept', final: 'festgelegt' };

function renderMarkdown(plan) {
  const lines = [];
  let fixed = 0;
  let total = 0;
  walk(plan, (node, depth) => {
    total += 1;
    if (node.status === 'final') fixed += 1;
    const num = numberOf(plan, node.id);
    const heading = '#'.repeat(Math.min(depth + 1, 6));
    lines.push(`${heading} ${num ? `${num} ` : ''}${node.title}`, '');
    lines.push(`**Status:** ${STATUS_LABEL[node.status]}  `, `**Auftrag:** ${node.mission || '-'}`, '');
    if (node.result) lines.push(nestHeadings(node.result.trim(), depth + 2), '');
  });
  const header = [
    `<!-- Exported by the Ramifold prototype (throwaway code) on ${now()} -->`,
    `<!-- ${fixed} of ${total} nodes fixed -->`,
    '',
  ];
  return header.concat(lines).join('\n');
}

// Re-level headings inside a node result so its top heading sits at `level`,
// below the node's own heading.
function nestHeadings(markdown, level) {
  const lines = markdown.split('\n');
  let inFence = false;
  const isHeading = lines.map((line) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    return !inFence && /^#{1,6}\s/.test(line);
  });
  const levels = lines.filter((_, i) => isHeading[i]).map((l) => l.match(/^#+/)[0].length);
  if (!levels.length) return markdown;
  const by = level - Math.min(...levels);
  return lines
    .map((line, i) => {
      if (!isHeading[i]) return line;
      const hashes = line.match(/^#+/)[0].length;
      return '#'.repeat(Math.min(Math.max(hashes + by, 1), 6)) + line.slice(hashes);
    })
    .join('\n');
}

module.exports = { Store, renderMarkdown, slugify };
