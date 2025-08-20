# 🖥️ Controle de Acesso Facial

Sistema de reconhecimento facial desenvolvido em Python (Flask + OpenCV) e Electron (HTML + JS).
Projeto acadêmico APS – UNIP (6º semestre).

## 🚀 Como Rodar o Projeto

### 1️⃣ Clonar o repositório
```bash
git clone https://github.com/seu-usuario/controle-de-acesso-facial.git
cd controle-de-acesso-facial
```

### 2️⃣ Configurar o Backend (Python)
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate     # Windows
# source .venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
python app.py
```

✅ O servidor Flask estará rodando em: `http://127.0.0.1:5000`

### 3️⃣ Configurar o Frontend (Electron)

Em outro terminal:

```bash
cd frontend
npm install
npm start
```

✅ A aplicação desktop será aberta automaticamente

## 🎯 Como Usar

- **Cadastrar usuário** → informe nome + nível (1, 2 ou 3) e clique em "Cadastrar rosto"
- **Autenticar** → clique em "Autenticar" e posicione o rosto na câmera
- O sistema retorna o nível de acesso reconhecido

## 📋 Pré-requisitos

- Python 3.10+
- Node.js 16+
- Webcam funcionando