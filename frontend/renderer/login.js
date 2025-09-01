console.log("✅ login.js carregado!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM pronto!");

  const btn = document.getElementById('btnLogin');
  const statusEl = document.getElementById('status');

  btn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Preencha login e senha");
      return;
    }

    console.log("🔄 Enviando login:", email);

    try {
      const res = await window.api.login(email, password);

      if (res.ok) {
        console.log("✅ Login válido:", res.user);

        // guarda usuário na sessão para usar no auth.js
        sessionStorage.setItem("currentUser", JSON.stringify(res.user));

        statusEl.textContent = `Bem-vindo, ${res.user.name}. Vá para autenticação facial.`;

        // redireciona para a tela de autenticação facial
        window.location.href = "auth.html";
      } else {
        console.warn("❌ Falha no login:", res.error);
        alert("❌ " + (res.error || "Login inválido"));
      }
    } catch (err) {
      console.error("Erro ao conectar com API:", err);
      alert("❌ Erro ao conectar com servidor");
    }
  });

  // mostra status da API
  (async function boot() {
    const h = await window.api.health().catch(() => null);
    statusEl.textContent = h ? `API ok (${h.users} usuários, ${h.registered} rostos)` : 'API indisponível';
  })();
});
