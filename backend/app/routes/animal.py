import json
import uuid
from pathlib import Path
from typing import Optional

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
from ..models import (
    FeedAnimalSubmission,
    RescueReport,
    AdoptionHelpSubmission
)
from ..schemas import (
    FeedAnimalResponse,
    RescueResponse,
    AdoptionResponse,
    AnimalHistoryItem,
    AnimalHistoryResponse
)

router = APIRouter(
    prefix="/api/animals",
    tags=["Animal Karma"]
)

UPLOAD_DIR = Path("app/uploads/animals")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_FEED_FILE_SIZE = 20 * 1024 * 1024

IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png"
}

FEED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "video/mp4": ".mp4"
}


async def save_upload(
    upload: UploadFile,
    allowed_types: dict,
    max_size: int
) -> str:
    """Validate and save an uploaded file; return its public URL."""

    if upload.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type."
        )

    content = await upload.read(max_size + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size must not exceed {max_size // (1024 * 1024)} MB."
        )

    extension = allowed_types[upload.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / filename

    try:
        file_path.write_bytes(content)
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="Could not save uploaded file."
        )

    return f"/uploads/animals/{filename}"


def validate_coordinates(
    latitude: Optional[float],
    longitude: Optional[float]
):
    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="Latitude must be between -90 and 90."
        )

    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="Longitude must be between -180 and 180."
        )


def feed_to_response(record: FeedAnimalSubmission):
    return {
        "id": record.id,
        "evidence_paths": json.loads(record.evidence_paths),
        "location": record.location,
        "latitude": record.latitude,
        "longitude": record.longitude,
        "animal_type": record.animal_type,
        "description": record.description,
        "status": record.status,
        "karma_points": record.karma_points,
        "created_at": record.created_at
    }


