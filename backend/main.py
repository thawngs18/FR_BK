from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

app = FastAPI()

# Cấu hình CORS cho phép Frontend (Vite chạy ở port 5173) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong thực tế nên đổi thành ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend FastAPI đang chạy ổn định!"}

@app.post("/api/generate-network")
def generate_network():
    # Nơi này sau này sẽ gọi API của Google Gemini
    return {"status": "success", "data": "Chưa tích hợp AI"}