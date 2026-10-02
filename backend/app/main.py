"""
main.py
-------
FastAPI entrypoint for the KPR Hotel Conversational Food Ordering Agent.

Endpoints
---------
POST /api/chat          text-in / text-out conversation turn
POST /api/voice-chat     audio-in (multipart) -> STT -> orchestrator -> TTS -> audio-out
GET  /api/menu           full menu (for initial frontend render)
GET  /api/cart/{sid}     current cart snapshot
POST /api/cart/reset/{sid}   start a fresh session/order
GET  /api/health           liveness check
"""

import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import (
    ChatRequest, ReservationRequest, CateringRequest, ReviewRequest, KitchenStatusUpdate,
    CartItemAddRequest, CartItemUpdateRequest, CartItemRemoveRequest, CheckoutOrderRequest
)
from app.services.chat_service import process_message
from app.services.cart_service import cart_store
from app.services.menu_service import menu_service
from app.services.knowledge_service import knowledge_service
from app.services.stt_service import transcribe
from app.services.tts_service import synthesize
from app.services.table_service import (
    reservations_db, get_all_reservations, get_table_availability, book_table, ALL_TABLES
)

# In-memory stores for extended features

past_orders_db = [
    {
        "order_id": "KPR-8901",
        "date": "Yesterday, 8:15 PM",
        "total": 540.0,
        "status": "Delivered",
        "items": [
            {"item_id": "bir-001", "name_en": "Chicken Biryani", "quantity": 2, "price": 220},
            {"item_id": "bev-001", "name_en": "Madurai Jigarthanda", "quantity": 1, "price": 80}
        ]
    },
    {
        "order_id": "KPR-8742",
        "date": "27 Sep, 1:30 PM",
        "total": 330.0,
        "status": "Delivered",
        "items": [
            {"item_id": "meals-001", "name_en": "Veg Meals (Full Thali)", "quantity": 2, "price": 150}
        ]
    }
]
catering_quotes_db = []

reviews_db = [
    {
        "id": "rev-1",
        "author": "Karthik R.",
        "rating": 5,
        "comment": "The Seeraga Samba Chicken Biryani is absolutely top tier! Authentic Madurai style flavor.",
        "date": "2026-09-25",
        "dish": "Chicken Biryani"
    },
    {
        "id": "rev-2",
        "author": "Priya S.",
        "rating": 5,
        "comment": "Ordering via Tanglish voice was super fast and convenient. Appalam and Sambar meals felt like home.",
        "date": "2026-09-26",
        "dish": "Veg Meals"
    },
    {
        "id": "rev-3",
        "author": "Anand V.",
        "rating": 4,
        "comment": "Hot crispy Ghee Roast Dosa with coconut chutney was crispy and rich. Highly recommended!",
        "date": "2026-09-27",
        "dish": "Ghee Roast Dosa"
    }
]

kitchen_orders_db = [
    {
        "order_id": "ORD-1082",
        "customer": "Ramesh Kumar",
        "table": "T-04",
        "items": ["Chicken Biryani x2", "Extra Masala x1", "Filter Coffee x2"],
        "status": "cooking",
        "time": "12 mins ago"
    },
    {
        "order_id": "ORD-1083",
        "customer": "Meena Krishnan",
        "table": "Delivery #402",
        "items": ["Veg Meals x1", "Ghee Roast Dosa x1"],
        "status": "pending",
        "time": "5 mins ago"
    },
    {
        "order_id": "ORD-1081",
        "customer": "Santhosh M.",
        "table": "T-09",
        "items": ["Mutton Biryani x1", "Chilli Chicken x1"],
        "status": "ready",
        "time": "18 mins ago"
    }
]

app = FastAPI(
    title="KPR Hotel Conversational Food Ordering Agent",
    description="Multilingual (English/Tamil/Tanglish), multimodal (voice+text) "
                 "food ordering assistant with cart management and UPI checkout.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kpr-hotel-agent"}


@app.get("/api/menu")
def get_menu():
    return {"items": menu_service.all_items()}


