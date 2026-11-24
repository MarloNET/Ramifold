#!/usr/bin/env node
// Ramifold prototype – THROWAWAY CODE, see README.md.
// Usage: node server.js [project-folder]   (default: ./demo-project)
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Store } = require('./lib/store');
const { getNode, numberOf, hasNewChildPlans } = require('./lib/tree');
const { buildNodeContext, SUGGEST_PROMPT, SUMMARIZE_PROMPT } = require('./lib/context');
const { runClaude, parseSuggestions } = require('./lib/claude');

const PORT = Number(process.env.PORT || 4317);
const HOST = '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const projectDir = path.resolve(process.argv[2] || path.join(__dirname, 'demo-project'));
fs.mkdirSync(projectDir, { recursive: true });
const store = new Store(projectDir);

// One running Claude process per node at a time.
const busy = new Set();

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      data += c;
      if (data.length > 2e6) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function planView(planId) {
  const plan = store.loadPlan(planId);
  const nodes = {};
  for (const node of Object.values(plan.nodes)) {
    nodes[node.id] = {
      ...node,
      number: numberOf(plan, node.id),
      newChildPlans: node.status !== 'open' && hasNewChildPlans(plan, node.id),
      busy: busy.has(`${planId}/${node.id}`),
    };
  }
  return { id: plan.id, rootId: plan.rootId, nodes, folder: store.planDir(plan.id) };
}

function withHistory(history, prompt, sayIfEmpty = false) {
  if (!history.length) {
    return sayIfEmpty ? `There is no conversation in this node yet; work from the context only.\n\n---\n\n${prompt}` : prompt;
  }
  const transcript = history.map((m) => `[${m.role}]\n${m.text}`).join('\n\n');
  return `Earlier conversation in THIS node (for continuity):\n\n${transcript}\n\n---\n\n${prompt}`;
}

// Streams NDJSON events to the browser while Claude works.
async function streamClaude(res, planId, nodeId, { prompt, userText, kind }) {
  const key = `${planId}/${nodeId}`;
  if (busy.has(key)) return send(res, 409, { error: 'This node is already working on a request.' });
  busy.add(key);
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
  const emit = (ev) => res.write(`${JSON.stringify(ev)}\n`);
  try {
    const plan = store.loadPlan(planId);
    const node = getNode(plan, nodeId);
    const systemPrompt = buildNodeContext(plan, nodeId);
    const history = store.loadChat(planId, nodeId).filter((m) => m.role !== 'error');
    if (userText) store.appendChat(planId, nodeId, { role: 'user', text: userText });
    const tools = [];
    let streamed = false;
    const run = (sessionId, text) =>
      runClaude({
        cwd: projectDir,
        systemPrompt,
        prompt: text,
        sessionId,
        onEvent: (ev) => {
          streamed = true;
          if (ev.type === 'tool') tools.push({ name: ev.name, detail: ev.detail });
          emit(ev);
        },
      });
    let out;
    try {
      // Suggestions and summaries get this node's chat explicitly from our files instead of
      // relying on a resumed Claude session, so they also work for nodes without any chat.
      out = kind === 'chat' ? await run(node.sessionId, prompt) : await run(null, withHistory(history, prompt, true));
    } catch (err) {
      if (kind !== 'chat') throw err;
      // The Claude session may be gone (cleaned up, other machine). Start a new one and
      // hand over this node's own chat from our files instead.
      if (!node.sessionId || streamed) throw err;
      out = await run(null, withHistory(history, prompt));
    }
    if (kind === 'chat') {
      if (out.sessionId) store.setSession(planId, nodeId, out.sessionId);
      store.appendChat(planId, nodeId, { role: 'assistant', text: out.text, tools });
      emit({ type: 'done', text: out.text });
    } else if (kind === 'suggest') {
      emit({ type: 'done', suggestions: parseSuggestions(out.finalText) });
    } else {
      emit({ type: 'done', text: out.finalText });
    }
  } catch (err) {
    if (kind === 'chat') store.appendChat(planId, nodeId, { role: 'error', text: err.message });
    emit({ type: 'error', message: err.message });
  } finally {
    busy.delete(key);
    res.end();
  }
}

