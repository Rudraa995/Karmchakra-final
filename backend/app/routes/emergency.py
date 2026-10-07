import os
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile
)

from sqlalchemy.orm import Session

from ..database import get_db
from ..models import EmergencyReport


router = APIRouter(
    prefix="/api/emergencies",
    tags=["Emergencies"]
)


UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "uploads",
    "emergency"
)


ALLOWED_TYPES = {
    "image/jpeg",
    "image/png"
}


MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/")
async def create_emergency(
    incident_type: str = Form(...),
    incident_photo: UploadFile = File(...),
    location: str = Form(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    description: str = Form(...),
    db: Session = Depends(get_db)
):

    # 1. Validate incident type
    incident_type = incident_type.strip()

    if not incident_type:
        raise HTTPException(
            status_code=400,
            detail="Incident type is required."
        )

    # 2. Validate location
    location = location.strip()

    if not location:
        raise HTTPException(
            status_code=400,
            detail="Location is required."
        )

    # 3. Validate description
    description = description.strip()

    if len(description) < 10:
        raise HTTPException(
            status_code=400,
            detail="Description must contain at least 10 characters."
        )

    if len(description) > 500:
        raise HTTPException(
            status_code=400,
            detail="Description cannot exceed 500 characters."
        )

    # 4. Validate coordinates if provided
    if latitude is not None:
        if not -90 <= latitude <= 90:
            raise HTTPException(
                status_code=400,
                detail="Invalid latitude."
            )

    if longitude is not None:
        if not -180 <= longitude <= 180:
            raise HTTPException(
                status_code=400,
                detail="Invalid longitude."
            )

    # 5. Validate image type
    if incident_photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed."
        )

    # 6. Read image
    file_data = await incident_photo.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty."
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size cannot exceed 10 MB."
        )

    # 7. Generate safe filename
    original_filename = incident_photo.filename or ""

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    if extension not in {".jpg", ".jpeg", ".png"}:
        extension = (
            ".jpg"
            if incident_photo.content_type == "image/jpeg"
            else ".png"
        )

    filename = f"{uuid.uuid4().hex}{extension}"

    # 8. Create upload directory
    os.makedirs(
        UPLOAD_DIR,
        exist_ok=True
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    try:

        # 9. Save image
        with open(file_path, "wb") as file:
            file.write(file_data)

        # 10. Create database record
        emergency = EmergencyReport(
            incident_type=incident_type,
            photo_path=f"/uploads/emergency/{filename}",
            location=location,
            latitude=latitude,
            longitude=longitude,
            description=description,
            status="pending"
        )

        # 11. Save to database
        db.add(emergency)
        db.commit()
        db.refresh(emergency)

        # 12. Return saved record
        return emergency

    except Exception:

        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise


@router.get("/")
def get_emergency_reports(
    db: Session = Depends(get_db)
):

    emergencies = (
        db.query(EmergencyReport)
        .order_by(EmergencyReport.id.desc())
        .all()
    )

    return emergencies