@app.get("/api/menu/by-meal-type")
def get_menu_by_meal_type():
    return menu_service.grouped_by_meal_type()


@app.get("/api/cart/{session_id}")
@app.get("/api/bill/{session_id}")
def get_cart(session_id: str):
    return cart_store.get_or_create(session_id).to_dict()


@app.get("/api/rooms")
def get_rooms():
    return {"rooms": knowledge_service.get_rooms()}


@app.get("/api/services")
def get_services():
    return {"services": knowledge_service.get_services()}


@app.post("/api/cart/add-room")
@app.post("/api/bill/add-room")
def add_room_to_bill(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    room_id = payload.get("room_id") or payload.get("id") or payload.get("room_type") or "deluxe"
    nights = int(payload.get("nights", 1))
    cart = cart_store.get_or_create(session_id)
    room = knowledge_service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room type not found")
    booking = cart.add_room(room, nights=nights)
    return {"status": "success", "booking": booking.to_dict(), "cart": cart.to_dict(), "bill": cart.to_dict()}


@app.post("/api/cart/remove-room")
@app.post("/api/bill/remove-room")
def remove_room_from_bill(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    room_id = payload.get("room_id") or payload.get("id") or payload.get("room_type") or "deluxe"
    cart = cart_store.get_or_create(session_id)
    cart.remove_room(room_id)
    return {"status": "success", "cart": cart.to_dict(), "bill": cart.to_dict()}


@app.post("/api/cart/add-service")
@app.post("/api/bill/add-service")
def add_service_to_bill(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    service_id = payload.get("service_id") or payload.get("id") or "srv-room"
    cart = cart_store.get_or_create(session_id)
    service = knowledge_service.get_service(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    item = cart.add_service(service, quantity=int(payload.get("quantity", 1)))
    return {"status": "success", "service": item.to_dict(), "cart": cart.to_dict(), "bill": cart.to_dict()}


@app.post("/api/cart/remove-service")
@app.post("/api/bill/remove-service")
def remove_service_from_bill(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    service_id = payload.get("service_id") or payload.get("id") or "srv-room"
    cart = cart_store.get_or_create(session_id)
    cart.remove_service(service_id)
    return {"status": "success", "cart": cart.to_dict(), "bill": cart.to_dict()}


@app.post("/api/payment/process")
def process_live_payment(payload: dict):
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    cart = cart_store.get_or_create(session_id)
    if cart.is_empty():
        raise HTTPException(status_code=400, detail="Cannot process payment for an empty bill.")

    method = payload.get("method") or payload.get("payment_method") or "UPI"
    total_paid = cart.total()
    payment_details = cart.process_payment(method=method)

    cart_dict = cart.to_dict()
    items = cart_dict.get("items", [])
    rooms = cart_dict.get("rooms", [])
    services = cart_dict.get("services", [])

    order_id = cart.order_id or f"KPR-ORD-{abs(hash(session_id)) % 9000 + 1000}"

    if items:
        kitchen_ticket = {
            "order_id": order_id,
            "customer": payload.get("customer_name") or f"Hotel Guest ({session_id[:6]})",
            "table": "Room / Dine-In",
            "items": [f"{i['name_en']} x{i['quantity']}" for i in items],
            "status": "cooking",
            "time": "Just now"
        }
        kitchen_orders_db.insert(0, kitchen_ticket)

    hist_record = {
        "order_id": order_id,
        "date": "Today, Just now",
        "total": total_paid,
        "status": "PAID",
        "method": method,
        "transaction_id": payment_details["transaction_id"],
        "items": items,
        "rooms": rooms,
        "services": services
    }
    past_orders_db.insert(0, hist_record)

    return {
        "status": "success",
        "message": f"Payment of ₹{total_paid:.2f} completed successfully via {method}! (Demo Payment)",
        "transaction_id": payment_details["transaction_id"],
        "amount_paid": total_paid,
        "payment_method": method,
        "payment_status": "PAID",
        "payment_details": payment_details,
        "bill": cart.to_dict(),
        "cart": cart.to_dict()
    }



@app.post("/api/cart/add")
def add_to_cart(req: CartItemAddRequest):
    cart = cart_store.get_or_create(req.session_id)
    effective_id = req.item_id or (req.item_name or req.name_en or "dish").lower().replace(" ", "-")
    effective_name = req.name_en or req.item_name
    menu_item = menu_service.get_by_id(effective_id)
    if not menu_item and effective_name:
        menu_item = next((i for i in menu_service.all_items() if i["name_en"].lower() == effective_name.lower()), None)

    price_val = req.price if req.price is not None else req.unit_price
    item_dict = {
        "id": menu_item["id"] if menu_item else effective_id,
        "name_en": effective_name or (menu_item["name_en"] if menu_item else effective_id.title()),
        "name_ta": req.name_ta or (menu_item["name_ta"] if menu_item else (effective_name or effective_id)),
        "price": price_val if price_val is not None else (menu_item["price"] if menu_item else 100.0)
    }
    cart.add_item(item_dict, req.quantity, req.customizations, unit_price=price_val)
    item_display = item_dict["name_en"]
    return {
        "status": "success",
        "message": f"Item added successfully! {req.quantity}x {item_display}",
        "cart": cart.to_dict()
    }


@app.post("/api/cart/update-qty")
def update_cart_qty(req: CartItemUpdateRequest):
    cart = cart_store.get_or_create(req.session_id)
    cart.set_line_quantity(req.item_id, req.customizations, req.quantity)
    return {"status": "success", "cart": cart.to_dict()}


@app.post("/api/cart/remove")
def remove_cart_item(req: CartItemRemoveRequest):
    cart = cart_store.get_or_create(req.session_id)
    cart.remove_exact_line(req.item_id, req.customizations)
    return {"status": "success", "message": "Item removed from cart", "cart": cart.to_dict()}


@app.post("/api/cart/clear/{session_id}")
@app.post("/api/cart/reset/{session_id}")
def clear_cart(session_id: str):
    cart_store.reset(session_id)
    return {"status": "success", "cart": cart_store.get_or_create(session_id).to_dict()}


@app.post("/api/cart/promo")
def apply_promo(payload: dict):
    session_id = payload.get("session_id")
    code = (payload.get("promo_code") or payload.get("code") or "").upper().strip()
    cart = cart_store.get_or_create(session_id)

    if cart.is_empty():
        return {
            "status": "error",
            "message": "Your cart is empty. Please add delicious items before applying a coupon!"
        }

    if cart.promo_code == code:
        saved = cart.discount()
        return {
            "status": "info",
            "cart": cart.to_dict(),
            "message": f"Coupon {code} is already applied to this order! (Saved ₹{int(saved)})"
        }

    expired_codes = ["EXPIRED10", "OLD2025", "DIWALI2024", "SUMMER2025"]
    if code in expired_codes:
        return {
            "status": "error",
            "message": f"Coupon {code} has expired. Try KPR15, KPR50, or WELCOME."
        }

    valid_codes = ["KPR15", "KPR50", "WELCOME", "FESTIVAL"]
    if code in valid_codes:
        cart.promo_code = code
        saved = cart.discount()
        return {
            "status": "success",
            "cart": cart.to_dict(),
            "discount_saved": saved,
            "message": f"Coupon applied successfully! You saved ₹{int(saved)}."
        }
    else:
        return {
            "status": "error",
            "message": "Invalid coupon code. Try KPR15 (15% off), KPR50 (₹50 off), or WELCOME (₹100 off)."
        }


@app.post("/api/cart/remove-promo")
def remove_promo(payload: dict):
    session_id = payload.get("session_id")
    cart = cart_store.get_or_create(session_id)
    cart.promo_code = None
    return {"status": "success", "cart": cart.to_dict(), "message": "Coupon removed."}


from app.services.qr_service import generate_qr_base64


@app.get("/api/payment/qr/{session_id}")
def get_payment_qr(session_id: str):
    cart = cart_store.get_or_create(session_id)
    cart_tot = cart.total()
    total = cart_tot if cart_tot > 0 else 150.0  # default sample if empty
    order_id = cart.order_id or f"ORD-{abs(hash(session_id)) % 9000 + 1000}"
    qr_data = generate_qr_base64(total, order_id)
    return {
        "status": "success",
        "session_id": session_id,
        "order_id": order_id,
        "total": total,
        "qr_image_base64": qr_data["qr_image_base64"],
        "upi_uri": qr_data["upi_uri"],
        "vpa": qr_data["vpa"]
    }


def _record_chat_order_if_confirmed(session_id: str, result: dict):
    for ev in result.get("ui_events", []):
        if ev.get("type") == "order_confirmed":
            p = ev.get("payload", {})
            order_id = p.get("order_id")
            if order_id and not any(o["order_id"] == order_id for o in past_orders_db):
                cart = cart_store.get_or_create(session_id)
                cart_dict = cart.to_dict()
                items = cart_dict.get("items", [])
                if items:
                    kitchen_ticket = {
                        "order_id": order_id,
                        "customer": f"AI Assistant User ({session_id[:6]})",
                        "table": "Online/Voice Order",
                        "items": [f"{i['name_en']} x{i['quantity']}" for i in items],
                        "status": "cooking",
                        "time": "Just now"
                    }
                    kitchen_orders_db.insert(0, kitchen_ticket)
                    past_orders_db.insert(0, {
                        "order_id": order_id,
                        "date": "Today, Just now",
                        "total": p.get("total", cart_dict.get("total", 0.0)),
                        "status": "Cooking",
                        "items": items
                    })


@app.post("/api/chat")
def chat(payload: ChatRequest):
    msg_text = payload.text or payload.message or ""
    if not msg_text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    result = process_message(payload.session_id, msg_text, source="text")
    _record_chat_order_if_confirmed(payload.session_id, result)
    return result


@app.post("/api/voice-chat")
async def voice_chat(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    language_hint: str | None = Form(None)
):
    audio_bytes = await audio.read()
    try:
        stt_result = transcribe(audio_bytes, content_type=audio.content_type or "audio/webm", language_hint=language_hint)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    transcript = stt_result["text"]
    if not transcript.strip():
        raise HTTPException(status_code=422, detail="Could not understand audio. Please try speaking clearly or typing.")

    result = process_message(session_id, transcript, source="voice")
    _record_chat_order_if_confirmed(session_id, result)
    tts_result = synthesize(result["reply_text"], language=result.get("language", "en"))

    result["transcript"] = transcript
    result["audio_reply_base64"] = tts_result["audio_base64"]
    return result


@app.get("/api/reservations")
def get_reservations():
    return {"reservations": get_all_reservations()}


@app.get("/api/tables/availability")
def get_tables_availability(date: str | None = None, time: str | None = None):
    return {
        "date": date,
        "time": time,
        "tables": get_table_availability(date, time)
    }


@app.post("/api/reservations")
def create_reservation(req: ReservationRequest):
    result = book_table(
        name=req.name,
        phone=req.phone,
        booking_date=req.date,
        booking_time=req.time,
        guests=req.guests,
        table_id=req.table_type,
        special_requests=req.special_requests or "None"
    )
    return result


@app.get("/api/orders/history")
def get_order_history():
    return {"orders": past_orders_db}


@app.post("/api/orders/checkout")
def checkout_order(req: CheckoutOrderRequest):
    cart = cart_store.get_or_create(req.session_id)
    cart_dict = cart.to_dict()
    items = cart_dict["items"]
    if not items:
        # Create a sample order if cart was empty
        items = [{"item_id": "bir-001", "name_en": "Chicken Biryani", "quantity": 1, "line_total": 220.0}]
        total_val = 261.0
    else:
        total_val = cart_dict["total"]

    order_id = f"KPR-{abs(hash(req.session_id + str(len(past_orders_db)))) % 9000 + 1000}"

    # Add to kitchen display
    kitchen_ticket = {
        "order_id": order_id,
        "customer": req.customer_name,
        "table": req.address[:20] if req.address else "Delivery",
        "items": [f"{i['name_en']} x{i['quantity']}" for i in items],
        "status": "cooking",
        "time": "Just now"
    }
    kitchen_orders_db.insert(0, kitchen_ticket)

    # Add to order history
    hist_record = {
        "order_id": order_id,
        "date": "Today, Just now",
        "total": total_val,
        "status": "Cooking",
        "items": items
    }
    past_orders_db.insert(0, hist_record)

    # Reset cart
    cart_store.reset(req.session_id)

    return {
        "status": "success",
        "order_id": order_id,
        "message": f"Order #{order_id} placed successfully! Thank you for ordering from KPR Hotel.",
        "kitchen_ticket": kitchen_ticket
    }


@app.post("/api/orders/reorder")
def reorder_order(payload: dict):
    session_id = payload.get("session_id")
    order_id = payload.get("order_id")
    if not session_id or not order_id:
        raise HTTPException(status_code=400, detail="session_id and order_id are required")
    cart = cart_store.get_or_create(session_id)
    target_order = next((o for o in past_orders_db if o["order_id"] == order_id), None)
    if not target_order:
        raise HTTPException(status_code=404, detail="Order not found")

    for itm in target_order.get("items", []):
        m_item = menu_service.get_by_id(itm.get("item_id", ""))
        item_dict = {
            "id": itm.get("item_id"),
            "name_en": itm.get("name_en") or (m_item["name_en"] if m_item else "Item"),
            "name_ta": itm.get("name_ta") or (m_item["name_ta"] if m_item else "Item"),
            "price": itm.get("price") or (m_item["price"] if m_item else 100.0)
        }
        cart.add_item(item_dict, itm.get("quantity", 1), itm.get("customizations", []))

    return {
        "status": "success",
        "message": f"Added items from {order_id} to cart!",
        "cart": cart.to_dict()
    }


@app.post("/api/catering/quote")
def request_catering_quote(req: CateringRequest):
    quote_id = f"CAT-{len(catering_quotes_db) + 9001}"
    estimated_price = req.guest_count * 250
    data = {"id": quote_id, **req.dict(), "estimated_total": estimated_price, "status": "Quote Generated"}
    catering_quotes_db.append(data)
    return {"status": "success", "quote": data, "message": f"Catering request received! Estimated budget: ₹{estimated_price}"}



@app.get("/api/kitchen/orders")
def get_kitchen_orders():
    return {"orders": kitchen_orders_db}


@app.post("/api/kitchen/orders/status")
def update_kitchen_order_status(update: KitchenStatusUpdate):
    for order in kitchen_orders_db:
        if order["order_id"] == update.order_id:
            order["status"] = update.status
            return {"status": "success", "updated_order": order}
    raise HTTPException(status_code=404, detail="Order ID not found")


@app.get("/api/analytics")
def get_analytics():
    return {
        "today_revenue": 48250,
        "active_orders": len(kitchen_orders_db),
        "total_orders_today": 142,
        "ai_intent_accuracy": "96.4%",
        "popular_dishes": [
            {"name": "Chicken Biryani", "orders": 68},
            {"name": "Veg Meals", "orders": 44},
            {"name": "Ghee Roast Dosa", "orders": 31},
            {"name": "Filter Coffee", "orders": 55}
        ],
        "language_distribution": {
            "English": "42%",
            "Tanglish": "45%",
            "Tamil": "13%"
        }
    }


@app.get("/api/reviews")
def get_reviews():
    return {"reviews": reviews_db}


@app.post("/api/reviews")
def add_review(req: ReviewRequest):
    rev_id = f"rev-{len(reviews_db) + 1}"
    data = {"id": rev_id, **req.dict(), "date": "Today"}
    reviews_db.insert(0, data)
    return {"status": "success", "review": data}


frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(frontend_dir):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
