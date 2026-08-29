const promptEl = document.getElementById('prompt');
const genBtn = document.getElementById('genBtn');
const logEl = document.getElementById('log');
const historyEl = document.getElementById('history');
const emptyState = document.getElementById('emptyState');
const previewFrame = document.getElementById('previewFrame');
const codeView = document.getElementById('codeView');
const tabs = document.getElementById('tabs');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const downloadBtn = document.getElementById('downloadBtn');

let history = []; // {prompt, code}
let activeIndex = -1;
let building = false;

document.getElementById('examples').addEventListener('click', (e) => {
  if (e.target.classList.contains('chip')) {
    promptEl.value = e.target.textContent;
    promptEl.focus();
  }
});

document.getElementById('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const which = tab.dataset.tab;
  previewFrame.classList.toggle('active', which === 'preview');
  codeView.classList.toggle('active', which === 'code');
});

function logLine(text, cls) {
  const div = document.createElement('div');
  div.className = 'line' + (cls ? ' ' + cls : '');
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  logEl.innerHTML = '';
}

function extractHtml(raw) {
  let s = raw.trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  if (!/^\s*<!doctype|^\s*<html/i.test(s)) {
    const idx = s.search(/<!doctype|<html/i);
    if (idx > 0) s = s.slice(idx);
  }
  return s;
}

function renderHistory() {
  historyEl.innerHTML = '';
  history.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'item' + (i === activeIndex ? ' active' : '');
    div.textContent = h.prompt;
    div.title = h.prompt;
    div.addEventListener('click', () => {
      if (building) return;
      activeIndex = i;
      showApp(h.code);
      renderHistory();
    });
    historyEl.appendChild(div);
  });
}

function showApp(code) {
  emptyState.style.display = 'none';
  tabs.style.display = 'flex';
  previewFrame.classList.add('active');
  previewFrame.srcdoc = code;
  codeView.textContent = code;
  statusDot.className = 'status-dot ready';
  statusText.textContent = 'build complete';
  downloadBtn.style.display = 'inline-block';
  downloadBtn.onclick = () => {
    const blob = new Blob([code], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-app.html';
    a.click();
    URL.revokeObjectURL(url);
  };
}

async function generate() {
  const prompt = promptEl.value.trim();
  if (!prompt || building) return;

  building = true;
  genBtn.disabled = true;
  genBtn.textContent = 'Building…';
  statusDot.className = 'status-dot busy';
  statusText.textContent = 'generating…';
  clearLog();
  logLine('> parsing prompt');
  logLine('> ' + prompt);
  logLine('> sending spec to backend');

  try {
    // Calls our own server (see server.js), which holds the API key
    // and forwards the request to Anthropic. Never call api.anthropic.com
    // directly from browser JS in a deployed app - it will expose your key.
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || ("Request failed with status " + response.status));
    }

    logLine('> streaming generation');
    const data = await response.json();
    const code = extractHtml(data.html || '');

    if (!code || code.length < 20) {
      throw new Error("Generated output did not look like valid HTML");
    }

    logLine('> validating output', 'ok');
    logLine('> mounting app in preview', 'ok');
    logLine('> done.', 'ok');

    history.push({ prompt, code });
    activeIndex = history.length - 1;
    renderHistory();
    showApp(code);

  } catch (err) {
    logLine('> error: ' + err.message, 'err');
    statusDot.className = 'status-dot';
    statusText.textContent = 'build failed';
  } finally {
    building = false;
    genBtn.disabled = false;
    genBtn.textContent = 'Generate app';
  }
}

genBtn.addEventListener('click', generate);
promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
});
