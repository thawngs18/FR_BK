"""
config.py — Đọc biến môi trường từ file .env (Task 1 & 2)
"""
import os
from dotenv import load_dotenv

load_dotenv()  # Tự động tìm và load file .env trong thư mục hiện tại

# ── Gemini ──────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
# gemini-1.5-flash đã ngừng hỗ trợ; dùng 2.5-flash (free tier, generateContent)
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Server ──────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# ── CORS — danh sách origin Frontend được phép ──────────────
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500"
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",")]
