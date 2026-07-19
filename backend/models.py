from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    plan: str = Field(default="free")  # "free" | "pro"
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Contact(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    contact_id: Optional[int] = Field(default=None, foreign_key="contact.id")
    title: str
    value: float = 0.0
    stage: str = "Lead"  # one of config.PIPELINE_STAGES
    notes: str = ""
    # P1 additions
    priority: str = "Medium"  # Low | Medium | High
    expected_close_date: Optional[date] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None
    closed_at: Optional[datetime] = None  # set when moved to Won/Lost
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Activity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    deal_id: int = Field(index=True, foreign_key="deal.id")
    type: str = "note"  # note | call | email | meeting | stage_change
    note: str = ""
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AiDraft(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, foreign_key="user.id")
    deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    contact_name: str = ""
    subject: str = ""
    body: str = ""
    next_step: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
