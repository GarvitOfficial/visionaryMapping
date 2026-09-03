import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    if is_serverless:
        tmp_db = "/tmp/ulpin.db"
        if not os.path.exists(tmp_db):
            local_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ulpin.db")
            if os.path.exists(local_db):
                try:
                    shutil.copyfile(local_db, tmp_db)
                except Exception:
                    pass
        db_url = f"sqlite:///{tmp_db}"
    else:
        db_url = "sqlite:///./ulpin.db"

SQLALCHEMY_DATABASE_URL = db_url

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
