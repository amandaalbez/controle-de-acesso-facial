import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
import base64

app = Flask(__name__)

# Pasta para salvar imagens dos usuários
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Arquivo do modelo treinado
MODEL_PATH = os.path.join(os.path.dirname(__file__), "lbph_model.xml")

# Dicionário para armazenar usuários
# id_num: {"name": "João", "level": 1}
users = {}
next_id = 0

# Criar o reconhecedor LBPH
recognizer = cv2.face.LBPHFaceRecognizer_create()


def save_model():
    if len(users) > 0:
        recognizer.save(MODEL_PATH)
        np.save(os.path.join(os.path.dirname(__file__), "users.npy"), users)


def load_model():
    global users, next_id
    if os.path.exists(MODEL_PATH):
        recognizer.read(MODEL_PATH)
    if os.path.exists(os.path.join(os.path.dirname(__file__), "users.npy")):
        users = np.load(os.path.join(os.path.dirname(__file__), "users.npy"), allow_pickle=True).item()
        next_id = max(users.keys()) + 1 if users else 0


def dataurl_to_image(data_url: str):
    """Converte base64 (dataURL) para imagem OpenCV (BGR)."""
    if "," in data_url:
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url
    img_data = base64.b64decode(b64)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "registered": len(users)})


@app.route("/enroll", methods=["POST"])
def enroll():
    global next_id
    data = request.get_json()
    name = data.get("name")
    level = int(data.get("level", 1))
    img_b64 = data.get("image")

    if not name or not img_b64:
        return jsonify({"error": "nome e imagem são obrigatórios"}), 400

    img = dataurl_to_image(img_b64)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) == 0:
        return jsonify({"error": "nenhum rosto detectado"}), 422

    (x, y, w, h) = faces[0]
    face_img = gray[y:y+h, x:x+w]

    # Salvar imagem para referência
    filename = f"user_{next_id}.jpg"
    cv2.imwrite(os.path.join(DATA_DIR, filename), face_img)

    # Adicionar ao banco
    users[next_id] = {"name": name, "level": level}

    # Re-treinar modelo
    labels = []
    samples = []
    for uid, info in users.items():
        img_path = os.path.join(DATA_DIR, f"user_{uid}.jpg")
        if os.path.exists(img_path):
            img_gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            samples.append(img_gray)
            labels.append(uid)

    if samples:
        recognizer.train(samples, np.array(labels))
        save_model()

    uid = next_id
    next_id += 1
    return jsonify({"ok": True, "id": uid, "name": name, "level": level})


@app.route("/auth", methods=["POST"])
def auth():
    data = request.get_json()
    img_b64 = data.get("image")

    if not img_b64:
        return jsonify({"error": "imagem obrigatória"}), 400

    img = dataurl_to_image(img_b64)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) == 0:
        return jsonify({"matched": False, "reason": "nenhum rosto detectado"})

    (x, y, w, h) = faces[0]
    face_img = gray[y:y+h, x:x+w]

    if len(users) == 0:
        return jsonify({"matched": False, "reason": "nenhum usuário cadastrado"})

    label, confidence = recognizer.predict(face_img)
    print(f"DEBUG -> label: {label}, confidence: {confidence}")

    if confidence < 80:  # Quanto menor, melhor (ajuste se necessário)
        user = users[label]
        return jsonify({"matched": True, "name": user["name"], "level": user["level"], "confidence": float(confidence)})
    else:
        return jsonify({"matched": False})


if __name__ == "__main__":
    load_model()
    app.run(host="127.0.0.1", port=5000)
