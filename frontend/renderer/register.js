const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusEl = document.getElementById('status');
const resultEl = document.createElement('div');
document.body.appendChild(resultEl);

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

document.getElementById('btnEnroll').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const level = parseInt(document.getElementById('level').value, 10);

  if (!name || !password) {
    alert('Informe nome e senha');
    return;
  }

  const img = snapshotDataURL();
  resultEl.textContent = 'Cadastrando…';

  const res = await window.api.enroll(name, level, img, email, password);
  if (res.ok) {
    resultEl.textContent = `✅ Cadastrado: ${res.name} (nível ${res.level})`;
    // redireciona para login
    window.location.href = "login.html";
  } else {
    resultEl.textContent = `❌ Erro: ${res.error || 'desconhecido'}`;
  }
});

(async function boot() {
  const h = await window.api.health().catch(() => null);
  statusEl.textContent = h ? `API ok (${h.users} usuários)` : 'API indisponível';
  initCamera();
})();
