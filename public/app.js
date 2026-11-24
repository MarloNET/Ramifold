// Ramifold prototype UI – throwaway code, plain browser JS without build step.
'use strict';

const $ = (sel) => document.querySelector(sel);
const STATUS_LABEL = { open: 'offen', concept: 'Konzept', final: 'festgelegt' };

const state = { planId: null, plan: null, nodeId: null, suggestions: [] };

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// Reads an NDJSON stream of Claude events; returns the final 'done' event.
async function stream(url, body, onEvent) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const ev = JSON.parse(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
      if (ev.type === 'error') throw new Error(ev.message);
      if (ev.type === 'done') final = ev;
      else onEvent(ev);
    }
  }
  if (!final) throw new Error('Keine Antwort erhalten.');
  return final;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Minimal Markdown: code blocks, headings, lists, bold, inline code, links. Input is escaped first.
function renderMarkdown(text) {
  const parts = escapeHtml(text).split(/```[a-z]*\n?/);
  return parts
    .map((part, i) => {
      if (i % 2) return `<pre>${part}</pre>`;
      return part
        .split(/\n{2,}/)
        .map((block) => {
          const inline = (s) =>
            s
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/`([^`]+)`/g, '<code>$1</code>')
              .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
          const lines = block.split('\n');
          if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l) || !l.trim())) {
            return `<ul>${lines.filter((l) => l.trim()).map((l) => `<li>${inline(l.replace(/^\s*([-*]|\d+\.)\s/, ''))}</li>`).join('')}</ul>`;
          }
          const h = block.match(/^(#{1,6})\s+(.*)$/);
          if (h && lines.length === 1) return `<p><strong>${inline(h[2])}</strong></p>`;
          return `<p>${lines.map(inline).join('<br>')}</p>`;
        })
        .join('');
    })
    .join('');
}

// ---------- plans and tree ----------

async function loadPlans(selectId) {
  const data = await call('GET', '/api/plans');
  const select = $('#plan-select');
  select.innerHTML = data.plans.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  const id = selectId || localStorage.getItem('ramifold.plan') || (data.plans[0] && data.plans[0].id);
  if (id && data.plans.some((p) => p.id === id)) {
    select.value = id;
    await openPlan(id);
  } else {
    $('#empty').hidden = false;
    $('#node').hidden = true;
  }
}

async function openPlan(planId) {
  state.planId = planId;
  localStorage.setItem('ramifold.plan', planId);
  setPlan(await call('GET', `/api/plans/${planId}`));
  const remembered = localStorage.getItem(`ramifold.node.${planId}`);
  await openNode(state.plan.nodes[remembered] ? remembered : state.plan.rootId);
}

function setPlan(plan) {
  state.plan = plan;
  renderTree();
  const nodes = Object.values(plan.nodes);
  const fixed = nodes.filter((n) => n.status === 'final').length;
  const depth = Math.max(...nodes.map((n) => (n.number ? n.number.split('.').length : 0)));
  $('#progress').textContent = `${nodes.length} Knoten · ${fixed} festgelegt · ${depth} Ebenen unter dem Vorhaben`;
}

function renderTree() {
  const { nodes, rootId } = state.plan;
  const item = (id) => {
    const n = nodes[id];
    const dot = `<span class="dot ${n.status}${n.busy ? ' busy' : ''}" title="${STATUS_LABEL[n.status]}"></span>`;
    const kids = n.children.length ? `<ul>${n.children.map(item).join('')}</ul>` : '';
    return `<li><a data-id="${id}" class="${id === state.nodeId ? 'active' : ''}">${dot}<span class="num">${n.number}</span><span>${escapeHtml(n.title)}</span></a>${kids}</li>`;
  };
  $('#tree').innerHTML = `<ul>${item(rootId)}</ul>`;
}

// ---------- node panel ----------

async function openNode(nodeId) {
  state.nodeId = nodeId;
  localStorage.setItem(`ramifold.node.${state.planId}`, nodeId);
  state.suggestions = [];
  $('#suggestions').hidden = true;
  $('#context-view').hidden = true;
  renderTree();
  renderNode();
  const { messages } = await call('GET', `/api/plans/${state.planId}/nodes/${nodeId}/chat`);
  if (state.nodeId === nodeId) renderMessages(messages);
}

function currentNode() {
  return state.plan.nodes[state.nodeId];
}

