import os
import cv2
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify
import base64
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.exc import IntegrityError
import bcrypt

app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

MODEL_PATH = os.path.join(BASE_DIR, "lbph_model.xml")
DB_PATH = os.path.join(BASE_DIR, "db", "app.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ---------- Banco de Dados ----------
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    password_hash = Column(Text, nullable=False)
    level = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    faces = relationship("FaceSample", back_populates="user", cascade="all, delete", lazy="joined")

class FaceSample(Base):
    __tablename__ = "faces"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="faces")

Base.metadata.create_all(engine)

recognizer = cv2.face.LBPHFaceRecognizer_create()

# ---------- Utilitários ----------
def dataurl_to_image(data_url):
    _, b64 = data_url.split(",", 1)
    img_data = base64.b64decode(b64)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def detect_face_gray(bgr):
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(faces) == 0:
        return None
    (x, y, w, h) = faces[0]
    return gray[y:y+h, x:x+w]

def hash_password(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def check_password(p, hashed):
    return bcrypt.checkpw(p.encode(), hashed.encode())

# ---------- Rotas ----------
@app.route("/health")
def health():
    return {"status": "ok"}, 200

@app.route("/enroll", methods=["POST"])
def enroll():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    level = int(data.get("level", 1))
    img = data.get("image")

    if not all([name, password, img]):
        return jsonify({"error": "dados incompletos"}), 400

    bgr = dataurl_to_image(img)
    face = detect_face_gray(bgr)
    if face is None:
        return jsonify({"error": "rosto não detectado"}), 422

    session = SessionLocal()
    try:
        user = User(name=name, email=email, password_hash=hash_password(password), level=level)
        session.add(user)
        session.commit()

        img_path = os.path.join(DATA_DIR, f"user_{user.id}.jpg")
        cv2.imwrite(img_path, face)
        face_row = FaceSample(user_id=user.id, image_path=img_path)
        session.add(face_row)
        session.commit()

        return jsonify({"ok": True, "id": user.id, "name": name, "level": level})
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "email já cadastrado"}), 409
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
    user = session.query(User).filter((User.email == login) | (User.name == login)).first()
    session.close()

    if not user:
        return jsonify({"ok": False, "error": "usuário não encontrado"}), 404
    if not check_password(password, user.password_hash):
        return jsonify({"ok": False, "error": "senha incorreta"}), 401

    return jsonify({"ok": True, "user": {"id": user.id, "name": user.name, "email": user.email, "level": user.level}})

@app.route("/auth", methods=["POST"])
def auth():
    data = request.get_json() or {}
    img_b64 = data.get("image")
    if not img_b64:
        return jsonify({"error": "imagem obrigatória"}), 400

    bgr = dataurl_to_image(img_b64)
    face = detect_face_gray(bgr)
    if face is None:
        return jsonify({"matched": False, "reason": "rosto não detectado"}), 422

    session = SessionLocal()
    faces = session.query(FaceSample).all()
    if not faces:
        return jsonify({"matched": False, "reason": "nenhum rosto cadastrado"}), 404

    samples, labels = [], []
    for f in faces:
        img = cv2.imread(f.image_path, cv2.IMREAD_GRAYSCALE)
        samples.append(img)
        labels.append(f.user_id)

    recognizer.train(samples, np.array(labels))
    label, conf = recognizer.predict(face)
    user = session.query(User).filter_by(id=label).first()
    session.close()

    if conf < 80:
        return jsonify({"matched": True, "name": user.name, "level": user.level, "confidence": float(conf)})
    return jsonify({"matched": False, "reason": "rosto não corresponde"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
