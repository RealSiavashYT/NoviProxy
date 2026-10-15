const $ = (s) => document.querySelector(s);
const DEFAULT_BYPASS = ['localhost', '127.0.0.1', '<local>'];

const state = { profiles: [], selectedId: null, bypass: DEFAULT_BYPASS.join('\n') };
let editingId = null;
let active = null;        // { host, port } وقتی SOCKS5 فعال است
let blockedByOther = false;

const save = () => chrome.storage.local.set(state);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- وضعیت پروکسی ---------- */
async function readStatus() {
  const cfg = await chrome.proxy.settings.get({ incognito: false });
  const v = cfg.value || {};
  const s = v.rules && v.rules.singleProxy;
  active = v.mode === 'fixed_servers' && s && s.scheme === 'socks5'
    ? { host: s.host, port: Number(s.port) } : null;
  blockedByOther = cfg.levelOfControl === 'controlled_by_other_extensions'
                || cfg.levelOfControl === 'not_controllable';
}

function selected() {
  return state.profiles.find((p) => p.id === state.selectedId) || null;
}
function isLive(p) {
  return active && active.host === p.host && active.port === p.port;
}

async function connect(p) {
  const bypassList = state.bypass.split('\n').map((x) => x.trim()).filter(Boolean);
  await chrome.proxy.settings.set({
    scope: 'regular',
    value: {
      mode: 'fixed_servers',
      rules: {
        singleProxy: { scheme: 'socks5', host: p.host, port: p.port },
        bypassList
      }
    }
  });
}
async function disconnect() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
}

/* ---------- رندر ---------- */
function render() {
  const hero = $('#hero');
  const power = $('#power');
  const title = $('#statusTitle');
  const sub = $('#statusSub');
  const warn = $('#warn');

  warn.hidden = !blockedByOther;
  if (blockedByOther) {
    warn.textContent = 'افزونه دیگری کنترل پروکسی را در دست دارد. آن را غیرفعال کن.';
  }

  if (blockedByOther) {
    hero.dataset.state = 'blocked';
    title.textContent = 'قابل تنظیم نیست';
    sub.textContent = '';
    power.setAttribute('aria-pressed', 'false');
  } else if (active) {
    const match = state.profiles.find(isLive);
    hero.dataset.state = 'on';
    title.textContent = 'وصل است';
    sub.textContent = (match ? match.name + ' · ' : '') + active.host + ':' + active.port;
    sub.dir = 'rtl';
    power.setAttribute('aria-pressed', 'true');
  } else {
    hero.dataset.state = 'off';
    title.textContent = 'قطع است';
    sub.textContent = selected()
      ? 'برای اتصال به «' + selected().name + '» دکمه را بزن'
      : 'یک سرور اضافه کن و دکمه را بزن';
    power.setAttribute('aria-pressed', 'false');
  }

  renderList();
  $('#empty').hidden = state.profiles.length > 0;
  $('#bypass').value = state.bypass;
}

function svgIcon(path) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '15'); svg.setAttribute('height', '15');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', path);
  svg.appendChild(p);
  return svg;
}

function renderList() {
  const ul = $('#list');
  ul.replaceChildren();
  for (const p of state.profiles) {
    const li = document.createElement('li');
    li.className = 'item' + (isLive(p) ? ' live' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(p.id === state.selectedId));
    li.tabIndex = 0;

    const dot = document.createElement('span'); dot.className = 'dot';
    const meta = document.createElement('div'); meta.className = 'meta';
    const b = document.createElement('b'); b.textContent = p.name;
    const s = document.createElement('span'); s.textContent = p.host + ':' + p.port;
    meta.append(b, s);

    const edit = document.createElement('button');
    edit.className = 'icon-btn'; edit.title = 'ویرایش'; edit.type = 'button';
    edit.appendChild(svgIcon('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'));
    edit.addEventListener('click', (e) => { e.stopPropagation(); openForm(p); });

    const del = document.createElement('button');
    del.className = 'icon-btn del'; del.title = 'حذف'; del.type = 'button';
    del.appendChild(svgIcon('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'));
    del.addEventListener('click', (e) => { e.stopPropagation(); removeProfile(p); });

    const pick = () => selectProfile(p);
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });

    li.append(dot, meta, edit, del);
    ul.appendChild(li);
  }
}

