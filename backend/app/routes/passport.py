from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.passport_data import PassportData
from ..models.user import User
from ..utils.auth import get_current_user
from datetime import datetime
import shutil
import os
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import date
import logging
from ..utils.passport_extractor import PassportExtractor
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Absolute path for uploads so os.path.exists() works regardless of working directory
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads", "passports")

class PassportDataCreate(BaseModel):
    full_name: str
    date_of_birth: date
    passport_number: str
    passport_expiry: date

class ExtractRequest(BaseModel):
    file_paths: List[str]
    booking_id: Optional[int] = None

class ExtractionResult(BaseModel):
    status: str
    data: Optional[Dict] = None
    missing_fields: Optional[List[str]] = None
    error: Optional[str] = None

class UploadResponse(BaseModel):
    filename: str
    path: str
    status: str
    error: Optional[str] = None

@router.post("")
async def create_passport_data(
    passport_data: PassportDataCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if passport number already exists for this user
    existing_passport = db.query(PassportData).filter(
        PassportData.user_id == current_user.id,
        PassportData.passport_number == passport_data.passport_number
    ).first()

    if existing_passport:
        # Update existing passport data
        for key, value in passport_data.model_dump().items():
            setattr(existing_passport, key, value)
        try:
            db.commit()
            db.refresh(existing_passport)
            return existing_passport
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    else:
        # Create new passport data
        db_passport = PassportData(
            full_name=passport_data.full_name,
            date_of_birth=passport_data.date_of_birth,
            passport_number=passport_data.passport_number,
            passport_expiry=passport_data.passport_expiry,
            user_id=current_user.id
        )
        
        try:
            db.add(db_passport)
            db.commit()
            db.refresh(db_passport)
            return db_passport
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

@router.post("/upload", response_model=List[UploadResponse])
async def upload_passport_documents(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uploaded_files = []
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Validate file types
    allowed_types = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/tiff': '.tiff'
    }
    
    for file in files:
        try:
            # Check content type
            content_type = file.content_type
            if content_type not in allowed_types:
                uploaded_files.append(UploadResponse(
                    filename=file.filename,
                    path="",
                    status="error",
                    error=f"Unsupported file type: {content_type}. Allowed types: PDF, JPEG, PNG, TIFF"
                ))
                continue

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = "".join(c for c in file.filename if c.isalnum() or c in ('-', '_', '.'))
            file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{timestamp}_{safe_filename}")
            
            # Save file
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                uploaded_files.append(UploadResponse(
                    filename=file.filename,
                    path=file_path,
                    status="success"
                ))
                
            except Exception as e:
                logger.error(f"Error saving file {file.filename}: {str(e)}")
                uploaded_files.append(UploadResponse(
                    filename=file.filename,
                    path="",
                    status="error",
                    error=f"Error saving file: {str(e)}"
                ))
            
        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            uploaded_files.append(UploadResponse(
                filename=file.filename,
                path="",
                status="error",
                error=str(e)
            ))
    
    if not any(f.status == "success" for f in uploaded_files):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "No files were successfully uploaded", "files": [f.dict() for f in uploaded_files]}
        )
    
    return uploaded_files

@router.get("")
async def get_passport_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        passports = db.query(PassportData).filter(
            PassportData.user_id == current_user.id
        ).all()
        
        # Return empty list without error for no passports
        return passports if passports else []
        
    except Exception as e:
        logger.error(f"Error fetching passport data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/extract", response_model=Dict[str, ExtractionResult])
async def extract_passport_data(
    request: ExtractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Extracting data from {len(request.file_paths)} files")
        
        # Initialize passport extractor
        extractor = PassportExtractor()
        results = {}
        
        # Process each file
        for file_path in request.file_paths:
            try:
                if not os.path.exists(file_path):
                    results[file_path] = ExtractionResult(
                        status="error",
                        error=f"File not found: {file_path}"
                    )
                    continue

                # Extract data using GPT-4 Vision
                extracted_data = await extractor.extract_data(file_path, file_path)
                passport_dict = extracted_data.model_dump()
                
                # Check if all required fields are present
                required_fields = ['full_name', 'date_of_birth', 'passport_number', 'passport_expiry']
                missing_fields = [field for field in required_fields if not passport_dict.get(field)]
                
                if missing_fields:
                    results[file_path] = ExtractionResult(
                        status="incomplete",
                        missing_fields=missing_fields,
                        data=passport_dict
                    )
                    continue
                
                # Check if passport already exists
                existing_passport = db.query(PassportData).filter(
                    PassportData.user_id == current_user.id,
                    PassportData.passport_number == passport_dict['passport_number']
                ).first()
                
                if existing_passport:
                    # Update existing passport (skip date fields — keep existing DB values)
                    for key, value in passport_dict.items():
                        if key not in ('date_of_birth', 'passport_expiry') and hasattr(existing_passport, key) and value:
                            setattr(existing_passport, key, value)
                    if request.booking_id:
                        existing_passport.booking_id = request.booking_id
                    db.commit()
                    db.refresh(existing_passport)
                    results[file_path] = ExtractionResult(
                        status="complete",
                        data=existing_passport.model_dump()
                    )
                else:
                    # Parse dates flexibly
                    def parse_date(s):
                        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d %b %Y', '%d %B %Y'):
                            try:
                                return datetime.strptime(s, fmt).date()
                            except (ValueError, TypeError):
                                continue
                        return None

                    dob = parse_date(passport_dict.get('date_of_birth', ''))
                    expiry = parse_date(passport_dict.get('passport_expiry', ''))

                    if not dob or not expiry:
                        # Dates couldn't be parsed — return as incomplete so user can correct
                        missing = []
                        if not dob:
                            missing.append('date_of_birth')
                        if not expiry:
                            missing.append('passport_expiry')
                        results[file_path] = ExtractionResult(
                            status="incomplete",
                            missing_fields=missing,
                            data=passport_dict
                        )
                        continue

                    # Create new passport data
                    db_passport = PassportData(
                        full_name=passport_dict['full_name'],
                        date_of_birth=dob,
                        passport_number=passport_dict['passport_number'],
                        passport_expiry=expiry,
                        nationality=passport_dict.get('nationality'),
                        place_of_birth=passport_dict.get('place_of_birth'),
                        gender=passport_dict.get('gender'),
                        confidence_score=passport_dict.get('confidence_score'),
                        source_file=file_path,
                        user_id=current_user.id,
                        booking_id=request.booking_id
                    )

                    db.add(db_passport)
                    db.commit()
                    db.refresh(db_passport)
                    results[file_path] = ExtractionResult(
                        status="complete",
                        data=db_passport.model_dump()
                    )
                
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {str(e)}")
                results[file_path] = ExtractionResult(
                    status="error",
                    error=str(e)
                )
        
        return results
        
    except Exception as e:
        logger.error(f"Error in extract_passport_data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )