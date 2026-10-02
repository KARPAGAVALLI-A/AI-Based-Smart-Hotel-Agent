from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: str
    text: str | None = None
    message: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    language: str
    intent: str
    reply_text: str
    cart: dict
    ui_events: list[dict]
    menu_matches: list[dict]
    source: str


class VoiceChatResponse(ChatResponse):
    transcript: str
    audio_reply_base64: str | None = None


class ReservationRequest(BaseModel):
    name: str
    phone: str
    date: str
    time: str
    guests: int
    table_type: str | None = "Table 1"
    
    special_requests: str | None = None


class CateringRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    event_type: str
    event_date: str
    guest_count: int
    selected_items: list[str] = []
    budget_range: str | None = None


class ReviewRequest(BaseModel):
    author: str
    rating: int
    comment: str
    dish_id: str | None = None


class KitchenStatusUpdate(BaseModel):
    order_id: str
    status: str  # pending, cooking, ready, delivered


class CartItemAddRequest(BaseModel):
    session_id: str
    item_id: str | None = None
    item_name: str | None = None
    name_en: str | None = None
    name_ta: str | None = None
    price: float | None = None
    unit_price: float | None = None
    quantity: int = 1
    customizations: list[str] = []
    instructions: str | None = None


class CartItemUpdateRequest(BaseModel):
    session_id: str
    item_id: str
    customizations: list[str] = []
    quantity: int = 1


class CartItemRemoveRequest(BaseModel):
    session_id: str
    item_id: str
    customizations: list[str] = []


class CheckoutOrderRequest(BaseModel):
    session_id: str
    customer_name: str
    phone: str
    address: str
    special_notes: str | None = None
    payment_method: str = "UPI"