/* ---------- عملیات ---------- */
async function selectProfile(p) {
  state.selectedId = p.id;
  await save();
  // اگر وصل هستیم، مستقیم به سرور جدید سوییچ کن
  if (active && !blockedByOther) {
    await connect(p);
    await readStatus();
  }
  render();
}

async function removeProfile(p) {
  const wasLive = isLive(p);
  state.profiles = state.profiles.filter((x) => x.id !== p.id);
  if (state.selectedId === p.id) state.selectedId = state.profiles[0] ? state.profiles[0].id : null;
  await save();
  if (wasLive) await disconnect();
  await readStatus();
  render();
}

async function togglePower() {
  if (blockedByOther) return;
  const hero = $('#hero');
  if (active) {
    hero.dataset.state = 'busy';
    await disconnect();
  } else {
    const p = selected();
    if (!p) { openForm(null); return; }
    hero.dataset.state = 'busy';
    await connect(p);
  }
  await readStatus();
  render();
}

/* ---------- فرم ---------- */
function openForm(p) {
  editingId = p ? p.id : null;
  $('#formTitle').textContent = p ? 'ویرایش سرور' : 'سرور جدید';
  $('#name').value = p ? p.name : '';
  $('#host').value = p ? p.host : '';
  $('#port').value = p ? p.port : '';
  $('#formError').hidden = true;
  $('#formCard').hidden = false;
  $('#name').focus();
}
function closeForm() { $('#formCard').hidden = true; editingId = null; }

function showError(msg) {
  const e = $('#formError');
  e.textContent = msg; e.hidden = false;
}

async function saveProfile() {
  let host = $('#host').value.trim();
  let portStr = $('#port').value.trim();

  // اگر کاربر host:port را در یک فیلد چسباند
  const m = host.match(/^(?:socks5h?:\/\/)?([^\s:]+):(\d{1,5})$/i);
  if (m) { host = m[1]; if (!portStr) portStr = m[2]; }
  host = host.replace(/^socks5h?:\/\//i, '');

  const port = Number(portStr);
  if (!host || /\s/.test(host)) return showError('آدرس سرور را درست وارد کن.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) return showError('پورت باید عددی بین ۱ تا ۶۵۵۳۵ باشد.');

  const name = $('#name').value.trim() || host;
  const wasLive = editingId && isLive(state.profiles.find((x) => x.id === editingId) || {});

  if (editingId) {
    const p = state.profiles.find((x) => x.id === editingId);
    Object.assign(p, { name, host, port });
    state.selectedId = p.id;
    if (wasLive) await connect(p);
  } else {
    const p = { id: uid(), name, host, port };
    state.profiles.push(p);
    state.selectedId = p.id;
  }
  await save();
  await readStatus();
  closeForm();
  render();
}

/* ---------- نمایش IP ---------- */
async function showIp() {
  const out = $('#ipOut');
  out.className = 'ip'; out.textContent = '...';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: ctl.signal, cache: 'no-store' });
    const j = await r.json();
    out.textContent = j.ip;
  } catch {
    out.className = 'ip err';
    out.textContent = 'اتصال برقرار نشد';
  } finally { clearTimeout(t); }
}

/* ---------- شروع ---------- */
async function init() {
  const saved = await chrome.storage.local.get(state);
  Object.assign(state, saved);
  if (!state.selectedId && state.profiles[0]) state.selectedId = state.profiles[0].id;
  await readStatus();
  render();
  if (state.profiles.length === 0) openForm(null);

  $('#power').addEventListener('click', togglePower);
  $('#addBtn').addEventListener('click', () => openForm(null));
  $('#cancelBtn').addEventListener('click', closeForm);
  $('#saveBtn').addEventListener('click', saveProfile);
  $('#ipBtn').addEventListener('click', showIp);
  $('#saveBypass').addEventListener('click', async () => {
    state.bypass = $('#bypass').value;
    await save();
    if (active && selected()) await connect(selected());
    const b = $('#saveBypass'); const old = b.textContent;
    b.textContent = 'ذخیره شد'; setTimeout(() => (b.textContent = old), 1200);
  });
  ['name', 'host', 'port'].forEach((id) =>
    $('#' + id).addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProfile(); }));
}
init();
