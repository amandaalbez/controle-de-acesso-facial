const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  health: () => fetch('http://127.0.0.1:5000/health').then(r => r.json()),
  enroll: (name, level, img, email, password) =>
    fetch('http://127.0.0.1:5000/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level, image: img, email, password })
    }).then(r => r.json()),
  login: (login, password) =>
    fetch('http://127.0.0.1:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    }).then(r => r.json()),
  auth: (img) =>
    fetch('http://127.0.0.1:5000/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: img })
    }).then(r => r.json())
});
