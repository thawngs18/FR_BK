"""
routers/security.py

Task 5:
  POST /security/scan      — Quét lỗ hổng bảo mật
  POST /security/attack    — Tạo kịch bản tấn công (có delay mô phỏng từng bước)
  POST /security/defend    — Đề xuất biện pháp phòng thủ
"""
import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from schemas import (
    SecurityRequest,
    ScanResponse,
    AttackResponse,
    DefenseResponse,
)
from ai_client import model
from prompts import build_scan_prompt, build_attack_prompt, build_defense_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/security", tags=["Security"])


# ── Helpers ──────────────────────────────────────────────────

def _call_gemini(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text


def _parse_json(raw: str, endpoint: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("[%s] JSON parse error: %s", endpoint, e)
        raise HTTPException(status_code=502, detail=f"AI trả về dữ liệu không hợp lệ: {e}")


# ══════════════════════════════════════════════════════════════
#  TASK 5a — Quét lỗ hổng
# ══════════════════════════════════════════════════════════════

@router.post("/scan", response_model=ScanResponse, summary="Quét lỗ hổng bảo mật")
async def scan_vulnerabilities(request: SecurityRequest):
    """
    **Task 5a**: Phân tích kiến trúc mạng và trả về danh sách lỗ hổng bảo mật
    với mức độ nghiêm trọng (critical / high / medium / low).
    """
    logger.info("[scan] target=%s", request.target or "all")

    prompt = build_scan_prompt(request.architecture, request.target)

    try:
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json(raw, "scan")

    return ScanResponse(
        total_found=data.get("total_found", 0),
        vulnerabilities=data.get("vulnerabilities", []),
        risk_level=data.get("risk_level", "medium"),
    )


# ══════════════════════════════════════════════════════════════
#  TASK 5b — Kịch bản tấn công với delay mô phỏng
# ══════════════════════════════════════════════════════════════

@router.post("/attack", response_model=AttackResponse, summary="Tạo kịch bản tấn công")
async def generate_attack_scenario(request: SecurityRequest):
    """
    **Task 5b**: Tạo kịch bản tấn công thực tế. Mỗi bước trong `steps` có trường
    `delay_seconds` mô phỏng thời gian thực tế của hacker.

    Dùng endpoint `/attack/simulate` để chạy simulation có delay thật sự.
    """
    logger.info("[attack] target=%s", request.target or "all")

    prompt = build_attack_prompt(request.architecture, request.target)

    try:
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json(raw, "attack")

    return AttackResponse(
        scenarios=data.get("scenarios", []),
        overall_risk=data.get("overall_risk", "high"),
    )


@router.post(
    "/attack/simulate",
    summary="Mô phỏng tấn công theo thời gian thực (Server-Sent Events)",
    response_class=StreamingResponse,
)
async def simulate_attack(request: SecurityRequest):
    """
    **Task 5b — Simulation**: Stream từng bước tấn công với delay thực tế.

    Trả về **Server-Sent Events** (text/event-stream) để Frontend hiển thị
    tiến trình tấn công theo thời gian thực.

    Format mỗi event:
    ```
    data: {"step": 1, "phase": "reconnaissance", "action": "...", "delay": 30.0}
    ```
    """
    logger.info("[simulate] target=%s", request.target or "all")

    # Bước 1: Lấy kịch bản từ AI
    prompt = build_attack_prompt(request.architecture, request.target)
    try:
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json(raw, "simulate")
    scenarios = data.get("scenarios", [])

    # Bước 2: Stream từng bước với delay
    async def event_generator():
        """Generator phát SSE events, delay mỗi bước theo delay_seconds của AI."""
        yield _sse_event({"status": "started", "total_scenarios": len(scenarios)})

        for s_idx, scenario in enumerate(scenarios):
            steps = scenario.get("steps", [])

            # Thông báo bắt đầu kịch bản
            yield _sse_event({
                "status": "scenario_start",
                "scenario_index": s_idx,
                "scenario_name": scenario.get("name", ""),
                "description": scenario.get("description", ""),
                "total_steps": len(steps),
            })

            for step_idx, step in enumerate(steps):
                delay: float = float(step.get("delay_seconds", 2.0))

                # Giới hạn delay tối đa 30s để demo không bị chờ quá lâu
                # (Trong production thực tế có thể bỏ giới hạn này)
                clamped_delay = min(delay, 30.0)

                # Thông báo bước đang thực hiện
                yield _sse_event({
                    "status": "step_executing",
                    "scenario_index": s_idx,
                    "step_index": step_idx,
                    "phase": step.get("phase", ""),
                    "action": step.get("action", ""),
                    "target": step.get("target", ""),
                    "technique": step.get("technique", ""),
                    "simulated_delay_seconds": delay,
                    "actual_wait_seconds": clamped_delay,
                })

                # ★ Delay mô phỏng thời gian thực tế của bước tấn công
                await asyncio.sleep(clamped_delay)

                # Thông báo bước hoàn thành
                yield _sse_event({
                    "status": "step_done",
                    "scenario_index": s_idx,
                    "step_index": step_idx,
                    "expected_outcome": step.get("expected_outcome", ""),
                })

            yield _sse_event({
                "status": "scenario_done",
                "scenario_index": s_idx,
            })

        yield _sse_event({"status": "simulation_complete", "overall_risk": data.get("overall_risk", "high")})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Tắt buffer của Nginx nếu có
        }
    )


def _sse_event(payload: dict) -> str:
    """Format một Server-Sent Event hợp lệ."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


# ══════════════════════════════════════════════════════════════
#  TASK 5c — Đề xuất phòng thủ
# ══════════════════════════════════════════════════════════════

@router.post("/defend", response_model=DefenseResponse, summary="Đề xuất biện pháp phòng thủ")
async def recommend_defenses(request: SecurityRequest):
    """
    **Task 5c**: Phân tích kiến trúc và đề xuất các biện pháp phòng thủ
    theo thứ tự ưu tiên, kèm lộ trình thực hiện.
    """
    logger.info("[defend] target=%s", request.target or "all")

    prompt = build_defense_prompt(request.architecture)

    try:
        raw = await asyncio.to_thread(_call_gemini, prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Không thể kết nối AI: {e}")

    data = _parse_json(raw, "defend")

    return DefenseResponse(
        recommendations=data.get("recommendations", []),
        implementation_roadmap=data.get("implementation_roadmap", ""),
    )
