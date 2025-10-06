console.log("auth.js carregado");

document.addEventListener('DOMContentLoaded', () => {
  const userInfo = document.getElementById('userInfo');
  const video = document.getElementById('camera');
  const canvas = document.getElementById('canvas');
  const btnAuth = document.getElementById('btnAuth');
  const btnLogout = document.getElementById('btnLogout');
  const result = document.getElementById('result');

  const stored = sessionStorage.getItem('currentUser');
  if (!stored) {
    alert('Usuário não logado. Redirecionando ao login.');
    location.href = 'login.html';
    return;
  }
  const currentUser = JSON.parse(stored);
  userInfo.textContent = `Usuário: ${currentUser.name} — Nível previsto: ${currentUser.level}`;

  // start camera
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => { result.textContent = 'Erro ao acessar câmera'; console.error(err); });

  btnAuth.addEventListener('click', async () => {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);

    result.textContent = 'Validando...';
    try {
      const res = await window.api.auth(dataURL);
      if (res.matched) {
        result.textContent = `✅ Autenticado: ${res.name} (nível ${res.level}) — confidence: ${res.confidence?.toFixed?.(2) || 'N/A'}`;
        // redireciona conforme o nível
        if (res.level === 1) location.href = 'level1.html';
        else if (res.level === 2) location.href = 'level2.html';
        else if (res.level === 3) location.href = 'level3.html';
        else location.href = 'level1.html';
      } else {
        result.textContent = res.reason || 'Rosto não correspondido';
      }
    } catch (err) {
      console.error(err);
      result.textContent = 'Erro ao conectar com servidor';
    }
  });

  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    location.href = 'login.html';
  });
});
