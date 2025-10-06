console.log("register.js carregado");

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('camera');
  const canvas = document.getElementById('snapshot');
  const btnCapture = document.getElementById('btnCapture');
  const form = document.getElementById('registerForm');
  const msg = document.getElementById('msg');
  const btnBack = document.getElementById('btnBack');

  let currentDataURL = null;

  // start camera
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => { msg.textContent = 'Erro ao acessar câmera'; console.error(err); });

  btnCapture.addEventListener('click', () => {
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    currentDataURL = canvas.toDataURL('image/jpeg', 0.9);
    msg.textContent = 'Rosto capturado ✅';
  });

  btnBack.addEventListener('click', () => { location.href = 'login.html'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const level = parseInt(document.getElementById('levelInput').value, 10);

    if (!currentDataURL) { msg.textContent = 'Capture o rosto antes de cadastrar'; return; }
    if (!name || !password) { msg.textContent = 'Nome e senha são obrigatórios'; return; }

    msg.textContent = 'Enviando cadastro...';
    try {
      const res = await window.api.enroll(name, email, password, level, currentDataURL);
      if (res.ok) {
        msg.textContent = `Cadastrado com sucesso: ${res.name} (id=${res.id})`;
        // opcional: ir pra login
        setTimeout(()=> location.href = 'login.html', 1200);
      } else {
        msg.textContent = res.error || 'Erro no cadastro';
      }
    } catch (err) {
      console.error(err);
      msg.textContent = 'Erro ao conectar com servidor';
    }
  });
});
