'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { Store } = require('../lib/store');
const { buildNodeContext } = require('../lib/context');
const { parseSuggestions, buildArgs } = require('../lib/claude');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ramifold-test-'));
}

// Invented example tree: RAG > 2 Retrieval > 2.2 Embedding model, with siblings.
function exampleTree(store) {
  const plan = store.createPlan('Own productive RAG', 'Plan a self-hosted RAG system.');
  const root = plan.rootId;
  const p = plan.id;
  const sources = store.addChild(p, root, 'Data sources', 'Which sources are ingested?');
  const retrieval = store.addChild(p, root, 'Retrieval', 'How are documents retrieved?');
  const chunking = store.addChild(p, retrieval.id, 'Chunking', 'Decide chunk size and overlap.');
  const embedding = store.addChild(p, retrieval.id, 'Embedding model', 'Pick the embedding model.');
  const reranking = store.addChild(p, retrieval.id, 'Reranking', 'Decide whether to rerank.');
  store.editNode(p, root, { status: 'concept', result: 'ROOT-CONCEPT: local first.' });
  store.editNode(p, retrieval.id, { status: 'final', result: 'RETRIEVAL-PLAN: hybrid search.' });
  store.editNode(p, sources.id, { status: 'final', result: 'SOURCES-PLAN: wiki only.' });
  store.editNode(p, chunking.id, { status: 'final', result: 'CHUNKING-PLAN: 512 tokens.' });
  store.appendChat(p, retrieval.id, { role: 'user', text: 'SECRET-CHAT-OF-RETRIEVAL' });
  store.appendChat(p, chunking.id, { role: 'user', text: 'SECRET-CHAT-OF-CHUNKING' });
  return { p, root, sources, retrieval, chunking, embedding, reranking };
}

test('context of a node: ancestors with mission and result, siblings with title and mission, never chats', () => {
  const store = new Store(tmpDir());
  const t = exampleTree(store);
  const ctx = buildNodeContext(store.loadPlan(t.p), t.embedding.id);

  assert.match(ctx, /Plan a self-hosted RAG system\./);
  assert.match(ctx, /ROOT-CONCEPT: local first\./);
  assert.match(ctx, /RETRIEVAL-PLAN: hybrid search\./);
  assert.match(ctx, /THIS NODE: 2\.2 Embedding model/);
  assert.match(ctx, /2\.1 Chunking: Decide chunk size and overlap\./);
  assert.match(ctx, /2\.3 Reranking: Decide whether to rerank\./);
  // Siblings contribute title and mission only, not their results.
  assert.doesNotMatch(ctx, /CHUNKING-PLAN/);
  // Neither ancestors' uncle results nor any chat leak in.
  assert.doesNotMatch(ctx, /SOURCES-PLAN/);
  assert.doesNotMatch(ctx, /SECRET-CHAT/);
});

test('context of a parent includes the fixed plans of its children (flow back up)', () => {
  const store = new Store(tmpDir());
  const t = exampleTree(store);
  const ctx = buildNodeContext(store.loadPlan(t.p), t.retrieval.id);
  assert.match(ctx, /2\.1 Chunking \(FIXED PLAN\)[\s\S]*CHUNKING-PLAN: 512 tokens\./);
  assert.match(ctx, /2\.2 Embedding model \(not fixed yet\)/);
  assert.doesNotMatch(ctx, /SECRET-CHAT/);
});

test('parent is flagged when a child plan was fixed after the parent result', () => {
  const store = new Store(tmpDir());
  const t = exampleTree(store);
  const { hasNewChildPlans } = require('../lib/tree');
  // chunking was fixed after retrieval's result in exampleTree
  assert.strictEqual(hasNewChildPlans(store.loadPlan(t.p), t.retrieval.id), true);
  store.editNode(t.p, t.retrieval.id, { status: 'final', result: 'RETRIEVAL-PLAN v2' });
  assert.strictEqual(hasNewChildPlans(store.loadPlan(t.p), t.retrieval.id), false);
});

