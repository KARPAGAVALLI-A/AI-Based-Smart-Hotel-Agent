"""
cart_service.py
----------------
Session-scoped unified Live Hotel Bill state machine.
Tracks:
  - Hotel Room Bookings (Deluxe Room, Premium Room, Suite Room, nights, rates)
  - Food Orders (Dishes, quantities, customizations)
  - Hotel Guest Services (Room service, laundry, airport shuttle, extra bed, spa)
  - Taxes (GST) & Promotional Discounts
  - Live Payment Status (UNPAID / PAID) with Transaction Details
"""

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

GST_RATE = 0.05          # 5% uniform GST
DELIVERY_FEE = 30.0      # flat delivery fee for takeaway/delivery


class CheckoutStage(str, Enum):
    ORDERING = "ordering"
    AWAITING_PAYMENT_METHOD = "awaiting_payment_method"
    AWAITING_PAYMENT_CONFIRMATION = "awaiting_payment_confirmation"
    CONFIRMED = "confirmed"


class PaymentStatus(str, Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"


@dataclass
class RoomBooking:
    room_id: str
    name: str
    price_per_night: float
    nights: int = 1
    check_in: str | None = None
    guests: int = 2

    @property
    def line_total(self) -> float:
        return self.price_per_night * self.nights

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "name": self.name,
            "room_name": self.name,
            "price_per_night": self.price_per_night,
            "nights": self.nights,
            "check_in": self.check_in or "Today",
            "guests": self.guests,
            "line_total": self.line_total,
        }


@dataclass
class ServiceItem:
    service_id: str
    name: str
    unit_price: float
    quantity: int = 1

    @property
    def line_total(self) -> float:
        return self.unit_price * self.quantity

    def to_dict(self) -> dict:
        return {
            "service_id": self.service_id,
            "name": self.name,
            "service_name": self.name,
            "unit_price": self.unit_price,
            "quantity": self.quantity,
            "line_total": self.line_total,
        }


@dataclass
class CartLine:
    item_id: str
    name_en: str
    name_ta: str
    unit_price: float
    quantity: int
    customizations: list[str] = field(default_factory=list)

    @property
    def line_total(self) -> float:
        return self.unit_price * self.quantity

    def to_dict(self) -> dict:
        return {
            "item_id": self.item_id,
            "name_en": self.name_en,
            "name_ta": self.name_ta,
            "unit_price": self.unit_price,
            "quantity": self.quantity,
            "customizations": self.customizations,
            "line_total": self.line_total,
        }


