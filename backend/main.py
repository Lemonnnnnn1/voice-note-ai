"""
VoiceNote AI - FastAPI Backend
会议录音转写分析平台后端服务
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import uuid

from core.config import settings
from api.routes.transcribe import router as transcribe_router
from api.routes.settings import router as settings_router
from api.routes.auth import router as auth_router
from api.routes.users import router as users_router
from api.routes.files import router as files_router
from database import init_db

# 简单的内存存储（生产环境应使用数据库）
projects_db = {
    "1": {
        "id": "1",
        "name": "我的项目",
        "createdAt": datetime.now().isoformat(),
        "files": []
    }
}

# 上传文件存储目录
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcribe_router)
app.include_router(settings_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(files_router)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()


# 数据模型
class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: Optional[str] = None


class Transcription(BaseModel):
    id: str
    text: str
    segments: List[TranscriptionSegment]
    language: str


class Speaker(BaseModel):
    id: str
    name: str
    color: str


class Chapter(BaseModel):
    id: str
    title: str
    startTime: float
    endTime: float
    content: str


class MindMapNode(BaseModel):
    id: str
    text: str
    children: Optional[List["MindMapNode"]] = None


class Analysis(BaseModel):
    speakers: List[Speaker]
    chapters: List[Chapter]
    summary: str
    mindMap: MindMapNode


class AudioFile(BaseModel):
    id: str
    name: str
    type: str  # "recording" or "uploaded"
    duration: Optional[float] = None
    createdAt: str
    transcription: Optional[Transcription] = None
    analysis: Optional[Analysis] = None


class Project(BaseModel):
    id: str
    name: str
    createdAt: str
    files: List[AudioFile]


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[dict] = None


# API 路由
@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/models")
async def get_available_models():
    """获取可用的转写模型列表"""
    return {
        "success": True,
        "data": {
            "transcription": [
                {"id": "faster-whisper", "name": "Faster Whisper (本地)", "description": "本地运行，免费使用", "type": "local"}
            ],
            "analysis": [
                {"id": "deepseek", "name": "DeepSeek V3", "description": "云端运行，性价比高", "type": "cloud"}
            ]
        }
    }


@app.get("/api/models/status")
async def get_models_status():
    """获取各模型的状态（是否已配置）"""
    from services.transcription import TranscriptionService
    from services.analysis import AnalysisService

    status = {
        "faster-whisper": {"available": False, "message": ""},
        "deepseek-analysis": {"available": False, "message": ""}
    }

    # Check Faster Whisper
    try:
        ts = TranscriptionService()
        _ = ts.faster_whisper_model
        status["faster-whisper"] = {"available": True, "message": "已就绪"}
    except Exception as e:
        status["faster-whisper"] = {"available": False, "message": str(e)}

    # Check DeepSeek Analysis
    if settings.DEEPSEEK_API_KEY:
        status["deepseek-analysis"] = {"available": True, "message": "已配置"}
    else:
        status["deepseek-analysis"] = {"available": False, "message": "未配置 DeepSeek API Key"}

    return {"success": True, "data": status}


# 项目管理
@app.get("/api/projects", response_model=ApiResponse)
async def get_projects():
    return ApiResponse(success=True, data={"projects": list(projects_db.values())})


@app.post("/api/projects", response_model=ApiResponse)
async def create_project(name: str):
    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "name": name,
        "createdAt": datetime.now().isoformat(),
        "files": []
    }
    projects_db[project_id] = project
    return ApiResponse(success=True, data={"project": project})


@app.delete("/api/projects/{project_id}", response_model=ApiResponse)
async def delete_project(project_id: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    del projects_db[project_id]
    return ApiResponse(success=True, data={"message": "Project deleted"})


# 文件管理
@app.post("/api/upload", response_model=ApiResponse)
async def upload_file(project_id: str, file: UploadFile = File(...)):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    # 验证文件类型
    allowed_types = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/x-m4a", "audio/aac"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # 保存文件
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".audio"
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    audio_file = {
        "id": file_id,
        "name": file.filename or "未命名音频",
        "type": "uploaded",
        "duration": None,
        "createdAt": datetime.now().isoformat(),
        "transcription": None,
        "analysis": None,
        "filePath": file_path
    }

    projects_db[project_id]["files"].append(audio_file)

    return ApiResponse(success=True, data={"file": audio_file})


@app.delete("/api/files/{project_id}/{file_id}", response_model=ApiResponse)
async def delete_file(project_id: str, file_id: str):
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    files = projects_db[project_id]["files"]
    file_to_delete = next((f for f in files if f["id"] == file_id), None)

    if not file_to_delete:
        raise HTTPException(status_code=404, detail="File not found")

    # 删除物理文件
    if "filePath" in file_to_delete and os.path.exists(file_to_delete["filePath"]):
        os.remove(file_to_delete["filePath"])

    projects_db[project_id]["files"] = [f for f in files if f["id"] != file_id]

    return ApiResponse(success=True, data={"message": "File deleted"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
