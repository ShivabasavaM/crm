from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import inspect, text
from config import settings

# import models so metadata.create_all sees the tables
import models  # noqa: F401

connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

# Columns added after the first release. create_all() only makes missing TABLES,
# not missing COLUMNS, so we add these by hand if they're absent. Idempotent and
# safe on both SQLite (local) and Postgres (Neon).
_DEAL_ADDED_COLUMNS = {
    "priority": "VARCHAR",
    "expected_close_date": "DATE",
    "next_action": "TEXT",
    "next_action_date": "DATE",
    "closed_at": "TIMESTAMP",
}


def _migrate():
    insp = inspect(engine)
    tables = insp.get_table_names()
    if "deal" not in tables:
        return  # fresh DB: create_all already made deal with all columns
    existing = {c["name"] for c in insp.get_columns("deal")}
    with engine.begin() as conn:
        for name, ddl in _DEAL_ADDED_COLUMNS.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE deal ADD COLUMN {name} {ddl}"))


def init_db():
    SQLModel.metadata.create_all(engine)  # creates new tables (e.g. activity)
    _migrate()  # adds new columns to the existing deal table


def get_session():
    with Session(engine) as session:
        yield session
