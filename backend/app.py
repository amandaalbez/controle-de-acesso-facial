import os
import cv2
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify
import base64

# --- Banco de dados (SQLite via SQLAlchemy) ---
from sqlalchemy import (
    create_engine, Column, Integer, String, ForeignKey, DateTime, Text
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.exc import IntegrityError

# --- (Opcional) senha ---
import bcrypt

app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

MODEL_PATH = os.path.join(BASE_DIR, "lbph_model.xml")
DB_PATH = os.path.join(BASE_DIR, "app.db")

# ====== SQLAlchemy setup ======
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)                      # este id será o label do LBPH
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)          # opcional
    password_hash = Column(Text, nullable=True)                 # opcional (para 2 fatores)
    level = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    faces = relationship("FaceSample", back_populates="user", cascade="all, delete", lazy="joined")

class FaceSample(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_path = Column(String, nullable=False)                 # caminho da imagem recortada
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="faces")

Base.metadata.create_all(engine)

# ====== Reconhecedor LBPH ======
recognizer = cv2.face.LBPHFaceRecognizer_create()

# ====== Utilidades ======
def dataurl_to_image(data_url: str):
    """Converte base64 (dataURL) para imagem OpenCV (BGR)."""
    if "," in data_url:
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url
    img_data = base64.b64decode(b64)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def detect_first_face_gray(bgr_img):
    """Detecta o primeiro rosto e retorna ROI em escala de cinza."""
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(faces) == 0:
        return None
    (x, y, w, h) = faces[0]
    return gray[y:y+h, x:x+w]

def train_from_db():
    """Re-treina o modelo LBPH usando as imagens vinculadas no banco."""
    session = SessionLocal()
    try:
        samples = []
        labels = []
        # Para cada face cadastrada, lemos a imagem e usamos o user_id como label
        all_faces = session.query(FaceSample).all()
        for f in all_faces:
            img_path = os.path.join(DATA_DIR, os.path.basename(f.image_path))
            if os.path.exists(img_path):
                img_gray = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                if img_gray is not None:
                    samples.append(img_gray)
                    labels.append(f.user_id)

        if samples:
            recognizer.train(samples, np.array(labels))
            recognizer.save(MODEL_PATH)
            return True
        return False
    finally:
        session.close()

def load_model_or_train():
    """Carrega o modelo salvo ou treina do zero com base no banco."""
    if os.path.exists(MODEL_PATH):
        recognizer.read(MODEL_PATH)
    else:
        train_from_db()

# ====== (Opcional) utilitários de senha ======
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def check_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

# ====== Rotas ======
@app.route("/health", methods=["GET"])
def health():
    session = SessionLocal()
    try:
        users_count = session.query(User).count()
        faces_count = session.query(FaceSample).count()
        return jsonify({"status": "ok", "registered": faces_count, "users": users_count})
    finally:
        session.close()

@app.route("/enroll", methods=["POST"])
def enroll():
    """
    Entrada (JSON): { "name": str, "level": int (opcional, default=1), "image": dataURL }
    Saída: { "ok": True, "id": user_id, "name": name, "level": level }
    """
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    level = int(data.get("level", 1))
    img_b64 = data.get("image")

    if not name or not img_b64:
        return jsonify({"error": "nome e imagem são obrigatórios"}), 400

    bgr = dataurl_to_image(img_b64)
    face_img = detect_first_face_gray(bgr)
    if face_img is None:
        return jsonify({"error": "nenhum rosto detectado"}), 422

    session = SessionLocal()
    try:
        # cria o usuário (email/senha são opcionais aqui)
        user = User(name=name, level=level)
        session.add(user)
        session.commit()  # para obter user.id

        # salva a imagem do rosto (um arquivo por usuário, como você já fazia)
        filename = f"user_{user.id}.jpg"
        save_path = os.path.join(DATA_DIR, filename)
        cv2.imwrite(save_path, face_img)

        # registra no banco a face
        face_row = FaceSample(user_id=user.id, image_path=filename)
        session.add(face_row)
        session.commit()

        # re-treina o modelo
        trained = train_from_db()
        if not trained:
            return jsonify({"error": "falha ao treinar modelo"}), 500

        return jsonify({"ok": True, "id": user.id, "name": user.name, "level": user.level})

    except IntegrityError:
        session.rollback()
        return jsonify({"error": "conflito de dados (email duplicado?)"}), 409
    except Exception as e:
        session.rollback()
        return jsonify({"error": f"erro interno: {e}"}), 500
    finally:
        session.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    login = data.get("login")
    password = data.get("password")

    if not login or not password:
        return jsonify({"ok": False, "error": "dados incompletos"}), 400

    session = SessionLocal()
    try:
        user = session.query(User).filter(
            (User.email == login) | (User.name == login)
        ).first()
        if not user:
            return jsonify({"ok": False, "error": "usuário não encontrado"}), 404

        if not user.password_hash:
            return jsonify({"ok": False, "error": "usuário sem senha definida"}), 403

        if not check_password(password, user.password_hash):
            return jsonify({"ok": False, "error": "senha incorreta"}), 401

        return jsonify({"ok": True, "user": {"id": user.id, "name": user.name, "email": user.email, "level": user.level}})
    finally:
        session.close()

@app.route("/auth", methods=["POST"])
def auth():
    """
    Entrada (JSON): { "image": dataURL }
    Saída se reconhecido: { "matched": True, "name": str, "level": int, "confidence": float }
    Saída se não: { "matched": False, "reason": str? }
    """
    data = request.get_json(silent=True) or {}
    img_b64 = data.get("image")
    if not img_b64:
        return jsonify({"error": "imagem obrigatória"}), 400

    bgr = dataurl_to_image(img_b64)
    face_img = detect_first_face_gray(bgr)
    if face_img is None:
        return jsonify({"matched": False, "reason": "nenhum rosto detectado"})

    # garante que o modelo esteja carregado
    load_model_or_train()

    # verifica se existem faces cadastradas
    session = SessionLocal()
    try:
        has_faces = session.query(FaceSample).count() > 0
        if not has_faces:
            return jsonify({"matched": False, "reason": "nenhum usuário cadastrado"})

        label, confidence = recognizer.predict(face_img)
        # quanto menor o confidence, melhor (limiar ajustável)
        THRESHOLD = 80.0
        if confidence < THRESHOLD:
            user = session.query(User).filter_by(id=label).first()
            if not user:
                return jsonify({"matched": False, "reason": "usuário não encontrado"})

            return jsonify({
                "matched": True,
                "name": user.name,
                "level": user.level,
                "confidence": float(confidence)
            })
        else:
            return jsonify({"matched": False})
    finally:
        session.close()

if __name__ == "__main__":
    load_model_or_train()
    app.run(host="127.0.0.1", port=5000)
