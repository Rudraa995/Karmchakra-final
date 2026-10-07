
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import TreeSubmission
from ..schemas import TreeResponse
from ..services.verification import verify_tree_submission


router = APIRouter(
    prefix="/api/trees",
    tags=["Trees"]
)

# app/routes/tree.py -> app/uploads/trees
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "uploads",
    "trees"
)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/", response_model=TreeResponse)
async def submit_tree(
    tree_photo: UploadFile = File(...),
    tree_name: str = Form(...),
    location: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Validate tree name
    tree_name = tree_name.strip()

    if len(tree_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Tree name must contain at least 2 characters."
        )

    if len(tree_name) > 100:
        raise HTTPException(
            status_code=400,
            detail="Tree name cannot exceed 100 characters."
        )

    # 2. Validate description
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

    # 3. Validate GPS coordinates
    if not -90 <= latitude <= 90:
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude."
        )

    if not -180 <= longitude <= 180:
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude."
        )

    # 4. Validate location
    location = location.strip()

    if not location:
        raise HTTPException(
            status_code=400,
            detail="Location is required."
        )

    # 5. Validate image type
    if tree_photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed."
        )

    # 6. Read and validate image size
    file_data = await tree_photo.read()

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

    # 7. Generate a safe filename
    original_filename = tree_photo.filename or ""
    extension = os.path.splitext(original_filename)[1].lower()

    if extension not in {".jpg", ".jpeg", ".png"}:
        extension = ".jpg" if tree_photo.content_type == "image/jpeg" else ".png"

    filename = f"{uuid.uuid4().hex}{extension}"

    # 8. Create upload directory and save image
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as file:
            file.write(file_data)

        # 9. Basic verification
        is_valid = verify_tree_submission(
            tree_name=tree_name,
            latitude=latitude,
            longitude=longitude,
            description=description
        )

        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Submission failed verification."
            )

        # 10. Create database record
        tree = TreeSubmission(
            tree_name=tree_name,
            location=location,
            latitude=latitude,
            longitude=longitude,
            description=description,
            photo_path=f"/uploads/trees/{filename}",
            status="pending"
        )

        # 11. Save record to database
        db.add(tree)
        db.commit()
        db.refresh(tree)

        # 12. Return saved record
        return tree

    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    except Exception:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise


@router.get("/", response_model=list[TreeResponse])
def get_tree_submissions(db: Session = Depends(get_db)):
    trees = (
        db.query(TreeSubmission)
        .order_by(TreeSubmission.id.desc())
        .all()
    )

    return trees