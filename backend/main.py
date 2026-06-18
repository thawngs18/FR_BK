"""
main.py — Điểm khởi động ứng dụng FastAPI (Task 1)

Chạy:
    uvicorn main:app --reload
    hoặc: python main.py
"""
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT, ALLOWED_ORIGINS
from routers import architecture, security

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════
#  Khởi tạo ứng dụng FastAPI
# ══════════════════════════════════════════════════════════════
app = FastAPI(
    title="Network Architecture AI Backend",
    description="""
Backend hỗ trợ thiết kế và phân tích bảo mật kiến trúc mạng bằng Google Gemini AI.

## Endpoints
- **Architecture**: Tạo kiến trúc mạng từ mô tả văn bản, phân tích tính hợp lý
- **Security**: Quét lỗ hổng, mô phỏng tấn công, đề xuất phòng thủ
    """,
    version="1.0.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
)

# ══════════════════════════════════════════════════════════════
#  TASK 1 — Cấu hình CORS
#  Cho phép Frontend (React/Vue/plain HTML) gọi API từ domain khác
# ══════════════════════════════════════════════════════════════
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # Đọc từ .env
    allow_credentials=True,
    allow_methods=["*"],             # GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],             # Authorization, Content-Type, ...
)

logger.info("CORS configured for origins: %s", ALLOWED_ORIGINS)

# ══════════════════════════════════════════════════════════════
#  Đăng ký Routers
# ══════════════════════════════════════════════════════════════
app.include_router(architecture.router)   # /architecture/generate, /validate
app.include_router(security.router)       # /security/scan, /attack, /defend


# ══════════════════════════════════════════════════════════════
#  Root endpoints
# ══════════════════════════════════════════════════════════════
@app.get("/", tags=["Health"])
async def root():
    """Health check — kiểm tra server đang chạy."""
    return {
        "status": "ok",
        "message": "Network Architecture AI Backend đang chạy",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check chi tiết cho load balancer / Docker."""
    from config import GEMINI_API_KEY
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "cors_origins": ALLOWED_ORIGINS,
    }


# ══════════════════════════════════════════════════════════════
#  Entry point khi chạy trực tiếp
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    logger.info("Khởi động server tại http://%s:%d", HOST, PORT)
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
