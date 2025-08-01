from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import os
import csv
from fastapi.responses import StreamingResponse
import io

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://saishanmukh:password@localhost/inventoryMgmt")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    department = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    assets = relationship("Asset", back_populates="assigned_user")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    asset_tag = Column(String, unique=True, index=True)
    category = Column(String)
    description = Column(String)
    serial_number = Column(String)
    purchase_date = Column(DateTime)
    status = Column(String, default="available")  # available, assigned, maintenance
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    assigned_user = relationship("User", back_populates="assets")

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class UserCreate(BaseModel):
    name: str
    email: str
    department: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    department: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AssetCreate(BaseModel):
    name: str
    asset_tag: str
    category: str
    description: str
    serial_number: str
    purchase_date: datetime

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None

class AssetResponse(BaseModel):
    id: int
    name: str
    asset_tag: str
    category: str
    description: str
    serial_number: str
    purchase_date: datetime
    status: str
    assigned_user_id: Optional[int]
    assigned_at: Optional[datetime]
    created_at: datetime
    assigned_user: Optional[UserResponse]
    
    class Config:
        from_attributes = True

class AssetAssignment(BaseModel):
    asset_id: int
    user_id: int

# FastAPI app
app = FastAPI(title="Inventory Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User endpoints
@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Unassign all assets from this user
    db.query(Asset).filter(Asset.assigned_user_id == user_id).update({
        "assigned_user_id": None,
        "assigned_at": None,
        "status": "available"
    })
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

# Asset endpoints
@app.post("/assets/", response_model=AssetResponse)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    db_asset = Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@app.get("/assets/", response_model=List[AssetResponse])
def get_assets(db: Session = Depends(get_db)):
    return db.query(Asset).all()

@app.get("/assets/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@app.put("/assets/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, asset_update: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    for field, value in asset_update.dict(exclude_unset=True).items():
        setattr(asset, field, value)
    
    db.commit()
    db.refresh(asset)
    return asset

@app.delete("/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted successfully"}

# Asset assignment endpoints
@app.post("/assets/assign")
def assign_asset(assignment: AssetAssignment, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == assignment.asset_id).first()
    user = db.query(User).filter(User.id == assignment.user_id).first()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if asset.status == "assigned":
        raise HTTPException(status_code=400, detail="Asset is already assigned")
    
    asset.assigned_user_id = assignment.user_id
    asset.assigned_at = datetime.utcnow()
    asset.status = "assigned"
    
    db.commit()
    return {"message": "Asset assigned successfully"}

@app.post("/assets/{asset_id}/unassign")
def unassign_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.assigned_user_id = None
    asset.assigned_at = None
    asset.status = "available"
    
    db.commit()
    return {"message": "Asset unassigned successfully"}

@app.get("/users/{user_id}/assets", response_model=List[AssetResponse])
def get_user_assets(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db.query(Asset).filter(Asset.assigned_user_id == user_id).all()

@app.get("/assets/available", response_model=List[AssetResponse])
def get_available_assets(db: Session = Depends(get_db)):
    return db.query(Asset).filter(Asset.status == "available").all()

@app.post("/import/users/")
async def import_users_from_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    decoded = content.decode("utf-8").splitlines()
    reader = csv.DictReader(decoded)
    imported = 0
    for row in reader:
        if not row.get("name") or not row.get("email") or not row.get("department"):
            continue  # skip incomplete rows
        # Check for existing user by email
        if db.query(User).filter(User.email == row["email"]).first():
            continue
        user = User(
            name=row["name"],
            email=row["email"],
            department=row["department"]
        )
        db.add(user)
        imported += 1
    db.commit()
    return {"message": f"Imported {imported} users."}

@app.post("/import/assets/")
async def import_assets_from_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    content = await file.read()
    decoded = content.decode("utf-8").splitlines()
    reader = csv.DictReader(decoded)
    imported = 0
    for row in reader:
        if not row.get("name") or not row.get("asset_tag") or not row.get("category"):
            continue  # skip incomplete rows
        # Check for existing asset by asset_tag
        if db.query(Asset).filter(Asset.asset_tag == row["asset_tag"]).first():
            continue
        asset = Asset(
            name=row["name"],
            asset_tag=row["asset_tag"],
            category=row["category"],
            description=row.get("description", ""),
            serial_number=row.get("serial_number", ""),
            purchase_date=row.get("purchase_date", datetime.utcnow()),
            status=row.get("status", "available")
        )
        db.add(asset)
        imported += 1
    db.commit()
    return {"message": f"Imported {imported} assets."}

@app.get("/export/assets/")
def export_assets(db: Session = Depends(get_db)):
    assets = db.query(Asset).all()
    output = io.StringIO()
    writer = csv.writer(output)
    # Write header
    writer.writerow([
        "id", "name", "asset_tag", "category", "description", "serial_number",
        "purchase_date", "status", "assigned_user_id", "assigned_at", "created_at"
    ])
    # Write data rows
    for asset in assets:
        writer.writerow([
            asset.id,
            asset.name,
            asset.asset_tag,
            asset.category,
            asset.description,
            asset.serial_number,
            asset.purchase_date.strftime("%Y-%m-%d") if asset.purchase_date else "",
            asset.status,
            asset.assigned_user_id if asset.assigned_user_id else "",
            asset.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if asset.assigned_at else "",
            asset.created_at.strftime("%Y-%m-%d %H:%M:%S") if asset.created_at else ""
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets.csv"}
    )

@app.get("/export/users/")
def export_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    output = io.StringIO()
    writer = csv.writer(output)
    # Write header
    writer.writerow(["id", "name", "email", "department", "created_at"])
    # Write data rows
    for user in users:
        writer.writerow([
            user.id,
            user.name,
            user.email,
            user.department,
            user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else ""
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)