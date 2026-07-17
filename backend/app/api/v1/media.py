from fastapi import APIRouter, UploadFile, File
from app.services.media_service import media_service

router = APIRouter()

@router.post("/parse-media")
async def parse_media(file: UploadFile = File(...)):
    return await media_service.process_upload(file)
