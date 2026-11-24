#!/usr/bin/env node
// Stand-in for `claude -p --output-format stream-json` used by the tests and for
// clicking through the UI without a Claude login: RAMIFOLD_CLAUDE_CMD=test/fake-claude.js
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (prompt += c));
process.stdin.on('end', () => {
  const resumed = argValue('--resume');
  const sessionId = resumed && !args.includes('--fork-session') ? resumed : crypto.randomUUID();
  if (process.env.FAKE_CLAUDE_LOG) {
    fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, `${JSON.stringify({ args, prompt })}\n`);
  }
  const out = (o) => process.stdout.write(`${JSON.stringify({ ...o, session_id: sessionId })}\n`);

  if (resumed && resumed.startsWith('gone')) {
    out({ type: 'result', subtype: 'error_during_execution', is_error: true });
    return;
  }
  if (process.env.FAKE_CLAUDE_FAIL) {
    out({ type: 'result', is_error: true, result: 'Not logged in · Please run /login' });
    return;
  }

  let text;
  if (prompt.includes('Reply with ONLY a JSON object')) {
    text = 'Here you go:\n```json\n{"children":[{"title":"Chunking","mission":"Decide the chunking strategy."},{"title":"Embedding model","mission":"Pick an embedding model."}]}\n```';
  } else if (prompt.includes('Write the plan for THIS node')) {
    text = '## Goal\nFake plan.\n## Decisions\n- Use fake decisions.';
  } else {
    out({ type: 'system', subtype: 'init' });
    out({ type: 'assistant', message: { content: [{ type: 'server_tool_use', name: 'WebSearch', input: { query: 'embedding models 2026' } }] } });
    text = `Fake answer to: ${prompt}`;
  }
  for (const part of text.match(/.{1,20}/gs)) {
    out({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: part } } });
  }
  out({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
  out({ type: 'result', subtype: 'success', is_error: false, result: text });
});
