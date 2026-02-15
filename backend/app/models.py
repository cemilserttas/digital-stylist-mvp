from typing import Optional, List
from datetime import datetime
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship

class Morphology(str, Enum):
    TRIANGLE = "TRIANGLE"
    OVALE = "OVALE"
    RECTANGLE = "RECTANGLE"
    SABLIER = "SABLIER"
    TRAPEZE = "TRAPEZE"

# Shared properties
class UserBase(SQLModel):
    prenom: str
    morphologie: Morphology
    style_prefere: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Database model
class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    clothing_items: List["ClothingItem"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: int

# Shared properties
class ClothingItemBase(SQLModel):
    type: str
    couleur: str
    saison: str
    tags_ia: Optional[str] = None
    image_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: int = Field(foreign_key="user.id")

# Database model
class ClothingItem(ClothingItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user: Optional[User] = Relationship(back_populates="clothing_items")

class ClothingItemCreate(ClothingItemBase):
    pass

class ClothingItemRead(ClothingItemBase):
    id: int