async function api(req, res, parts) {
  const method = req.method;
  // /api/plans
  if (parts.length === 1) {
    if (method === 'GET') return send(res, 200, { projectDir, plans: store.listPlans() });
    if (method === 'POST') {
      const body = await readBody(req);
      if (!String(body.title || '').trim()) return send(res, 400, { error: 'Title is required.' });
      const plan = store.createPlan(body.title, body.mission);
      return send(res, 201, planView(plan.id));
    }
  }
  const planId = parts[1];
  // /api/plans/:id
  if (parts.length === 2 && method === 'GET') return send(res, 200, planView(planId));
  // /api/plans/:id/export
  if (parts.length === 3 && parts[2] === 'export' && method === 'POST') {
    const markdown = store.exportMarkdown(planId);
    return send(res, 200, { markdown, file: path.join(store.planDir(planId), 'PLAN.md') });
  }
  if (parts[2] !== 'nodes' || !parts[3]) return send(res, 404, { error: 'Not found' });
  const nodeId = parts[3];
  const action = parts[4];

  if (!action) {
    if (method === 'PATCH') {
      store.editNode(planId, nodeId, await readBody(req));
      return send(res, 200, planView(planId));
    }
    if (method === 'DELETE') {
      store.deleteNode(planId, nodeId);
      return send(res, 200, planView(planId));
    }
  }
  if (action === 'children' && method === 'POST') {
    const body = await readBody(req);
    const items = Array.isArray(body.children) ? body.children : [body];
    for (const item of items) store.addChild(planId, nodeId, item.title, item.mission);
    return send(res, 201, planView(planId));
  }
  if (action === 'move' && method === 'POST') {
    store.moveNode(planId, nodeId, (await readBody(req)).delta === -1 ? -1 : 1);
    return send(res, 200, planView(planId));
  }
  if (action === 'chat' && method === 'GET') return send(res, 200, { messages: store.loadChat(planId, nodeId) });
  if (action === 'context' && method === 'GET') {
    return send(res, 200, { context: buildNodeContext(store.loadPlan(planId), nodeId) });
  }
  if (action === 'chat' && method === 'POST') {
    const text = String((await readBody(req)).message || '').trim();
    if (!text) return send(res, 400, { error: 'Message is empty.' });
    return streamClaude(res, planId, nodeId, { prompt: text, userText: text, kind: 'chat' });
  }
  // Suggestions and summaries see the node's chat but are not added to it.
  if (action === 'suggest' && method === 'POST') {
    return streamClaude(res, planId, nodeId, { prompt: SUGGEST_PROMPT, kind: 'suggest' });
  }
  if (action === 'summarize' && method === 'POST') {
    return streamClaude(res, planId, nodeId, { prompt: SUMMARIZE_PROMPT, kind: 'summarize' });
  }
  return send(res, 404, { error: 'Not found' });
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  // Local-only tool: reject requests that do not come from our own page (DNS rebinding, CSRF).
  const host = req.headers.host || '';
  const origin = req.headers.origin;
  const self = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];
  if (!self.includes(host) || (origin && !self.some((s) => origin === `http://${s}`))) {
    return send(res, 403, { error: 'Forbidden' });
  }
  const url = new URL(req.url, `http://${host}`);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts[0] === 'api' && parts[1] === 'plans') return await api(req, res, parts.slice(1));
    const file = parts.length ? parts.join('/') : 'index.html';
    const full = path.join(PUBLIC_DIR, file);
    if (!full.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(full)) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': `${MIME[path.extname(full)] || 'text/plain'}; charset=utf-8` });
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    const status = /Unknown node|Invalid|ENOENT/.test(err.message) ? 404 : 400;
    if (!res.headersSent) send(res, status, { error: err.message });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log('Ramifold prototype (throwaway code)');
  console.log(`  Project folder: ${projectDir}`);
  console.log(`  Plans stored in: ${store.baseDir}`);
  console.log(`  Open: http://127.0.0.1:${PORT}`);
});
