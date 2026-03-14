from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import os
import logging
from pydantic import BaseModel
from ..utils.auth import get_current_user
from ..utils.voucher_extractor import extract_voucher_data, VoucherData
from ..models import Booking, User
from ..database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads", "vouchers")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ExtractRequest(BaseModel):
    file_paths: List[str]
    booking_id: Optional[int] = None

class ExtractionResult(BaseModel):
    status: str  # "success", "error", "incomplete"
    data: dict = None
    error: str = None
    missing_fields: List[str] = None

@router.post("/upload")
async def upload_voucher(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload voucher files and return their paths"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    results = []
    for file in files:
        try:
            # Validate file type
            if not file.filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": "Invalid file type. Only PDF and image files are allowed.",
                    "path": None
                })
                continue

            # Save file
            safe_name = "".join(c for c in file.filename if c.isalnum() or c in ('-', '_', '.'))
            file_path = os.path.join(UPLOAD_DIR, safe_name)
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "error": None,
                "path": file_path
            })
            
        except Exception as e:
            logger.error(f"Error uploading file {file.filename}: {str(e)}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e),
                "path": None
            })
    
    return results

@router.post("/extract", response_model=Dict[str, ExtractionResult])
async def extract_data(
    request: ExtractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extract data from uploaded vouchers and create/update bookings"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    results = {}
    for file_path in request.file_paths:
        try:
            if not os.path.exists(file_path):
                results[file_path] = ExtractionResult(
                    status="error",
                    error=f"File not found: {file_path}"
                )
                continue
            
            # Extract data from voucher (helper already returns a dict)
            voucher_dict = await extract_voucher_data(file_path)
            
            # Check if all required fields are present
            required_fields = [
                'booking_name', 'booking_reference', 'trek_date',
                'head_of_file', 'request_date', 'product_type', 'number_of_people'
            ]
            missing_fields = [field for field in required_fields if not voucher_dict.get(field)]
            
            if missing_fields:
                results[file_path] = ExtractionResult(
                    status="incomplete",
                    missing_fields=missing_fields,
                    data=voucher_dict
                )
                continue
            
            if request.booking_id:
                # Update the specific booking the user came from
                target_booking = db.query(Booking).filter(
                    Booking.id == request.booking_id
                ).first()
                if target_booking:
                    target_booking.update_from_voucher(voucher_dict)
                    db.commit()
                    logger.info(f"Updated booking {request.booking_id} with voucher data")
                else:
                    logger.warning(f"Booking {request.booking_id} not found, skipping update")
            else:
                # Check if booking already exists by booking reference
                existing_booking = db.query(Booking).filter(
                    Booking.booking_ref == voucher_dict["booking_reference"]
                ).first()

                if existing_booking:
                    existing_booking.update_from_voucher(voucher_dict)
                    db.commit()
                    logger.info(f"Updated existing booking: {existing_booking.booking_ref}")
                else:
                    new_booking = Booking()
                    new_booking.user_id = current_user.id
                    new_booking.update_from_voucher(voucher_dict)
                    db.add(new_booking)
                    db.commit()
                    logger.info(f"Created new booking: {new_booking.booking_ref}")
            
            results[file_path] = ExtractionResult(
                status="success",
                data=voucher_dict
            )
            
        except Exception as e:
            logger.error(f"Error extracting data from {file_path}: {str(e)}")
            results[file_path] = ExtractionResult(
                status="error",
                error=str(e)
            )
        finally:
            # Cleanup uploaded file
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.warning(f"Error cleaning up file {file_path}: {str(e)}")
    
    return results 