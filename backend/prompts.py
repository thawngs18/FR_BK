"""
prompts.py — Tất cả prompt template gửi cho Google Gemini

Tách riêng để dễ chỉnh sửa nội dung prompt mà không cần sửa logic API.
"""


def build_generate_prompt(user_prompt: str) -> str:
    """Task 3 — Tạo kiến trúc mạng từ mô tả văn bản."""
    return f"""
Bạn là chuyên gia thiết kế kiến trúc mạng. Dựa trên mô tả sau, hãy tạo cấu trúc mạng dạng JSON.

MÔ TẢ: {user_prompt}

Trả về JSON hợp lệ theo cấu trúc sau (KHÔNG có markdown, chỉ JSON thuần):
{{
  "nodes": [
    {{
      "id": "node_1",
      "label": "Tên thiết bị",
      "type": "router|switch|firewall|server|workstation|cloud|dmz|database|loadbalancer",
      "ip": "192.168.x.x hoặc null",
      "zone": "internet|dmz|internal|management",
      "description": "Mô tả ngắn chức năng"
    }}
  ],
  "edges": [
    {{
      "id": "edge_1",
      "source": "node_id_nguồn",
      "target": "node_id_đích",
      "protocol": "TCP|UDP|HTTPS|SSH|...",
      "port": "443 hoặc null",
      "encrypted": true
    }}
  ],
  "metadata": {{
    "name": "Tên kiến trúc",
    "description": "Mô tả tổng thể",
    "created_at": "2024-01-01"
  }}
}}
"""


def build_validate_prompt(architecture: dict) -> str:
    """Task 4 — Phân tích tính hợp lý và cảnh báo lỗi kiến trúc."""
    import json
    arch_str = json.dumps(architecture, ensure_ascii=False, indent=2)
    return f"""
Bạn là chuyên gia kiểm tra bảo mật mạng. Phân tích kiến trúc mạng dưới đây và đưa ra cảnh báo.

KIẾN TRÚC:
{arch_str}

Kiểm tra các vấn đề: thiếu firewall, kết nối không mã hóa, thiếu DMZ, single point of failure,
mật khẩu mặc định, port không cần thiết mở, thiếu IDS/IPS, v.v.

Trả về JSON hợp lệ (KHÔNG có markdown):
{{
  "is_valid": true/false,
  "score": 0-100,
  "warnings": [
    {{
      "severity": "critical|warning|info",
      "component": "tên thiết bị hoặc kết nối",
      "message": "mô tả vấn đề",
      "suggestion": "cách khắc phục cụ thể"
    }}
  ],
  "summary": "nhận xét tổng thể về kiến trúc"
}}
"""


def build_scan_prompt(architecture: dict, target: str | None) -> str:
    """Task 5a — Quét lỗ hổng bảo mật."""
    import json
    arch_str = json.dumps(architecture, ensure_ascii=False, indent=2)
    target_clause = f"Tập trung vào thiết bị: {target}." if target else "Quét toàn bộ hệ thống."
    return f"""
Bạn là chuyên gia pentest. Quét lỗ hổng bảo mật trong kiến trúc mạng sau.
{target_clause}

KIẾN TRÚC:
{arch_str}

Tìm các lỗ hổng thực tế như: cổng mở không cần thiết, giao thức lỗi thời (Telnet, FTP, HTTP),
thiếu xác thực, cấu hình sai, thiếu patch, v.v.

Trả về JSON hợp lệ (KHÔNG có markdown):
{{
  "total_found": số_lượng,
  "risk_level": "critical|high|medium|low",
  "vulnerabilities": [
    {{
      "id": "VULN-001",
      "severity": "critical|high|medium|low",
      "component": "tên thiết bị",
      "cve_reference": "CVE-2024-XXXX hoặc null",
      "description": "mô tả lỗ hổng",
      "impact": "tác động nếu bị khai thác",
      "remediation": "cách vá lỗi"
    }}
  ]
}}
"""


def build_attack_prompt(architecture: dict, target: str | None) -> str:
    """Task 5b — Tạo kịch bản tấn công với độ trễ thực tế."""
    import json
    arch_str = json.dumps(architecture, ensure_ascii=False, indent=2)
    focus = f"Mục tiêu chính: {target}." if target else "Tấn công toàn diện vào hệ thống."
    return f"""
Bạn là Red Team chuyên gia. Tạo kịch bản tấn công thực tế vào kiến trúc mạng sau.
{focus}

KIẾN TRÚC:
{arch_str}

Mỗi bước tấn công phải có delay_seconds thực tế (thời gian một hacker thực sự cần cho bước đó).
Ví dụ: reconnaissance = 30-300s, brute force = 60-600s, lateral movement = 120-3600s.

Trả về JSON hợp lệ (KHÔNG có markdown):
{{
  "overall_risk": "critical|high|medium|low",
  "scenarios": [
    {{
      "name": "Tên kịch bản tấn công",
      "description": "Mô tả tổng quan",
      "total_duration_seconds": tổng_thời_gian,
      "steps": [
        {{
          "phase": "reconnaissance|exploitation|lateral_movement|persistence|exfiltration",
          "delay_seconds": số_giây_thực_tế,
          "action": "hành động cụ thể",
          "target": "thiết bị/dịch vụ mục tiêu",
          "technique": "Tên kỹ thuật (ví dụ: SQL Injection, MITM, ...)",
          "expected_outcome": "kết quả kỳ vọng"
        }}
      ]
    }}
  ]
}}
"""


def build_defense_prompt(architecture: dict, vulnerabilities: list | None = None) -> str:
    """Task 5c — Đề xuất biện pháp phòng thủ."""
    import json
    arch_str = json.dumps(architecture, ensure_ascii=False, indent=2)
    vuln_clause = ""
    if vulnerabilities:
        vuln_clause = f"\nCác lỗ hổng đã phát hiện:\n{json.dumps(vulnerabilities, ensure_ascii=False, indent=2)}"
    return f"""
Bạn là kiến trúc sư bảo mật. Đề xuất các biện pháp phòng thủ ưu tiên cho hệ thống mạng sau.
{vuln_clause}

KIẾN TRÚC:
{arch_str}

Sắp xếp theo mức độ ưu tiên (1 = khẩn cấp nhất). Đưa ra lộ trình thực hiện cụ thể.

Trả về JSON hợp lệ (KHÔNG có markdown):
{{
  "implementation_roadmap": "Lộ trình triển khai tổng thể (1 đoạn văn)",
  "recommendations": [
    {{
      "priority": 1,
      "category": "firewall|ids|encryption|access_control|patch_management|monitoring|backup",
      "component": "thiết bị hoặc toàn hệ thống",
      "action": "hành động cụ thể cần làm",
      "rationale": "lý do tại sao cần làm",
      "estimated_effort": "low|medium|high"
    }}
  ]
}}
"""