@router.post(
    "/feed",
    response_model=FeedAnimalResponse,
    status_code=201
)
async def submit_feed_activity(
    proof_media: list[UploadFile] = File(...),
    location: str = Form(...),
    animal_type: str = Form(...),
    description: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """Save a Feed an Animal activity."""

    location = location.strip()
    animal_type = animal_type.strip()
    description = description.strip()

    if not location or not animal_type or not description:
        raise HTTPException(
            status_code=400,
            detail="Location, animal type and description are required."
        )

    if len(proof_media) > 5:
        raise HTTPException(
            status_code=400,
            detail="You can upload a maximum of 5 files."
        )

    validate_coordinates(latitude, longitude)

    saved_paths = []

    try:
        for upload in proof_media:
            path = await save_upload(
                upload,
                FEED_TYPES,
                MAX_FEED_FILE_SIZE
            )
            saved_paths.append(path)

        record = FeedAnimalSubmission(
            evidence_paths=json.dumps(saved_paths),
            location=location,
            latitude=latitude,
            longitude=longitude,
            animal_type=animal_type,
            description=description,
            status="pending",
            karma_points=10
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return feed_to_response(record)

    except Exception:
        db.rollback()

        for path in saved_paths:
            filename = Path(path).name
            local_file = UPLOAD_DIR / filename
            if local_file.exists():
                local_file.unlink()

        raise

    finally:
        for upload in proof_media:
            await upload.close()


@router.post(
    "/rescue",
    response_model=RescueResponse,
    status_code=201
)
async def submit_rescue_report(
    photo: UploadFile = File(...),
    location: str = Form(...),
    description: str = Form(...),
    priority: str = Form("normal"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """Save a Rescue & Report activity."""

    location = location.strip()
    description = description.strip()
    priority = priority.strip().lower()

    if not location or not description:
        raise HTTPException(
            status_code=400,
            detail="Location and description are required."
        )

    if priority not in {"normal", "emergency"}:
        raise HTTPException(
            status_code=400,
            detail="Priority must be normal or emergency."
        )

    validate_coordinates(latitude, longitude)

    saved_path = None

    try:
        saved_path = await save_upload(
            photo,
            IMAGE_TYPES,
            MAX_IMAGE_SIZE
        )

        record = RescueReport(
            photo_path=saved_path,
            location=location,
            latitude=latitude,
            longitude=longitude,
            description=description,
            priority=priority,
            status="pending",
            karma_points=10
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    except Exception:
        db.rollback()

        if saved_path:
            local_file = UPLOAD_DIR / Path(saved_path).name
            if local_file.exists():
                local_file.unlink()

        raise

    finally:
        await photo.close()


@router.post(
    "/adopt",
    response_model=AdoptionResponse,
    status_code=201
)
async def submit_adoption_help(
    photo: UploadFile = File(...),
    animal_name: str = Form(...),
    animal_type: str = Form(...),
    location: str = Form(...),
    details: str = Form(...),
    contact: str = Form(...),
    age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Save an animal adoption/help listing."""

    animal_name = animal_name.strip()
    animal_type = animal_type.strip()
    location = location.strip()
    details = details.strip()
    contact = contact.strip()

    if not all([
        animal_name,
        animal_type,
        location,
        details,
        contact
    ]):
        raise HTTPException(
            status_code=400,
            detail="Animal name, type, location, details and contact are required."
        )

    saved_path = None

    try:
        saved_path = await save_upload(
            photo,
            IMAGE_TYPES,
            MAX_IMAGE_SIZE
        )

        record = AdoptionHelpSubmission(
            photo_path=saved_path,
            animal_name=animal_name,
            animal_type=animal_type,
            age=age.strip() if age else None,
            gender=gender.strip() if gender else None,
            location=location,
            details=details,
            contact=contact,
            status="pending",
            karma_points=20
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    except Exception:
        db.rollback()

        if saved_path:
            local_file = UPLOAD_DIR / Path(saved_path).name
            if local_file.exists():
                local_file.unlink()

        raise

    finally:
        await photo.close()


@router.get(
    "/adopt",
    response_model=list[AdoptionResponse]
)
def get_adoption_listings(
    db: Session = Depends(get_db)
):
    """Return animal listings for the Find Animals section."""

    return (
        db.query(AdoptionHelpSubmission)
        .order_by(AdoptionHelpSubmission.created_at.desc())
        .all()
    )


@router.get(
    "/history",
    response_model=AnimalHistoryResponse
)
def get_animal_history(
    db: Session = Depends(get_db)
):
    """Combine all three activity tables into one Animal History."""

    feed_records = (
        db.query(FeedAnimalSubmission)
        .order_by(FeedAnimalSubmission.created_at.desc())
        .all()
    )

    rescue_records = (
        db.query(RescueReport)
        .order_by(RescueReport.created_at.desc())
        .all()
    )

    adoption_records = (
        db.query(AdoptionHelpSubmission)
        .order_by(AdoptionHelpSubmission.created_at.desc())
        .all()
    )

    history = []

    for record in feed_records:
        history.append(
            AnimalHistoryItem(
                id=record.id,
                activity_type="feed",
                title=f"Fed a {record.animal_type}",
                date=record.created_at,
                location=record.location,
                details=record.description,
                status=record.status,
                karma_points=record.karma_points,
                evidence_paths=json.loads(record.evidence_paths)
            )
        )

    for record in rescue_records:
        history.append(
            AnimalHistoryItem(
                id=record.id,
                activity_type="rescue",
                title="Rescue & Report",
                date=record.created_at,
                location=record.location,
                details=record.description,
                status=record.status,
                karma_points=record.karma_points,
                evidence_paths=[record.photo_path]
            )
        )

    for record in adoption_records:
        history.append(
            AnimalHistoryItem(
                id=record.id,
                activity_type="adopt",
                title=f"Adopt / Help: {record.animal_name}",
                date=record.created_at,
                location=record.location,
                details=record.details,
                status=record.status,
                karma_points=record.karma_points,
                evidence_paths=[record.photo_path]
            )
        )

    history.sort(
        key=lambda item: item.date,
        reverse=True
    )

    total_karma = sum(
        item.karma_points for item in history
    )

    return AnimalHistoryResponse(
        total_karma_points=total_karma,
        feed_count=len(feed_records),
        rescue_count=len(rescue_records),
        adoption_count=len(adoption_records),
        records=history
    )