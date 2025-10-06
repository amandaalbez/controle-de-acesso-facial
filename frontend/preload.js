const { contextBridge } = require('electron');

const API_URL = "http://127.0.0.1:5000";

contextBridge.exposeInMainWorld('api', {
  // health
  health: async () => {
    const res = await fetch(`${API_URL}/health`);
    return res.ok ? await res.json() : null;
  },

  // enroll (register) -> envia name, email, password, level, image (dataURL)
  enroll: async (name, email, password, level, image) => {
    const res = await fetch(`${API_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, level, image })
    });
    return res.json();
  },

  // login -> envia login (name or email), password
  login: async (login, password) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    return res.json();
  },

  // auth -> envia image (dataURL)
  auth: async (image) => {
    const res = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image })
    });
    return res.json();
  }
});
