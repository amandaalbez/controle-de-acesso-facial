const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  enroll: async (name, level, dataUrl) => {
    const res = await fetch('http://127.0.0.1:5000/enroll', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, level, image: dataUrl })
    });
    return res.json();
  },
  auth: async (dataUrl) => {
    const res = await fetch('http://127.0.0.1:5000/auth', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ image: dataUrl })
    });
    return res.json();
  },
  health: async () => {
    const res = await fetch('http://127.0.0.1:5000/health');
    return res.json();
  }
});
