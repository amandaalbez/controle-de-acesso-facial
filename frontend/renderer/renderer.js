const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const accessEl = document.getElementById('access');

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    statusEl.textContent = 'Câmera pronta ✅';
  } catch (e) {
    statusEl.textContent = 'Erro ao acessar a câmera ❌';
    console.error(e);
  }
}

function snapshotDataURL() {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function setAccessUI(level, name) {
  if (!level) {
    accessEl.innerHTML = `<div class="level-0">Acesso negado.</div>`;
    return;
  }
  let html = '';
  if (level === 1) html = `<div class="level-1"><h3>Bem-vindo, ${name}</h3><p>📂 Nível 1: informações públicas.</p></div>`;
  if (level === 2) html = `<div class="level-2"><h3>Bem-vinda(o), ${name}</h3><p>🔒 Nível 2: dados restritos (diretores).</p></div>`;
  if (level === 3) html = `<div class="level-3"><h3>Bem-vinda(o), ${name}</h3><p>👑 Nível 3: acesso total (Ministro).</p></div>`;
  accessEl.innerHTML = html;
}

document.getElementById('btnAuth').addEventListener('click', async () => {
  const img = snapshotDataURL();
  resultEl.textContent = 'Autenticando…';
  const res = await window.api.auth(img);
  if (res.matched) {
    resultEl.textContent = `✅ Reconhecido: ${res.name} (nível ${res.level}) [dist=${res.distance?.toFixed(3)}]`;
    setAccessUI(res.level, res.name);
  } else {
    resultEl.textContent = '❌ Não reconhecido.';
    setAccessUI(0);
  }
});

document.getElementById('btnEnroll').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const level = parseInt(document.getElementById('level').value, 10);
  if (!name) { alert('Informe um nome'); return; }
  const img = snapshotDataURL();
  resultEl.textContent = 'Cadastrando…';
  const res = await window.api.enroll(name, level, img);
  if (res.ok) resultEl.textContent = `✅ Cadastrado: ${res.name} (nível ${res.level})`;
  else resultEl.textContent = `❌ Erro: ${res.error || 'desconhecido'}`;
});

(async function boot() {
  const h = await window.api.health().catch(() => null);
  statusEl.textContent = h ? `API ok (${h.registered} rostos)` : 'API indisponível';
  initCamera();
})();
