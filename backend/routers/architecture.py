"""
routers/architecture.py

Task 3: POST /architecture/generate  — Nhận prompt → Gemini → JSON kiến trúc mạng
Task 4: POST /architecture/validate  — Nhận JSON → Gemini → Cảnh báo lỗi
"""
import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException
from schemas import (
    GenerateRequest, GenerateResponse,
    ValidateRequest, ValidateResponse,
)
from ai_client import model
from prompts import build_generate_prompt, build_validate_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/architecture", tags=["Architecture"])


def _call_gemini(prompt: str) -> str:
    """Gọi Gemini đồng bộ — sẽ được chạy trong thread pool bởi asyncio.to_thread."""
    response = model.generate_content(prompt)
    return response.text


def _parse_json_response(raw: str, endpoint: str) -> dict:
    """
    Tách JSON từ response của Gemini.
    Gemini đôi khi bọc JSON trong ```json ... ``` nên cần strip ra.
    """
    # Bỏ markdown code fence nếu có
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Bỏ dòng đầu (```json) và dòng cuối (```)
        cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("[%s] JSON parse error: %s\nRaw response:\n%s", endpoint, e, raw)
        raise HTTPException(
            status_code=502,
            detail=f"AI trả về dữ liệu không hợp lệ. Vui lòng thử lại. (Chi tiết: {e})"
        )


# ══════════════════════════════════════════════════════════════
#  TASK 3 — Tạo kiến trúc mạng
# ══════════════════════════════════════════════════════════════

@router.post("/generate", response_model=GenerateResponse, summary="Tạo kiến trúc mạng từ mô tả")
async def generate_architecture(request: GenerateRequest):
    """
    **Task 3**: Nhận mô tả văn bản từ người dùng, gửi cho Gemini,
    trả về JSON kiến trúc mạng gồm `nodes` (thiết bị) và `edges` (kết nối).

    **Ví dụ prompt**: "Thiết kế mạng văn phòng 50 người có web server public và database nội bộ"
    """
    logger.info("[generate] prompt='%s'", request.prompt[:80])

    prompt = build_generate_prompt(request.prompt)

    try:
        # asyncio.to_thread để không block event loop (Gemini SDK là synchronous)
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        logger.exception("[generate] Gemini call failed")
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json_response(raw, "generate")

    # Lấy summary từ metadata nếu có, hoặc tạo summary mặc định
    metadata = data.get("metadata", {})
    summary = metadata.get("description", "Kiến trúc mạng đã được tạo thành công.")

    return GenerateResponse(architecture=data, summary=summary)


# ══════════════════════════════════════════════════════════════
#  TASK 4 — Phân tích / Validate kiến trúc
# ══════════════════════════════════════════════════════════════

@router.post("/validate", response_model=ValidateResponse, summary="Phân tích và cảnh báo lỗi kiến trúc")
async def validate_architecture(request: ValidateRequest):
    """
    **Task 4**: Nhận JSON kiến trúc mạng (khi người dùng nhấn "Save"),
    gửi cho Gemini phân tích, trả về danh sách cảnh báo với mức độ ưu tiên.
    """
    logger.info("[validate] nodes=%d edges=%d",
                len(request.architecture.get("nodes", [])),
                len(request.architecture.get("edges", [])))

    prompt = build_validate_prompt(request.architecture)

    try:
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        logger.exception("[validate] Gemini call failed")
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json_response(raw, "validate")

    return ValidateResponse(
        is_valid=data.get("is_valid", False),
        score=data.get("score", 0),
        warnings=data.get("warnings", []),
        summary=data.get("summary", ""),
    )