function renderNode() {
  const n = currentNode();
  $('#empty').hidden = true;
  $('#node').hidden = false;
  $('#node-number').textContent = n.number;
  $('#node-title').value = n.title;
  $('#node-mission').value = n.mission;
  const status = $('#node-status');
  status.textContent = STATUS_LABEL[n.status];
  status.className = `status ${n.status}`;
  $('#result').value = n.result;
  $('#stale-hint').hidden = !n.newChildPlans;
  $('#delete-btn').hidden = !n.parentId;
  $('#up-btn').hidden = $('#down-btn').hidden = !n.parentId;
  $('#reopen-btn').hidden = n.status === 'open';
  $('#children').innerHTML = n.children
    .map((id) => {
      const c = state.plan.nodes[id];
      return `<li><a data-id="${id}">${c.number} ${escapeHtml(c.title)}</a> <span class="small">(${STATUS_LABEL[c.status]})</span></li>`;
    })
    .join('') || '<li class="small">Noch keine Unterpunkte.</li>';
}

function messageHtml(m) {
  const tools = m.tools && m.tools.length
    ? `<div class="tools">${m.tools.map((t) => `🔧 ${escapeHtml(t.name)}${t.detail ? `: ${escapeHtml(t.detail)}` : ''}`).join('<br>')}</div>`
    : '';
  return `<div class="msg ${m.role}">${tools}${renderMarkdown(m.text || '')}</div>`;
}

function renderMessages(messages) {
  const box = $('#messages');
  box.innerHTML = messages.length
    ? messages.map(messageHtml).join('')
    : '<p class="small">Neuer Chat. Die KI kennt Auftrag und Ergebnisse von oben sowie die Geschwister – du musst nichts neu erklären.</p>';
  box.scrollTop = box.scrollHeight;
}

function setBusy(busy) {
  for (const id of ['#chat-send', '#summarize-btn', '#suggest-btn']) $(id).disabled = busy;
}

async function refreshPlan() {
  setPlan(await call('GET', `/api/plans/${state.planId}`));
  renderNode();
}

