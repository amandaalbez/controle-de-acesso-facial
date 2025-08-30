const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result') || document.createElement('div');

document.getElementById('btnLogin').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    alert("Preencha email e senha");
    return;
  }

  const res = await window.api.login(email, password);

  if (res.ok) {
    // guarda no navegador quem fez login
    sessionStorage.setItem("currentUser", JSON.stringify(res.user));
    resultEl.textContent = "✅ Senha correta, prossiga para autenticação facial.";
    // redireciona para autenticação facial
    window.location.href = "auth.html";
  } else {
    resultEl.textContent = "❌ Login inválido";
  }
});

(async function boot() {
  const h = await window.api.health().catch(() => null);
  statusEl.textContent = h ? `API ok (${h.users} usuários)` : 'API indisponível';
})();
