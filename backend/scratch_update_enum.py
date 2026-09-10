from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    conn.execution_options(isolation_level="AUTOCOMMIT")
    conn.execute(text("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'WORK_REPORT_CREATED';"))
    print("Successfully added 'WORK_REPORT_CREATED' to audit_action PostgreSQL ENUM.")
