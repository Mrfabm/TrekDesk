from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import os
import shutil

from ..database import get_db
from ..models.user import User, UserRole
from ..models.booking import Booking, BookingStatus
from ..models.authorization import AuthorizationRequest, Appeal
from ..utils.auth import get_current_user
from .notifications import create_simple_notification

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads", "proof_documents")

router = APIRouter()

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class AuthRequestCreate(BaseModel):
    booking_id: int
    reason: str
    deadline_days: int = 7          # how many days the authorizer has to respond
    proof_documents: Optional[str] = None

class AuthorizeAction(BaseModel):
    authorizer_notes: Optional[str] = None

class DeclineAction(BaseModel):
    authorizer_notes: str

class AppealCreate(BaseModel):
    appeal_notes: str
    appeal_documents: Optional[str] = None

class AppealReview(BaseModel):
    decision: str       # "approved" | "rejected"
    reviewed_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_request_to_dict(req: AuthorizationRequest) -> dict:
    appeal = None
    if req.appeal:
        appeal = {
            "id": req.appeal.id,
            "appeal_notes": req.appeal.appeal_notes,
            "appeal_documents": req.appeal.appeal_documents,
            "status": req.appeal.status,
            "created_at": req.appeal.created_at,
        }
    return {
        "id": req.id,
        "booking_id": req.booking_id,
        "booking_name": req.booking.booking_name if req.booking else None,
        "reason": req.reason,
        "proof_documents": req.proof_documents,
        "deadline": req.deadline,
        "status": req.status,
        "auto_flagged": req.auto_flagged,
        "authorizer_notes": req.authorizer_notes,
        "requested_by": req.requested_by,
        "requester_email": req.requester.email if req.requester else None,
        "created_at": req.created_at,
        "appeal": appeal,
    }


