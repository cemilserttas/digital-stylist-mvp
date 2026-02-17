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

class Genre(str, Enum):
    HOMME = "Homme"
    FEMME = "Femme"

class ItemCategory(str, Enum):
    WARDROBE = "wardrobe"
    WISHLIST = "wishlist"

# Shared properties
class UserBase(SQLModel):
    prenom: str
    morphologie: Morphology
    genre: str = Field(default="Homme")
    age: int = Field(default=25)
    style_prefere: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Database model
class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    clothing_items: List["ClothingItem"] = Relationship(back_populates="user")
    link_clicks: List["LinkClick"] = Relationship(back_populates="user")

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
    category: str = Field(default="wardrobe")
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

# Link Click History
class LinkClickBase(SQLModel):
    product_name: str
    marque: str
    prix: float
    url: str
    clicked_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: int = Field(foreign_key="user.id")

class LinkClick(LinkClickBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user: Optional[User] = Relationship(back_populates="link_clicks")

class LinkClickCreate(SQLModel):
    product_name: str
    marque: str
    prix: float
    url: str

class LinkClickRead(LinkClickBase):
    id: int