@dataclass
class CartState:
    session_id: str
    lines: dict[str, CartLine] = field(default_factory=dict)
    rooms: dict[str, RoomBooking] = field(default_factory=dict)
    services: dict[str, ServiceItem] = field(default_factory=dict)
    stage: CheckoutStage = CheckoutStage.ORDERING
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    payment_method: str | None = None
    payment_details: dict | None = None
    order_id: str | None = None
    promo_code: str | None = None

    def line_key(self, item_id: str, customizations: list[str]) -> str:
        return item_id + "|" + ",".join(sorted(customizations))

    # --- Food Items ---
    def add_item(self, item: dict, quantity: int, customizations: list[str] | None = None, unit_price: float | None = None):
        customizations = customizations or []
        key = self.line_key(item["id"], customizations)
        price = float(unit_price if unit_price is not None else item.get("price", 0))
        if key in self.lines:
            self.lines[key].quantity += quantity
        else:
            self.lines[key] = CartLine(
                item_id=item["id"],
                name_en=item.get("name_en", "Item"),
                name_ta=item.get("name_ta", item.get("name_en", "Item")),
                unit_price=price,
                quantity=quantity,
                customizations=customizations,
            )
        # Reset payment status if new items added after payment
        if self.payment_status == PaymentStatus.PAID:
            self.payment_status = PaymentStatus.UNPAID
            self.payment_details = None

    def set_line_quantity(self, item_id: str, customizations: list[str] | None, quantity: int):
        customizations = customizations or []
        key = self.line_key(item_id, customizations)
        if key in self.lines:
            if quantity <= 0:
                del self.lines[key]
            else:
                self.lines[key].quantity = quantity
        elif quantity > 0:
            for k, line in list(self.lines.items()):
                if line.item_id == item_id:
                    self.lines[k].quantity = quantity
                    return

    def remove_item(self, item_id: str, quantity: int | None = None) -> bool:
        matches = [k for k, v in self.lines.items() if v.item_id == item_id or item_id.lower() in v.name_en.lower()]
        if not matches:
            return False
        for k in matches:
            if quantity is None or self.lines[k].quantity <= quantity:
                del self.lines[k]
            else:
                self.lines[k].quantity -= quantity
        return True

    def remove_exact_line(self, item_id: str, customizations: list[str] | None = None) -> bool:
        customizations = customizations or []
        key = self.line_key(item_id, customizations)
        if key in self.lines:
            del self.lines[key]
            return True
        return self.remove_item(item_id)

    def clear_food_orders(self):
        self.lines.clear()

    # --- Room Bookings ---
    def add_room(self, room: dict, nights: int = 1, check_in: str | None = None, guests: int = 2) -> RoomBooking:
        room_id = room.get("id", "deluxe")
        price = float(room.get("price", 3000))
        name = room.get("name", "Deluxe Room")
        if room_id in self.rooms:
            self.rooms[room_id].nights += nights
        else:
            self.rooms[room_id] = RoomBooking(
                room_id=room_id,
                name=name,
                price_per_night=price,
                nights=nights,
                check_in=check_in,
                guests=guests,
            )
        if self.payment_status == PaymentStatus.PAID:
            self.payment_status = PaymentStatus.UNPAID
            self.payment_details = None
        return self.rooms[room_id]

    def remove_room(self, room_id_or_name: str) -> bool:
        lowered = room_id_or_name.lower().strip()
        matched_keys = [k for k, v in self.rooms.items() if k == lowered or lowered in v.name.lower()]
        if not matched_keys:
            return False
        for k in matched_keys:
            del self.rooms[k]
        return True

    def clear_rooms(self):
        self.rooms.clear()

    # --- Hotel Services ---
    def add_service(self, service: dict, quantity: int = 1) -> ServiceItem:
        service_id = service.get("id", "srv-room")
        price = float(service.get("price", 200))
        name = service.get("name", "Room Service")
        if service_id in self.services:
            self.services[service_id].quantity += quantity
        else:
            self.services[service_id] = ServiceItem(
                service_id=service_id,
                name=name,
                unit_price=price,
                quantity=quantity,
            )
        if self.payment_status == PaymentStatus.PAID:
            self.payment_status = PaymentStatus.UNPAID
            self.payment_details = None
        return self.services[service_id]

    def remove_service(self, service_id_or_name: str) -> bool:
        lowered = service_id_or_name.lower().strip()
        matched_keys = [k for k, v in self.services.items() if k == lowered or lowered in v.name.lower()]
        if not matched_keys:
            return False
        for k in matched_keys:
            del self.services[k]
        return True

    def clear_services(self):
        self.services.clear()

    # --- Financial Calculations ---
    def room_subtotal(self) -> float:
        return sum(r.line_total for r in self.rooms.values())

    def food_subtotal(self) -> float:
        return sum(line.line_total for line in self.lines.values())

    def service_subtotal(self) -> float:
        return sum(s.line_total for s in self.services.values())

    def subtotal(self) -> float:
        return self.room_subtotal() + self.food_subtotal() + self.service_subtotal()

    def discount(self) -> float:
        if not self.promo_code:
            return 0.0
        code = self.promo_code.upper().strip()
        sub = self.subtotal()
        if code == "KPR15":
            return round(sub * 0.15, 2)
        elif code == "KPR50":
            return min(50.0, sub)
        elif code == "WELCOME":
            return min(100.0, sub)
        elif code == "FESTIVAL":
            return round(min(120.0, sub * 0.20), 2)
        return 0.0

    def tax(self) -> float:
        taxable = max(0.0, self.subtotal() - self.discount())
        return round(taxable * GST_RATE, 2)

    def delivery_fee(self) -> float:
        # Free delivery if room booked, or cart empty, or food subtotal >= 300
        if self.is_empty() or bool(self.rooms):
            return 0.0
        if self.food_subtotal() >= 300.0:
            return 0.0
        return DELIVERY_FEE if bool(self.lines) else 0.0

    def total(self) -> float:
        tot = self.subtotal() - self.discount() + self.tax() + self.delivery_fee()
        return round(max(0.0, tot), 2)

    def is_empty(self) -> bool:
        return len(self.lines) == 0 and len(self.rooms) == 0 and len(self.services) == 0

    # --- Payment Handling ---
    def process_payment(self, method: str = "UPI", transaction_id: str | None = None) -> dict:
        tot = self.total()
        txn = transaction_id or f"TXN-KPR-{int(time.time() * 1000) % 9000000 + 1000000}"
        self.payment_status = PaymentStatus.PAID
        self.payment_method = method
        self.stage = CheckoutStage.CONFIRMED
        self.order_id = self.order_id or f"KPR-ORD-{abs(hash(self.session_id + txn)) % 9000 + 1000}"
        self.payment_details = {
            "transaction_id": txn,
            "method": method,
            "amount": tot,
            "paid_at": datetime.now().strftime("%Y-%m-%d %I:%M %p"),
            "status": "PAID",
        }
        return self.payment_details

    def to_dict(self) -> dict:
        disc = self.discount()
        return {
            "session_id": self.session_id,
            "stage": self.stage.value,
            "payment_status": self.payment_status.value,
            "payment_method": self.payment_method,
            "payment_details": self.payment_details,
            "order_id": self.order_id or f"ORD-{abs(hash(self.session_id)) % 9000 + 1000}",
            "promo_code": self.promo_code,
            "discount_amount": disc,
            "savings_text": f"You saved ₹{int(disc)}" if disc > 0 else "",
            # Sections
            "rooms": [r.to_dict() for r in self.rooms.values()],
            "items": [l.to_dict() for l in self.lines.values()],
            "services": [s.to_dict() for s in self.services.values()],
            # Breakdown
            "room_subtotal": round(self.room_subtotal(), 2),
            "food_subtotal": round(self.food_subtotal(), 2),
            "service_subtotal": round(self.service_subtotal(), 2),
            "subtotal": round(self.subtotal(), 2),
            "tax": self.tax(),
            "delivery_fee": self.delivery_fee(),
            "total": self.total(),
            "is_empty": self.is_empty(),
        }


class CartStore:
    def __init__(self):
        self._sessions: dict[str, CartState] = {}

    def get_or_create(self, session_id: str) -> CartState:
        if session_id not in self._sessions:
            self._sessions[session_id] = CartState(session_id=session_id)
        return self._sessions[session_id]

    def reset(self, session_id: str):
        self._sessions[session_id] = CartState(session_id=session_id)


cart_store = CartStore()
