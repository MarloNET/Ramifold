// Runs Claude Code headless (`claude -p`) with the user's own login and tools.
// One process per request; the node's chat continues via --resume <sessionId>.
'use strict';

const { spawn } = require('child_process');

const CLAUDE_CMD = process.env.RAMIFOLD_CLAUDE_CMD || 'claude';
// Read-only planning tools: web research plus reading the project codebase.
const ALLOWED_TOOLS = process.env.RAMIFOLD_ALLOWED_TOOLS || 'WebSearch,WebFetch,Read,Glob,Grep';
const DISALLOWED_TOOLS = 'Edit,Write,NotebookEdit,Bash';

function buildArgs({ systemPrompt, sessionId, fork }) {
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--allowedTools', ALLOWED_TOOLS,
    '--disallowedTools', DISALLOWED_TOOLS,
    '--append-system-prompt', systemPrompt,
  ];
  if (sessionId) args.push('--resume', sessionId);
  if (sessionId && fork) args.push('--fork-session');
  if (process.env.RAMIFOLD_MODEL) args.push('--model', process.env.RAMIFOLD_MODEL);
  return args;
}

function describeTool(block) {
  const input = block.input || {};
  const detail = input.query || input.url || input.file_path || input.pattern || input.path || '';
  return { name: block.name, detail: String(detail).slice(0, 200) };
}

// onEvent receives {type:'delta', text} | {type:'tool', name, detail}.
// Resolves with {text, sessionId}; rejects with an Error carrying a readable message.
function runClaude({ cwd, systemPrompt, prompt, sessionId, fork = false, onEvent = () => {} }) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    // Started from inside a Claude Code session, the child must not think it is nested.
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    let child;
    try {
      child = spawn(CLAUDE_CMD, buildArgs({ systemPrompt, sessionId, fork }), {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      });
    } catch (err) {
      reject(new Error(`Claude Code could not be started (${CLAUDE_CMD}): ${err.message}`));
      return;
    }

    const texts = [];
    let current = '';
    let newSessionId = null;
    let result = null;
    let stderr = '';
    let buffer = '';

    const handle = (msg) => {
      if (msg.session_id) newSessionId = msg.session_id;
      if (msg.type === 'stream_event') {
        const ev = msg.event || {};
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
          current += ev.delta.text;
          onEvent({ type: 'delta', text: ev.delta.text });
        }
      } else if (msg.type === 'assistant' && msg.message) {
        let sawText = false;
        for (const block of msg.message.content || []) {
          if (block.type === 'text' && block.text) {
            texts.push(block.text);
            sawText = true;
          } else if (block.type === 'tool_use' || block.type === 'server_tool_use') {
            onEvent({ type: 'tool', ...describeTool(block) });
          }
        }
        if (sawText) current = '';
      } else if (msg.type === 'result') {
        result = msg;
      }
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          handle(JSON.parse(line));
        } catch {
          // Ignore non-JSON noise on stdout.
        }
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      const hint = err.code === 'ENOENT' ? ' Is Claude Code installed and `claude` on the PATH?' : '';
      reject(new Error(`Claude Code could not be started (${CLAUDE_CMD}): ${err.message}.${hint}`));
    });

    child.on('close', (code) => {
      if (result && result.is_error) {
        reject(new Error(`Claude Code: ${result.result || result.subtype || 'error'}`));
        return;
      }
      if (!result) {
        reject(new Error(`Claude Code ended without a result (exit ${code}). ${stderr.trim().slice(-500)}`));
        return;
      }
      if (current) texts.push(current);
      const text = texts.join('\n\n').trim() || String(result.result || '').trim();
      resolve({ text, finalText: String(result.result || text).trim(), sessionId: newSessionId });
    });

    child.stdin.end(prompt);
  });
}

// Extracts {"children":[...]} from a model answer that may be wrapped in prose or code fences.
function parseSuggestions(text) {
  const candidates = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) candidates.push(fence[1]);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  for (const c of candidates) {
    try {
      const data = JSON.parse(c);
      const list = Array.isArray(data) ? data : data.children;
      if (Array.isArray(list)) {
        return list
          .filter((x) => x && x.title)
          .map((x) => ({ title: String(x.title).trim(), mission: String(x.mission || '').trim() }));
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error('The AI answer contained no readable list of sub-points. Please try again.');
}

module.exports = { runClaude, parseSuggestions, buildArgs };
