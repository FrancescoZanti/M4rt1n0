from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Per sviluppo e test rapidi usiamo SQLite. 
# In produzione su MS SQL Server la stringa sarebbe simile a:
# "mssql+pyodbc://user:password@server/dbname?driver=ODBC+Driver+17+for+SQL+Server"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ceramic_sales.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
