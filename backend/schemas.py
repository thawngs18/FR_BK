"""
schemas.py — Định nghĩa cấu trúc dữ liệu vào/ra cho tất cả API
"""
from pydantic import BaseModel, Field
from typing import Any


# ══════════════════════════════════════════════════════════════
#  TASK 3 — Generate Architecture
# ══════════════════════════════════════════════════════════════

class GenerateRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=10,
        description="Mô tả bằng văn bản về hệ thống mạng cần thiết kế",
        examples=["Thiết kế mạng công ty 200 nhân viên có web server, database và DMZ"]
    )

class GenerateResponse(BaseModel):
    architecture: dict[str, Any] = Field(
        description="Cấu trúc mạng dạng JSON gồm nodes (thiết bị) và edges (kết nối)"
    )
    summary: str = Field(description="Giải thích ngắn gọn về kiến trúc đã tạo")


# ══════════════════════════════════════════════════════════════
#  TASK 4 — Validate Architecture
# ══════════════════════════════════════════════════════════════

class ValidateRequest(BaseModel):
    architecture: dict[str, Any] = Field(
        description="JSON kiến trúc mạng mà người dùng đã lưu"
    )

class Warning(BaseModel):
    severity: str = Field(description="Mức độ: critical / warning / info")
    component: str = Field(description="Thiết bị hoặc kết nối bị ảnh hưởng")
    message: str = Field(description="Mô tả vấn đề")
    suggestion: str = Field(description="Đề xuất khắc phục")

class ValidateResponse(BaseModel):
    is_valid: bool
    score: int = Field(ge=0, le=100, description="Điểm đánh giá tổng thể (0–100)")
    warnings: list[Warning]
    summary: str


# ══════════════════════════════════════════════════════════════
#  TASK 5 — Security APIs
# ══════════════════════════════════════════════════════════════

class SecurityRequest(BaseModel):
    architecture: dict[str, Any]
    target: str | None = Field(
        default=None,
        description="Thiết bị mục tiêu cụ thể (tùy chọn)"
    )

class Vulnerability(BaseModel):
    id: str
    severity: str          # critical / high / medium / low
    component: str
    cve_reference: str | None = None
    description: str
    impact: str
    remediation: str

class ScanResponse(BaseModel):
    total_found: int
    vulnerabilities: list[Vulnerability]
    risk_level: str        # critical / high / medium / low

class AttackStep(BaseModel):
    phase: str             # reconnaissance / exploitation / lateral_movement / exfiltration
    delay_seconds: float   # Độ trễ mô phỏng (Task 5 yêu cầu)
    action: str
    target: str
    technique: str
    expected_outcome: str

class AttackScenario(BaseModel):
    name: str
    description: str
    total_duration_seconds: float
    steps: list[AttackStep]

class AttackResponse(BaseModel):
    scenarios: list[AttackScenario]
    overall_risk: str

class DefenseRecommendation(BaseModel):
    priority: int          # 1 = cao nhất
    category: str          # firewall / ids / encryption / access_control / ...
    component: str
    action: str
    rationale: str
    estimated_effort: str  # low / medium / high

class DefenseResponse(BaseModel):
    recommendations: list[DefenseRecommendation]
    implementation_roadmap: str
