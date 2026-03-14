from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models.agent_client import AgentClient, AgentClientType
from ..models.user import UserRole
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter()


class AgentClientCreate(BaseModel):
    name: str
    type: str = "agent"
    is_trusted: bool = False
    has_rolling_deposit: bool = False
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class AgentClientUpdate(BaseModel):
    name: str
    type: str
    is_trusted: bool
    has_rolling_deposit: bool
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


def _to_dict(ac: AgentClient) -> dict:
    return {
        "id": ac.id,
        "name": ac.name,
        "type": ac.type.value if ac.type else "agent",
        "is_trusted": ac.is_trusted,
        "has_rolling_deposit": ac.has_rolling_deposit,
        "email": ac.email,
        "phone": ac.phone,
        "notes": ac.notes,
        "created_at": ac.created_at.isoformat() if ac.created_at else None,
    }


@router.get("")
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all agents/clients. Accessible to all authenticated users (for booking form dropdown)."""
    agents = db.query(AgentClient).order_by(AgentClient.name).all()
    return [_to_dict(a) for a in agents]


@router.post("")
async def create_agent(
    data: AgentClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.SUPERUSER, UserRole.ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        ac_type = AgentClientType(data.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid type '{data.type}'. Must be 'agent' or 'client'.")

    ac = AgentClient(
        name=data.name,
        type=ac_type,
        is_trusted=data.is_trusted,
        has_rolling_deposit=data.has_rolling_deposit,
        email=data.email,
        phone=data.phone,
        notes=data.notes,
    )
    db.add(ac)
    db.commit()
    db.refresh(ac)
    return _to_dict(ac)


@router.put("/{agent_id}")
async def update_agent(
    agent_id: int,
    data: AgentClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.SUPERUSER, UserRole.ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent/client not found")

    try:
        ac.type = AgentClientType(data.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid type '{data.type}'.")

    ac.name = data.name
    ac.is_trusted = data.is_trusted
    ac.has_rolling_deposit = data.has_rolling_deposit
    ac.email = data.email
    ac.phone = data.phone
    ac.notes = data.notes
    db.commit()
    db.refresh(ac)
    return _to_dict(ac)


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = [UserRole.SUPERUSER, UserRole.ADMIN]
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Not authorized")

    ac = db.query(AgentClient).filter(AgentClient.id == agent_id).first()
    if not ac:
        raise HTTPException(status_code=404, detail="Agent/client not found")

    # Detach bookings before deleting
    for booking in ac.bookings:
        booking.agent_client_id = None
    db.delete(ac)
    db.commit()
    return {"message": "Deleted"}