async function guarded(fn) {
  try {
    await fn();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- actions ----------

async function sendChat(event) {
  event.preventDefault();
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  const nodeId = state.nodeId;
  input.value = '';
  const box = $('#messages');
  if (box.querySelector('p.small')) box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', messageHtml({ role: 'user', text }));
  box.insertAdjacentHTML('beforeend', '<div class="msg assistant live"><div class="tools"></div><div class="body">…</div></div>');
  const live = box.lastElementChild;
  let raw = '';
  setBusy(true);
  try {
    await stream(`/api/plans/${state.planId}/nodes/${nodeId}/chat`, { message: text }, (ev) => {
      if (ev.type === 'delta') {
        raw += ev.text;
        live.querySelector('.body').innerHTML = renderMarkdown(raw);
      } else if (ev.type === 'tool') {
        live.querySelector('.tools').insertAdjacentHTML('beforeend', `🔧 ${escapeHtml(ev.name)}${ev.detail ? `: ${escapeHtml(ev.detail)}` : ''}<br>`);
        raw += raw ? '\n\n' : '';
      }
      box.scrollTop = box.scrollHeight;
    });
  } catch (err) {
    box.insertAdjacentHTML('beforeend', messageHtml({ role: 'error', text: err.message }));
  } finally {
    setBusy(false);
  }
  if (state.nodeId === nodeId) {
    const { messages } = await call('GET', `/api/plans/${state.planId}/nodes/${nodeId}/chat`);
    renderMessages(messages);
  }
  await refreshPlan();
}

async function summarize() {
  const btn = $('#summarize-btn');
  const nodeId = state.nodeId;
  setBusy(true);
  btn.textContent = 'KI fasst zusammen …';
  try {
    const out = await stream(`/api/plans/${state.planId}/nodes/${nodeId}/summarize`, {}, () => {});
    if (state.nodeId === nodeId) {
      $('#result').value = out.text;
      alert('Zusammenfassung eingefügt. Bitte prüfen und dann als Konzept speichern oder festlegen.');
    }
  } finally {
    setBusy(false);
    btn.textContent = 'KI fasst zusammen';
  }
}

async function saveResult(status) {
  const result = $('#result').value;
  if (status !== 'open' && !result.trim()) throw new Error('Das Ergebnis ist leer.');
  setPlan(await call('PATCH', `/api/plans/${state.planId}/nodes/${state.nodeId}`, { status, result }));
  renderNode();
}

async function suggest() {
  const btn = $('#suggest-btn');
  const nodeId = state.nodeId;
  setBusy(true);
  btn.textContent = 'KI denkt nach …';
  try {
    const out = await stream(`/api/plans/${state.planId}/nodes/${nodeId}/suggest`, {}, () => {});
    if (state.nodeId !== nodeId) return;
    state.suggestions = out.suggestions;
    $('#suggestion-list').innerHTML = out.suggestions
      .map(
        (s, i) => `<div class="suggestion"><input type="checkbox" checked data-i="${i}" aria-label="übernehmen">
          <div class="fields"><input data-field="title" data-i="${i}" value="${escapeHtml(s.title)}">
          <textarea data-field="mission" data-i="${i}" rows="2">${escapeHtml(s.mission)}</textarea></div></div>`,
      )
      .join('');
    $('#suggestions').hidden = false;
  } finally {
    setBusy(false);
    btn.textContent = 'KI schlägt Unterpunkte vor';
  }
}

async function acceptSuggestions() {
  const children = [];
  for (const box of document.querySelectorAll('#suggestion-list input[type=checkbox]')) {
    if (!box.checked) continue;
    const i = box.dataset.i;
    children.push({
      title: document.querySelector(`[data-field=title][data-i="${i}"]`).value,
      mission: document.querySelector(`[data-field=mission][data-i="${i}"]`).value,
    });
  }
  if (!children.length) return;
  setPlan(await call('POST', `/api/plans/${state.planId}/nodes/${state.nodeId}/children`, { children }));
  $('#suggestions').hidden = true;
  renderNode();
}

async function addChild() {
  const title = prompt('Titel des Unterpunkts:');
  if (!title) return;
  const mission = prompt('Auftrag (was dort zu klären ist):') || '';
  setPlan(await call('POST', `/api/plans/${state.planId}/nodes/${state.nodeId}/children`, { title, mission }));
  renderNode();
}

async function saveMeta() {
  setPlan(await call('PATCH', `/api/plans/${state.planId}/nodes/${state.nodeId}`, {
    title: $('#node-title').value,
    mission: $('#node-mission').value,
  }));
  renderNode();
}

async function deleteNode() {
  const n = currentNode();
  if (!confirm(`„${n.number} ${n.title}“ mit allen Unterpunkten und Chats löschen?`)) return;
  const parentId = n.parentId;
  setPlan(await call('DELETE', `/api/plans/${state.planId}/nodes/${n.id}`));
  await openNode(parentId);
}

async function move(delta) {
  setPlan(await call('POST', `/api/plans/${state.planId}/nodes/${state.nodeId}/move`, { delta }));
  renderNode();
}

async function toggleContext() {
  const view = $('#context-view');
  if (!view.hidden) {
    view.hidden = true;
    return;
  }
  const { context } = await call('GET', `/api/plans/${state.planId}/nodes/${state.nodeId}/context`);
  view.textContent = context;
  view.hidden = false;
}

async function exportPlan() {
  const { markdown, file } = await call('POST', `/api/plans/${state.planId}/export`);
  $('#export-file').textContent = `Gespeichert in ${file}`;
  $('#export-text').value = markdown;
  $('#export-dialog').showModal();
}

// ---------- wiring ----------

$('#tree').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-id]');
  if (a) guarded(() => openNode(a.dataset.id));
});
$('#children').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-id]');
  if (a) guarded(() => openNode(a.dataset.id));
});
$('#plan-select').addEventListener('change', (e) => guarded(() => openPlan(e.target.value)));
$('#new-plan-btn').addEventListener('click', () => $('#new-plan-dialog').showModal());
$('#new-plan-dialog').addEventListener('close', () => {
  const dialog = $('#new-plan-dialog');
  const form = $('#new-plan-form');
  if (dialog.returnValue === 'ok') {
    guarded(async () => {
      const plan = await call('POST', '/api/plans', { title: form.title.value, mission: form.mission.value });
      form.reset();
      await loadPlans(plan.id);
    });
  }
});
$('#chat-form').addEventListener('submit', (e) => guarded(() => sendChat(e)));
$('#chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#chat-form').requestSubmit();
});
$('#summarize-btn').addEventListener('click', () => guarded(summarize));
$('#save-concept-btn').addEventListener('click', () => guarded(() => saveResult('concept')));
$('#finalize-btn').addEventListener('click', () => guarded(() => saveResult('final')));
$('#reopen-btn').addEventListener('click', () => guarded(() => saveResult('open')));
$('#suggest-btn').addEventListener('click', () => guarded(suggest));
$('#accept-suggestions-btn').addEventListener('click', () => guarded(acceptSuggestions));
$('#discard-suggestions-btn').addEventListener('click', () => ($('#suggestions').hidden = true));
$('#add-child-btn').addEventListener('click', () => guarded(addChild));
$('#save-meta-btn').addEventListener('click', () => guarded(saveMeta));
$('#delete-btn').addEventListener('click', () => guarded(deleteNode));
$('#up-btn').addEventListener('click', () => guarded(() => move(-1)));
$('#down-btn').addEventListener('click', () => guarded(() => move(1)));
$('#context-btn').addEventListener('click', () => guarded(toggleContext));
$('#export-btn').addEventListener('click', () => guarded(exportPlan));
$('#copy-export-btn').addEventListener('click', () => navigator.clipboard.writeText($('#export-text').value));
$('#close-export-btn').addEventListener('click', () => $('#export-dialog').close());

guarded(() => loadPlans());
