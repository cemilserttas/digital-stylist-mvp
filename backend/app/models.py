from typing import Optional, List
from datetime import datetime, timezone, date
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

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
    created_at: datetime = Field(default_factory=_utcnow)

# Database model
class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: Optional[str] = Field(default=None, exclude=True)
    is_premium: bool = Field(default=False)
    premium_until: Optional[datetime] = Field(default=None)
    referral_code: Optional[str] = Field(default=None, unique=True, index=True)
    referred_by_id: Optional[int] = Field(default=None, foreign_key="user.id")
    referral_count: int = Field(default=0)
    # Freemium daily usage counters
    suggestions_date: Optional[date] = Field(default=None)
    suggestions_count_today: int = Field(default=0)
    chat_date: Optional[date] = Field(default=None)
    chat_count_today: int = Field(default=0)
    clothing_items: List["ClothingItem"] = Relationship(back_populates="user")
    link_clicks: List["LinkClick"] = Relationship(back_populates="user")
    outfit_plans: List["OutfitPlan"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    password: str
    referral_code: Optional[str] = None  # code of the person who referred this user

class UserRead(UserBase):
    id: int
    is_premium: bool = False
    premium_until: Optional[datetime] = None
    referral_code: Optional[str] = None
    referral_count: int = 0

# Shared properties
class ClothingItemBase(SQLModel):
    type: str
    couleur: str
    saison: str
    tags_ia: Optional[str] = None
    image_path: str
    category: str = Field(default="wardrobe")
    created_at: datetime = Field(default_factory=_utcnow)
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
    clicked_at: datetime = Field(default_factory=_utcnow)
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


# Outfit Planning Calendar
class OutfitPlanBase(SQLModel):
    date: str  # ISO date YYYY-MM-DD
    occasion: Optional[str] = None
    notes: Optional[str] = None
    item_ids: str = Field(default="[]")  # JSON array of ClothingItem ids
    created_at: datetime = Field(default_factory=_utcnow)
    user_id: int = Field(foreign_key="user.id")


class OutfitPlan(OutfitPlanBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user: Optional["User"] = Relationship(back_populates="outfit_plans")


class OutfitPlanCreate(SQLModel):
    date: str
    item_ids: list[int] = []
    occasion: Optional[str] = None
    notes: Optional[str] = None


class OutfitPlanRead(OutfitPlanBase):
    id: int
