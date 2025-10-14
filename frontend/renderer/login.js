console.log("login.js carregado");

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const btnToRegister = document.getElementById('btnToRegister');
  const statusEl = document.getElementById('status');

  // checar api
  (async () => {
    const h = await window.api.health().catch(()=>null);
    statusEl.textContent = h ? 'API online' : 'API indisponível';
  })();

  btnToRegister.addEventListener('click', () => {
    location.href = 'register.html';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    if (!login || !password) { alert('Preencha login e senha'); return; }

    statusEl.textContent = 'Autenticando...';
    try {
      const res = await window.api.login(login, password);
      if (res.ok) {
        sessionStorage.setItem('currentUser', JSON.stringify(res.user));
        // direciona para auth (onde será feita a foto)
        location.href = 'auth.html';
      } else {
        statusEl.textContent = res.error || 'Credenciais inválidas';
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Erro ao conectar com servidor';
    }
  });
});
