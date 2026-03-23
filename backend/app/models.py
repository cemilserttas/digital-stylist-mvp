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
    # Push notifications
    fcm_token: Optional[str] = Field(default=None, index=True)
    push_notifications_enabled: bool = Field(default=False)
    push_city: Optional[str] = Field(default=None)
    # Streak / gamification
    streak_current: int = Field(default=0)
    streak_max: int = Field(default=0)
    streak_last_activity: Optional[date] = Field(default=None)
    # Email (optional — collected post-onboarding for transactional emails)
    email: Optional[str] = Field(default=None, index=True)
    clothing_items: List["ClothingItem"] = Relationship(back_populates="user")
    link_clicks: List["LinkClick"] = Relationship(back_populates="user")
    outfit_plans: List["OutfitPlan"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    email: str                           # required — used as login identifier
    password: str
    referral_code: Optional[str] = None  # code of the person who referred this user

class UserRead(UserBase):
    id: int
    email: Optional[str] = None
    is_premium: bool = False
    premium_until: Optional[datetime] = None
    referral_code: Optional[str] = None
    referral_count: int = 0
    push_notifications_enabled: bool = False
    streak_current: int = 0
    streak_max: int = 0
    streak_last_activity: Optional[date] = None

# Shared properties
class ClothingItemBase(SQLModel):
    type: str
    couleur: str
    saison: str
    tags_ia: Optional[str] = None
    image_path: str
    category: str = Field(default="wardrobe")
    created_at: datetime = Field(default_factory=_utcnow)
    user_id: int = Field(foreign_key="user.id", index=True)

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
    user_id: int = Field(foreign_key="user.id", index=True)

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
    user_id: int = Field(foreign_key="user.id", index=True)


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


# ---------------------------------------------------------------------------
# AI Request Tracking — every Gemini call is logged
# ---------------------------------------------------------------------------
class ListingStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SOLD = "sold"
    CANCELLED = "cancelled"

class OrderStatus(str, Enum):
    PENDING = "pending"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUND_REQUESTED = "refund_requested"
    REFUNDED = "refunded"

class ListingCondition(str, Enum):
    NEUF = "Neuf avec étiquette"
    TRES_BON = "Très bon état"
    BON = "Bon état"
    SATISFAISANT = "Satisfaisant"


class AIRequestType(str, Enum):
    ANALYZE = "analyze"
    SUGGEST = "suggest"
    CHAT = "chat"
    SCORE = "score"
    PUSH_CRON = "push_cron"


class AIRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    request_type: str = Field(index=True)       # AIRequestType value
    model: str = Field(default="gemini-2.0-flash", index=True)
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    duration_ms: int = Field(default=0)
    status: str = Field(default="success")       # "success" | "error" | "blocked"
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, index=True)


# ---------------------------------------------------------------------------
# Marketplace — e-commerce / resale
# ---------------------------------------------------------------------------
class MarketplaceListing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    seller_id: int = Field(foreign_key="user.id", index=True)
    clothing_item_id: Optional[int] = Field(default=None, foreign_key="clothingitem.id")
    title: str
    description: str = Field(default="")
    price_cents: int  # price in euro cents (2500 = 25.00 EUR)
    condition: str = Field(default="Bon état")
    size: Optional[str] = Field(default=None)
    brand: Optional[str] = Field(default=None, index=True)
    category_type: str = Field(default="")
    color: str = Field(default="")
    season: str = Field(default="")
    image_urls: str = Field(default="[]")  # JSON array of image URLs
    status: str = Field(default="active", index=True)
    views_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=_utcnow, index=True)
    updated_at: datetime = Field(default_factory=_utcnow)


class ListingCreate(SQLModel):
    clothing_item_id: Optional[int] = None
    title: str
    description: str = ""
    price_cents: int
    condition: str = "Bon état"
    size: Optional[str] = None
    brand: Optional[str] = None
    category_type: str = ""
    color: str = ""
    season: str = ""
    image_urls: list[str] = []


class ListingUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    condition: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None


class ListingRead(SQLModel):
    id: int
    seller_id: int
    clothing_item_id: Optional[int] = None
    title: str
    description: str
    price_cents: int
    condition: str
    size: Optional[str] = None
    brand: Optional[str] = None
    category_type: str
    color: str
    season: str
    image_urls: list[str] = []
    status: str
    views_count: int = 0
    created_at: datetime
    seller_prenom: Optional[str] = None


class ShippingAddress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    label: str = Field(default="Maison")
    full_name: str
    line1: str
    line2: Optional[str] = Field(default=None)
    postal_code: str
    city: str
    country: str = Field(default="FR")
    phone: Optional[str] = Field(default=None)
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow)


class ShippingAddressCreate(SQLModel):
    label: str = "Maison"
    full_name: str
    line1: str
    line2: Optional[str] = None
    postal_code: str
    city: str
    country: str = "FR"
    phone: Optional[str] = None
    is_default: bool = False


class ShippingAddressRead(SQLModel):
    id: int
    user_id: int
    label: str
    full_name: str
    line1: str
    line2: Optional[str] = None
    postal_code: str
    city: str
    country: str
    phone: Optional[str] = None
    is_default: bool
    created_at: datetime


class MarketplaceOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplacelisting.id", index=True)
    buyer_id: int = Field(foreign_key="user.id", index=True)
    seller_id: int = Field(foreign_key="user.id", index=True)
    shipping_address_id: int = Field(foreign_key="shippingaddress.id")
    amount_cents: int  # total charged to buyer (item + shipping)
    commission_cents: int  # 10% platform fee
    seller_payout_cents: int  # 90% to seller
    stripe_payment_intent_id: Optional[str] = Field(default=None)
    tracking_number: Optional[str] = Field(default=None)
    tracking_carrier: Optional[str] = Field(default=None)
    status: str = Field(default="pending", index=True)
    paid_at: Optional[datetime] = Field(default=None)
    shipped_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)


class OrderRead(SQLModel):
    id: int
    listing_id: int
    buyer_id: int
    seller_id: int
    amount_cents: int
    commission_cents: int
    seller_payout_cents: int
    status: str
    tracking_number: Optional[str] = None
    tracking_carrier: Optional[str] = None
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    listing_title: Optional[str] = None
    listing_image: Optional[str] = None
    buyer_prenom: Optional[str] = None
    seller_prenom: Optional[str] = None
