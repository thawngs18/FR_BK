"""
ai_client.py — Khởi tạo Google Gemini SDK một lần duy nhất (Task 2)

Cách dùng:
    from ai_client import model
    response = await asyncio.to_thread(model.generate_content, prompt)
"""
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL

if not GEMINI_API_KEY:
    raise EnvironmentError(
        "Thiếu GEMINI_API_KEY.\n"
        "→ Sao chép .env.example thành .env và điền API Key từ https://aistudio.google.com/app/apikey"
    )

# Cấu hình SDK với API Key từ .env
genai.configure(api_key=GEMINI_API_KEY)

# Khởi tạo model dùng chung cho toàn bộ ứng dụng
model = genai.GenerativeModel(model_name=GEMINI_MODEL)