test('export renders the whole tree as one Markdown document and writes PLAN.md', () => {
  const store = new Store(tmpDir());
  const t = exampleTree(store);
  store.editNode(t.p, t.embedding.id, { status: 'final', result: '## Decisions\n- Use model X' });
  const md = store.exportMarkdown(t.p);
  assert.match(md, /^# Own productive RAG$/m);
  assert.match(md, /^## 2 Retrieval$/m);
  assert.match(md, /^### 2\.2 Embedding model$/m);
  assert.match(md, /^#### Decisions$/m, 'result headings are nested below the node heading');
  assert.match(md, /4 of 6 nodes fixed/);
  assert.doesNotMatch(md, /SECRET-CHAT/);
  assert.ok(fs.existsSync(path.join(store.planDir(t.p), 'PLAN.md')));
});

test('deleting a node removes its subtree and chats', () => {
  const store = new Store(tmpDir());
  const t = exampleTree(store);
  store.deleteNode(t.p, t.retrieval.id);
  const plan = store.loadPlan(t.p);
  assert.strictEqual(plan.nodes[t.chunking.id], undefined);
  assert.ok(!fs.existsSync(store.chatFile(t.p, t.chunking.id)));
  assert.deepStrictEqual(plan.nodes[t.root].children, [t.sources.id]);
});

test('suggestions are parsed from fenced or bare JSON and rejected otherwise', () => {
  assert.deepStrictEqual(parseSuggestions('x ```json\n{"children":[{"title":"A","mission":"m"}]}\n``` y'), [{ title: 'A', mission: 'm' }]);
  assert.deepStrictEqual(parseSuggestions('[{"title":"B"}]'.replace(/^/, '{"children":') + '}'), [{ title: 'B', mission: '' }]);
  assert.throws(() => parseSuggestions('no json here'), /no readable list/);
});

// ---------- end-to-end through the HTTP server with a fake `claude` ----------

async function startServer(env = {}) {
  const projectDir = tmpDir();
  const log = path.join(projectDir, 'claude-calls.ndjson');
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js'), projectDir], {
    env: { ...process.env, PORT: String(port), RAMIFOLD_CLAUDE_CMD: path.join(__dirname, 'fake-claude.js'), FAKE_CLAUDE_LOG: log, ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve) => proc.stdout.on('data', (d) => String(d).includes('Open:') && resolve()));
  const base = `http://127.0.0.1:${port}`;
  const req = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    const text = await res.text();
    if (res.headers.get('content-type').includes('ndjson')) return { status: res.status, events: text.trim().split('\n').map((l) => JSON.parse(l)) };
    return { status: res.status, ...JSON.parse(text) };
  };
  const calls = () => fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  return { proc, projectDir, req, calls, base };
}

test('end-to-end: create plan, chat with tools, suggest and accept children, summarize, fix, export', async (t) => {
  const s = await startServer();
  t.after(() => s.proc.kill());

  const plan = await s.req('POST', '/api/plans', { title: 'Own productive RAG', mission: 'Plan a RAG.' });
  assert.strictEqual(plan.status, 201);
  const root = plan.rootId;

  // Chat: streams a tool event and text, stores the session for --resume.
  const chat1 = await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/chat`, { message: 'ROOT-CHAT-MESSAGE' });
  assert.ok(chat1.events.some((e) => e.type === 'tool' && e.name === 'WebSearch'));
  assert.ok(chat1.events.some((e) => e.type === 'delta'));
  assert.strictEqual(chat1.events.at(-1).type, 'done');
  let view = await s.req('GET', `/api/plans/${plan.id}`);
  const session = view.nodes[root].sessionId;
  assert.ok(session);
  await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/chat`, { message: 'second' });
  const second = s.calls().at(-1);
  assert.strictEqual(second.args[second.args.indexOf('--resume') + 1], session);
  assert.ok(second.args.includes('WebSearch,WebFetch,Read,Glob,Grep'));

  // Suggestions get the node chat explicitly in a fresh session and do not touch the node chat.
  const sug = await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/suggest`);
  const suggestions = sug.events.at(-1).suggestions;
  assert.strictEqual(suggestions.length, 2);
  assert.ok(!s.calls().at(-1).args.includes('--resume'));
  assert.match(s.calls().at(-1).prompt, /ROOT-CHAT-MESSAGE/);
  view = await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/children`, { children: suggestions });
  const [chunk, embed] = view.nodes[root].children;
  assert.strictEqual(view.nodes[embed].number, '2');

  // Child chat gets root context and sibling mission, never the root chat.
  await s.req('POST', `/api/plans/${plan.id}/nodes/${embed}/chat`, { message: 'hello child' });
  const childCall = s.calls().at(-1);
  // The context travels in a file, never on the command line (Windows cmd.exe caps it at 8191 chars).
  assert.ok(!childCall.args.includes('--append-system-prompt'));
  assert.ok(childCall.args.join(' ').length < 1000, 'command line stays short');
  const sys = childCall.system;
  assert.match(sys, /Plan a RAG\./);
  assert.match(sys, /1 Chunking: Decide the chunking strategy\./);
  assert.doesNotMatch(sys, /ROOT-CHAT-MESSAGE/);
  assert.ok(!childCall.args.includes('--resume'), 'a new node starts a new session');

  // Summarize, fix, flow back up into the parent's context.
  const sum = await s.req('POST', `/api/plans/${plan.id}/nodes/${embed}/summarize`);
  assert.match(sum.events.at(-1).text, /## Goal/);
  view = await s.req('PATCH', `/api/plans/${plan.id}/nodes/${embed}`, { status: 'final', result: 'EMBED-FIXED-PLAN' });
  assert.strictEqual(view.nodes[embed].status, 'final');
  const rootCtx = await s.req('GET', `/api/plans/${plan.id}/nodes/${root}/context`);
  assert.match(rootCtx.context, /EMBED-FIXED-PLAN/);

  const chat = await s.req('GET', `/api/plans/${plan.id}/nodes/${root}/chat`);
  assert.deepStrictEqual(chat.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.strictEqual(chat.messages[1].tools[0].name, 'WebSearch');

  const exp = await s.req('POST', `/api/plans/${plan.id}/export`);
  assert.match(exp.markdown, /## 2 Embedding model[\s\S]*EMBED-FIXED-PLAN/);
  assert.ok(fs.existsSync(path.join(s.projectDir, 'ramifold', plan.id, 'PLAN.md')));
  assert.ok(chunk);
});

test('end-to-end: summarize gets the node chat explicitly and works without any chat', async (t) => {
  const s = await startServer();
  t.after(() => s.proc.kill());
  const plan = await s.req('POST', '/api/plans', { title: 'X', mission: 'ROOT-MISSION' });
  const root = plan.rootId;

  // A node without chat (e.g. a parent that only bundles its children) still gets a plan.
  await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/summarize`);
  let call = s.calls().at(-1);
  assert.ok(!call.args.includes('--resume'), 'summary must not depend on a hidden Claude session');
  assert.match(call.prompt, /no conversation in this node yet/i);
  assert.match(call.prompt, /Do not ask/);

  // With a chat, the stored node chat is handed over verbatim.
  await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/chat`, { message: 'CHAT-DECISION-42' });
  await s.req('POST', `/api/plans/${plan.id}/nodes/${root}/summarize`);
  call = s.calls().at(-1);
  assert.ok(!call.args.includes('--resume'));
  assert.match(call.prompt, /CHAT-DECISION-42[\s\S]*Write the plan for THIS node/);
  const chat = await s.req('GET', `/api/plans/${plan.id}/nodes/${root}/chat`);
  assert.strictEqual(chat.messages.length, 2, 'summarizing leaves the chat untouched');
});

test('end-to-end: Claude errors are shown and stored, foreign origins are rejected', async (t) => {
  const s = await startServer({ FAKE_CLAUDE_FAIL: '1' });
  t.after(() => s.proc.kill());
  const plan = await s.req('POST', '/api/plans', { title: 'X' });
  const res = await s.req('POST', `/api/plans/${plan.id}/nodes/${plan.rootId}/chat`, { message: 'hi' });
  assert.match(res.events.at(-1).message, /Not logged in/);
  const chat = await s.req('GET', `/api/plans/${plan.id}/nodes/${plan.rootId}/chat`);
  assert.strictEqual(chat.messages.at(-1).role, 'error');

  const evil = await fetch(`${s.base}/api/plans`, { headers: { Origin: 'http://evil.example' } });
  assert.strictEqual(evil.status, 403);
});

test('end-to-end: a lost Claude session falls back to a new one with the node chat as history', async (t) => {
  const s = await startServer();
  t.after(() => s.proc.kill());
  const plan = await s.req('POST', '/api/plans', { title: 'X' });
  await s.req('POST', `/api/plans/${plan.id}/nodes/${plan.rootId}/chat`, { message: 'FIRST-MESSAGE' });
  const store = new Store(s.projectDir);
  store.setSession(plan.id, plan.rootId, 'gone-session');

  const res = await s.req('POST', `/api/plans/${plan.id}/nodes/${plan.rootId}/chat`, { message: 'second' });
  assert.strictEqual(res.events.at(-1).type, 'done');
  const retry = s.calls().at(-1);
  assert.ok(!retry.args.includes('--resume'));
  assert.match(retry.prompt, /FIRST-MESSAGE[\s\S]*second$/);
  const view = await s.req('GET', `/api/plans/${plan.id}`);
  assert.notStrictEqual(view.nodes[plan.rootId].sessionId, 'gone-session');
});

test('command line stays short and safe for cmd.exe however long the node context is', () => {
  const args = buildArgs({ systemPromptFile: 'C:\\Users\\Max Muster\\AppData\\Local\\Temp\\rf-1\\context.md', sessionId: 'abc' }, 'win32');
  assert.ok(args.includes('"C:\\Users\\Max Muster\\AppData\\Local\\Temp\\rf-1\\context.md"'), 'paths with spaces are quoted');
  assert.ok(args.includes('"--append-system-prompt-file"'));
  assert.ok(args.every((a) => a.startsWith('"') && a.endsWith('"')));
  const posix = buildArgs({ systemPromptFile: '/tmp/x/context.md' }, 'linux');
  assert.strictEqual(posix[posix.indexOf('--append-system-prompt-file') + 1], '/tmp/x/context.md');
});
