// só garante que usuário logado; caso contrário volta pro login
document.addEventListener('DOMContentLoaded', () => {
  const stored = sessionStorage.getItem('currentUser');
  if (!stored) {
    location.href = 'login.html';
  }
});