def create_auth_request_for_booking(
    db: Session,
    booking: Booking,
    reason: str,
    requested_by_id: int,
    auto_flagged: bool = False,
    deadline_days: int = 7,
    proof_documents: Optional[str] = None,
) -> AuthorizationRequest:
    """
    Idempotent: if a pending request already exists for this booking, return it.
    """
    existing = (
        db.query(AuthorizationRequest)
        .filter(
            AuthorizationRequest.booking_id == booking.id,
            AuthorizationRequest.status == "pending",
        )
        .first()
    )
    if existing:
        return existing

    req = AuthorizationRequest(
        booking_id=booking.id,
        reason=reason,
        proof_documents=proof_documents,
        deadline=datetime.utcnow() + timedelta(days=deadline_days),
        status="pending",
        requested_by=requested_by_id,
        auto_flagged=auto_flagged,
    )
    db.add(req)
    db.flush()

    from ..services.email_service import email_authorization_requested
    # Notify all authorizers + admins
    notif_roles = [UserRole.AUTHORIZER, UserRole.ADMIN]
    authorizers = db.query(User).filter(User.role.in_(notif_roles)).all()
    for auth_user in authorizers:
        create_simple_notification(
            db, auth_user.id,
            "Authorization Request",
            f"Booking '{booking.booking_name}' requires authorization. Reason: {reason}",
        )
        if auth_user.email:
            email_authorization_requested(auth_user.email, booking.booking_name, reason)

    return req


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/request")
async def request_authorization(
    data: AuthRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Users can only request authorization for their own bookings
    if current_user.role == UserRole.USER:
        if booking.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only request authorization for your own bookings")
    elif current_user.role not in [UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized to create authorization requests")

    req = create_auth_request_for_booking(
        db, booking,
        reason=data.reason,
        requested_by_id=current_user.id,
        deadline_days=data.deadline_days,
        proof_documents=data.proof_documents,
    )
    db.commit()
    db.refresh(req)
    return _auth_request_to_dict(req)


@router.post("/{request_id}/upload-proof")
async def upload_proof_documents(
    request_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload proof documents (email correspondence, etc.) for an authorization request."""
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")

    # Requester, admin, superuser, or finance_admin can upload
    if current_user.role == UserRole.USER and req.requested_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in [UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed_types = {"application/pdf", "image/jpeg", "image/png", "image/tiff",
                     "message/rfc822", "application/octet-stream"}

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    saved = []
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPEG, PNG, TIFF, EML"
            )
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_name = "".join(c for c in file.filename if c.isalnum() or c in ("-", "_", "."))
        dest = os.path.join(UPLOAD_DIR, f"{request_id}_{timestamp}_{safe_name}")
        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        saved.append(os.path.basename(dest))

    # Append filenames to existing proof_documents (comma-separated)
    existing = req.proof_documents or ""
    all_docs = [d for d in existing.split(",") if d] + saved
    req.proof_documents = ",".join(all_docs)
    db.commit()
    return {"uploaded": saved, "proof_documents": req.proof_documents}


@router.get("/documents/{filename}")
async def serve_proof_document(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve a proof document file. Accessible to authorizers, admins, and superusers."""
    allowed = [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Prevent path traversal
    safe_name = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(file_path, filename=safe_name)


class FlagAuthBody(BaseModel):
    booking_id: int
    reason: str

@router.post("/flag")
async def flag_authorization_needed(
    data: FlagAuthBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Finance-only: notify the booking owner and all admins that authorization
    is needed. Does NOT create an AuthorizationRequest — that is the
    user's or admin's responsibility.
    """
    if current_user.role != UserRole.FINANCE_ADMIN:
        raise HTTPException(status_code=403, detail="Only finance can flag for authorization")

    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    message = (
        f"Finance has flagged booking '{booking.booking_name}' as requiring authorization. "
        f"Reason: {data.reason}. Please submit an authorization request."
    )

    # Notify booking owner
    create_simple_notification(db, booking.user_id, "Authorization Required", message)

    # Notify admins
    admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])).all()
    for admin in admins:
        create_simple_notification(db, admin.id, "Authorization Required", message)

    db.commit()
    return {"message": "Booking owner and admins notified"}


@router.get("/")
async def list_authorization_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    requests = db.query(AuthorizationRequest).order_by(AuthorizationRequest.created_at.desc()).all()
    return [_auth_request_to_dict(r) for r in requests]


@router.get("/booking/{booking_id}")
async def get_booking_auth_requests(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    requests = (
        db.query(AuthorizationRequest)
        .filter(AuthorizationRequest.booking_id == booking_id)
        .order_by(AuthorizationRequest.created_at.desc())
        .all()
    )
    return [_auth_request_to_dict(r) for r in requests]


@router.post("/{request_id}/authorize")
async def authorize_request(
    request_id: int,
    data: AuthorizeAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    from ..services.email_service import email_authorization_approved
    from ..models.booking import Booking, BookingStatus
    req.status = "authorized"
    req.authorizer_id = current_user.id
    req.authorizer_notes = data.authorizer_notes
    # Move booking to AUTHORIZED so permits can be purchased
    booking = db.query(Booking).filter(Booking.id == req.booking_id).first()
    if booking and booking.booking_status == BookingStatus.AWAITING_AUTHORIZATION:
        booking.booking_status = BookingStatus.AUTHORIZED
    db.commit()

    booking_name = req.booking.booking_name

    # Notify requester
    create_simple_notification(
        db, req.requested_by,
        "Authorization Approved",
        f"Authorization for booking '{booking_name}' has been approved.",
    )
    if req.requester and req.requester.email:
        email_authorization_approved(req.requester.email, booking_name)
    # Notify finance + admins so they can proceed with payment validation / permit purchase
    finance_and_admins = db.query(User).filter(
        User.role.in_([UserRole.FINANCE_ADMIN, UserRole.ADMIN, UserRole.SUPERUSER])
    ).all()
    for u in finance_and_admins:
        create_simple_notification(
            db, u.id,
            "Authorization Approved — Action Required",
            f"Booking '{booking_name}' has been authorized. Please proceed with payment validation or permit purchase.",
        )
    db.commit()

    return _auth_request_to_dict(req)


@router.post("/{request_id}/decline")
async def decline_request(
    request_id: int,
    data: DeclineAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")

    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    from ..services.email_service import email_authorization_declined
    req.status = "declined"
    req.authorizer_id = current_user.id
    req.authorizer_notes = data.authorizer_notes
    db.commit()

    # Notify requester — they can now appeal
    create_simple_notification(
        db, req.requested_by,
        "Authorization Declined",
        f"Authorization for booking '{req.booking.booking_name}' was declined. Reason: {data.authorizer_notes}. You may submit an appeal.",
    )
    if req.requester and req.requester.email:
        email_authorization_declined(req.requester.email, req.booking.booking_name, data.authorizer_notes)
    db.commit()

    return _auth_request_to_dict(req)


APPEAL_UPLOAD_DIR = os.path.join(_BASE_DIR, "uploads", "appeal_documents")


@router.post("/{request_id}/upload-appeal-proof")
async def upload_appeal_proof(
    request_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload supporting documents for an appeal."""
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    if not req.appeal:
        raise HTTPException(status_code=404, detail="No appeal found for this request")
    if current_user.role == UserRole.USER and req.requested_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role not in [UserRole.USER, UserRole.ADMIN, UserRole.SUPERUSER, UserRole.FINANCE_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    allowed_types = {"application/pdf", "image/jpeg", "image/png", "image/tiff",
                     "message/rfc822", "application/octet-stream"}
    os.makedirs(APPEAL_UPLOAD_DIR, exist_ok=True)
    saved = []
    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPEG, PNG, TIFF, EML"
            )
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_name = "".join(c for c in file.filename if c.isalnum() or c in ("-", "_", "."))
        dest = os.path.join(APPEAL_UPLOAD_DIR, f"appeal_{request_id}_{timestamp}_{safe_name}")
        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        saved.append(os.path.basename(dest))

    existing = req.appeal.appeal_documents or ""
    all_docs = [d for d in existing.split(",") if d] + saved
    req.appeal.appeal_documents = ",".join(all_docs)
    db.commit()
    return {"uploaded": saved, "appeal_documents": req.appeal.appeal_documents}


@router.post("/{request_id}/appeal")
async def submit_appeal(
    request_id: int,
    data: AppealCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Authorization request not found")
    if req.status != "declined":
        raise HTTPException(status_code=400, detail="Can only appeal a declined request")
    if req.appeal:
        raise HTTPException(status_code=400, detail="Appeal already submitted for this request")

    appeal = Appeal(
        authorization_request_id=request_id,
        appeal_notes=data.appeal_notes,
        appeal_documents=data.appeal_documents,
        status="pending",
    )
    db.add(appeal)
    db.commit()

    # Notify authorizers
    authorizers = db.query(User).filter(
        User.role.in_([UserRole.AUTHORIZER, UserRole.ADMIN])
    ).all()
    for a in authorizers:  # noqa: E741
        create_simple_notification(
            db, a.id,
            "Appeal Submitted",
            f"An appeal was submitted for booking '{req.booking.booking_name}'.",
        )
    db.commit()

    db.refresh(appeal)
    return {
        "id": appeal.id,
        "authorization_request_id": appeal.authorization_request_id,
        "appeal_notes": appeal.appeal_notes,
        "appeal_documents": appeal.appeal_documents,
        "status": appeal.status,
        "created_at": appeal.created_at,
    }


@router.post("/appeals/{appeal_id}/review")
async def review_appeal(
    appeal_id: int,
    data: AppealReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [UserRole.AUTHORIZER, UserRole.ADMIN, UserRole.SUPERUSER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")

    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    if appeal.status != "pending":
        raise HTTPException(status_code=400, detail=f"Appeal is already {appeal.status}")

    appeal.status = data.decision
    appeal.reviewed_by = current_user.id

    auth_req = appeal.authorization_request
    booking_name = auth_req.booking.booking_name

    # If appeal approved → reopen the authorization request as pending
    if data.decision == "approved":
        auth_req.status = "pending"
        auth_req.authorizer_id = None
        auth_req.authorizer_notes = data.reviewed_notes

    db.commit()

    # Notify requester
    create_simple_notification(
        db, auth_req.requested_by,
        "Appeal Reviewed",
        f"Your appeal for booking '{booking_name}' was {data.decision}.",
    )

    # On rejection notify admins/superusers so they can decide next steps (chase/release)
    if data.decision == "rejected":
        admins = db.query(User).filter(
            User.role.in_([UserRole.ADMIN, UserRole.SUPERUSER])
        ).all()
        for admin in admins:
            create_simple_notification(
                db, admin.id,
                "Appeal Rejected — Action Required",
                f"The appeal for booking '{booking_name}' was rejected. Please review and decide next steps.",
            )

    db.commit()

    return {
        "id": appeal.id,
        "status": appeal.status,
        "reviewed_by": appeal.reviewed_by,
    }
