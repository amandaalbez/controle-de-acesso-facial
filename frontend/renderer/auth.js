const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");

if (!user) {
  // Se não tem usuário em sessão, volta para login
  alert("Faça login primeiro!");
  window.location.href = "login.html";
}

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
  if (level === 2) html = `<div class="level-2"><h3>Bem-vinda(o), ${name}</h3><p>🔒 Nível 2: dados restritos.</p></div>`;
  if (level === 3) html = `<div class="level-3"><h3>Bem-vinda(o), ${name}</h3><p>👑 Nível 3: acesso total.</p></div>`;
  accessEl.innerHTML = html;
}

document.getElementById('btnAuth').addEventListener('click', async () => {
  const img = snapshotDataURL();
  resultEl.textContent = 'Autenticando…';
  const res = await window.api.auth(img);

  if (res.matched) {
    // confere se o nome/ID corresponde ao usuário logado
    if (res.name === user.name) {
      resultEl.textContent = `✅ Reconhecido: ${res.name} (nível ${res.level})`;
      setAccessUI(res.level, res.name);
    } else {
      resultEl.textContent = `❌ Rosto não corresponde ao usuário logado (${user.name})`;
      setAccessUI(0);
    }
  } else {
    resultEl.textContent = '❌ Não reconhecido.';
    setAccessUI(0);
  }
});

(async function boot() {
  const h = await window.api.health().catch(() => null);
  statusEl.textContent = h ? `API ok (${h.users} usuários)` : 'API indisponível';
  initCamera();
})();
