from fastapi import APIRouter, File, HTTPException, UploadFile
import requests

router = APIRouter(prefix="/api/timetable", tags=["timetable"])

FLASK_TIMETABLE_URL = "http://127.0.0.1:5002"


@router.post("/upload")
async def upload_timetable(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()

        files = {
            "image": (
                image.filename,
                image_bytes,
                image.content_type or "image/jpeg",
            )
        }

        response = requests.post(
            f"{FLASK_TIMETABLE_URL}/api/timetable/upload",
            files=files,
            timeout=60,
        )

        try:
            result = response.json()
        except ValueError:
            raise HTTPException(
                status_code=502,
                detail="시간표 분석 서버가 올바른 JSON을 반환하지 않았습니다.",
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=result,
            )

        return result

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="시간표 분석 서버에 연결할 수 없습니다. Flask 서버가 5002번 포트에서 실행 중인지 확인해 주세요.",
        )

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="시간표 이미지 분석 시간이 초과되었습니다.",
        )