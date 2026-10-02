"""
chat_service.py
----------------
Intelligent Conversational Dialogue Manager for KPR Hotel.
Features:
  - Natural Language Understanding (English, Tamil, Tanglish)
  - Multi-turn Stateful Conversation Memory per session (NO message limits)
  - Context & Pronoun Resolution ("it", "that", "this", "give me two")
  - Hotel Knowledge Base integration (Rooms, Food, Services, Policies, Timings)
  - Real Action Execution on Unified Live Bill (Rooms, Food, Services, Cancellations)
  - Live Bill Synchronization and Payment Modal Triggering
"""

import re
from datetime import datetime, date, timedelta
from .cart_service import cart_store, PaymentStatus
from .intent_service import (
    classify_intent, extract_quantity_and_dish, extract_room_type,
    extract_service_type, NUMBER_MAP
)
from .knowledge_service import knowledge_service
from .language_service import language_prefs
from .menu_service import menu_service
from .table_service import get_table_availability, book_table, ALL_TABLES

# Global multi-turn session memory store (unlimited turns)
SESSION_CONTEXTS: dict[str, dict] = {}


def get_session_context(session_id: str) -> dict:
    if session_id not in SESSION_CONTEXTS:
        SESSION_CONTEXTS[session_id] = {
            "history": [],
            "last_dish_discussed": None,
            "last_room_discussed": None,
            "last_service_discussed": None,
            "last_topic": None,  # "room", "food", "service", "bill", "table"
            "last_action": None,
        }
    return SESSION_CONTEXTS[session_id]


def _format_live_bill_summary(cart, lang: str) -> str:
    cart_dict = cart.to_dict()
    if cart.is_empty():
        if lang in ("ta", "ta-Latn"):
            return "உங்களின் பில் தற்போது காலியாக உள்ளது. நீங்கள் ரூம் புக் செய்ய, உணவு ஆர்டர் செய்ய அல்லது சேவைகளை சேர்க்க கூறலாம் 📋"
        return "Your live bill is currently empty. You can book a room (e.g. Deluxe Room), order food (e.g. 2 Chicken Biryani), or add hotel services!"

    parts = []
    # Rooms
    if cart_dict.get("rooms"):
        r_strs = [f"{r['name']} ({r['nights']} night{'s' if r['nights']>1 else ''} @ ₹{r['price_per_night']:.0f})" for r in cart_dict["rooms"]]
        parts.append(f"Rooms: {', '.join(r_strs)} (₹{cart_dict['room_subtotal']:.0f})")

    # Food
    if cart_dict.get("items"):
        f_strs = [f"{i['quantity']}x {i['name_en']}" for i in cart_dict["items"]]
        parts.append(f"Food: {', '.join(f_strs)} (₹{cart_dict['food_subtotal']:.0f})")

    # Services
    if cart_dict.get("services"):
        s_strs = [f"{s['quantity']}x {s['name']} (₹{s['unit_price']:.0f})" for s in cart_dict["services"]]
        parts.append(f"Services: {', '.join(s_strs)} (₹{cart_dict['service_subtotal']:.0f})")

    subtotal = cart_dict.get("subtotal", 0)
    tax = cart_dict.get("tax", 0)
    total = cart_dict.get("total", 0)
    status = cart_dict.get("payment_status", "UNPAID")

    details = " | ".join(parts)
    if status == "PAID":
        txn = cart_dict.get("payment_details", {}).get("transaction_id", "PAID")
        if lang in ("ta", "ta-Latn"):
            return f"உங்கள் பில் ஏற்கனவே செலுத்தப்பட்டுவிட்டது (நிலை: PAID ✓, பரிவர்த்தனை எண்: {txn}). மொத்த தொகை: ₹{total:.0f}. நிலுவை தொகை ஏதுமில்லை!"
        return f"Your bill is already PAID ✓ (Transaction ID: {txn}). Total Amount: ₹{total:.0f}. Breakdown: {details}, GST: ₹{tax:.0f}. You have zero pending dues!"

    if lang in ("ta", "ta-Latn"):
        return f"உங்கள் தற்போதைய பில்: {details}. வரி: ₹{tax:.0f}. செலுத்த வேண்டிய மொத்த தொகை: ₹{total:.0f} (நிலை: UNPAID). பில் செலுத்த 'Pay my bill' என்று கூறவும் அல்லது வலது பக்கமுள்ள PAY NOW பட்டனை கிளிக் செய்யவும்!"
    return f"Your current unpaid bill is ₹{total:.0f} ({details}, GST: ₹{tax:.0f}). Payment Status: UNPAID. You can say 'Pay my bill' or click the PAY NOW button on your live bill panel to pay directly!"


def _parse_date_from_text(text: str) -> str:
    lowered = text.lower()
    today = date.today()
    if "tomorrow" in lowered or "naalaiki" in lowered or "nalaikku" in lowered or "நாளை" in lowered:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if "today" in lowered or "tonight" in lowered or "inniku" in lowered or "இன்று" in lowered:
        return today.strftime("%Y-%m-%d")

    iso_match = re.search(r"\b(202\d-\d{2}-\d{2})\b", text)
    if iso_match:
        return iso_match.group(1)

    return (today + timedelta(days=1)).strftime("%Y-%m-%d")


def _parse_time_from_text(text: str) -> str:
    lowered = text.lower()
    if "12" in lowered or "lunch" in lowered and "1" not in lowered:
        return "12:30 PM (Lunch)"
    if "1" in lowered and "pm" in lowered or "1:30" in lowered or "one" in lowered and "lunch" in lowered:
        return "01:30 PM (Lunch)"
    if "8" in lowered or "8:30" in lowered:
        return "08:30 PM (Dinner)"
    return "07:30 PM (Dinner)"


def process_message(session_id: str, text: str, source: str = "text") -> dict:
    lang = language_prefs.update_from_text(session_id, text)
    cart = cart_store.get_or_create(session_id)
    ctx = get_session_context(session_id)

    # Append user turn to context history
    ctx["history"].append({"role": "user", "text": text, "timestamp": datetime.now().isoformat()})

    lowered = text.lower().strip()
    intent = classify_intent(text, context=ctx)

    ui_events: list[dict] = []
    menu_matches: list[dict] = []
    reply_text = ""

    # ========================================================
    # 1. GREETING
    # ========================================================
    if intent == "greeting":
        if lang in ("ta", "ta-Latn"):
            reply_text = (
                "வணக்கம்! KPR ஹோட்டலின் AI உதவியாளருக்கு தங்களை அன்புடன் வரவேற்கிறோம் 🙏 "
                "ரூம் முன்பதிவு (Deluxe, Premium, Suite), உணவு ஆர்டர், அறை சேவைகள், மேஜை முன்பதிவு "
                "அல்லது உங்களின் நேரலை பில் பற்றி என்னிடம் கேட்கலாம்!"
            )
        else:
            reply_text = (
                "Vanakkam & Welcome to KPR Hotel! 🙏 I am your intelligent hotel assistant. "
                "I can help you check room availability and book rooms, order authentic food, "
                "request hotel guest services, view your live bill, or make payments directly!"
            )

    # ========================================================
    # 2. ROOM INQUIRIES (AVAILABILITY, TYPES, PRICES)
    # ========================================================
    elif intent == "room_query":
        ctx["last_topic"] = "room"
        rooms = knowledge_service.get_rooms()

        # Check if asking about a specific room (e.g. Deluxe Room)
        target_room = extract_room_type(text)
        if target_room:
            ctx["last_room_discussed"] = target_room["id"]
            bfast = target_room.get("breakfast_details", "Complimentary breakfast included.")
            if lang in ("ta", "ta-Latn"):
                reply_text = (
                    f"{target_room['name']} விலை ஒரு இரவுக்கு ₹{target_room['price']:.0f}. "
                    f"அளவு: {target_room.get('size')}, படுக்கை: {target_room.get('bed_type')}. "
                    f"{bfast} தற்போது {target_room.get('available_count')} அறைகள் காலியாக உள்ளன. "
                    "இதை உங்களுக்கு முன்பதிவு செய்யவா?"
                )
            else:
                reply_text = (
                    f"The {target_room['name']} costs ₹{target_room['price']:.0f} per night. "
                    f"It accommodates {target_room['capacity']} ({target_room.get('bed_type')}, {target_room.get('size')}). "
                    f"{bfast} We currently have {target_room.get('available_count')} rooms available. "
                    "Would you like me to book it for you?"
                )
        else:
            # General rooms list
            ctx["last_room_discussed"] = "deluxe"  # default prime focus
            room_lines = [
                f"{r['name']} (₹{r['price']:.0f}/night, {r.get('available_count')} available)"
                for r in rooms
            ]
            if lang in ("ta", "ta-Latn"):
                reply_text = (
                    f"எங்களிடம் தற்போது கிடைக்கும் அறைகள்: {', '.join(room_lines)}. "
                    "அனைத்து அறைகளிலும் இலவச Wi-Fi, AC மற்றும் காலை உணவு உண்டு. எந்த அறையை முன்பதிவு செய்ய விரும்புகிறீர்கள்?"
                )
            else:
                reply_text = (
                    f"We currently have Deluxe, Premium, and Suite rooms available: "
                    f"{', '.join(room_lines)}. "
                    "All rooms include high-speed Wi-Fi, air conditioning, and complimentary buffet breakfast. "
                    "Which room would you like to know more about or book?"
                )

    # ========================================================
    # 3. ROOM AMENITIES, BREAKFAST, CHECK-IN / CHECK-OUT
    # ========================================================
    elif intent == "room_amenity_query":
        ctx["last_topic"] = "room"
        # Determine room focus
        target_room = extract_room_type(text)
        if not target_room and ctx.get("last_room_discussed"):
            target_room = knowledge_service.get_room(ctx["last_room_discussed"])
        if not target_room:
            target_room = knowledge_service.get_room("deluxe")

        timings = knowledge_service.get_hotel_info().get("timings", {})
        policies = knowledge_service.get_policies()

        if "breakfast" in lowered or "காலை உணவு" in lowered:
            bfast_info = target_room.get("breakfast_details", "Complimentary South Indian buffet breakfast is included from 7:00 AM to 10:30 AM.")
            if lang in ("ta", "ta-Latn"):
                reply_text = f"ஆம்! {target_room['name']} முன்பதிவில் காலை உணவு சேர்க்கப்பட்டுள்ளது. {bfast_info} நேரலை தோசை மற்றும் ஃபில்டர் காபி கவுண்டர்கள் கிடைக்கும்."
            else:
                reply_text = f"Yes! The {target_room['name']} includes complimentary breakfast. {bfast_info} Would you like me to book this room for you?"

        elif "check in" in lowered or "check-in" in lowered or "check out" in lowered or "check-out" in lowered:
            ci = timings.get("check_in", "12:00 PM")
            co = timings.get("check_out", "11:00 AM")
            if lang in ("ta", "ta-Latn"):
                reply_text = f"ஹோட்டல் செக்-இன் நேரம்: {ci}. செக்-அவுட் நேரம்: {co}. கோரிக்கையின் பேரில் முன்கூட்டியே செக்-இன் செய்ய வசதி உண்டு."
            else:
                reply_text = f"Our standard check-in time is {ci}, and check-out time is {co}. Early check-in and late check-out can be arranged subject to availability."

        elif "wifi" in lowered or "wi-fi" in lowered:
            reply_text = "Yes, high-speed Wi-Fi (up to 200 Mbps) is completely free and available in all guest rooms, dining halls, and lobby areas."

        else:
            amenities = ", ".join(target_room.get("amenities", []))
            reply_text = f"The {target_room['name']} features: {amenities}. Rate: ₹{target_room['price']:.0f}/night."

    # ========================================================
    # 4. ROOM BOOKING ACTION (REAL BACKEND & BILL UPDATE)
    # ========================================================
    elif intent == "book_room":
        ctx["last_topic"] = "room"
        target_room = extract_room_type(text)
        if not target_room and ctx.get("last_room_discussed"):
            target_room = knowledge_service.get_room(ctx["last_room_discussed"])
        if not target_room:
            target_room = knowledge_service.get_room("deluxe")

        ctx["last_room_discussed"] = target_room["id"]

        # Parse nights if mentioned (e.g. 'for 2 nights')
        nights = 1
        digit_m = re.search(r"\b(\d+)\s*(night|nights|day|days)\b", lowered)
        if digit_m:
            nights = max(1, int(digit_m.group(1)))
        else:
            for w, val in NUMBER_MAP.items():
                if f"{w} night" in lowered:
                    nights = val
                    break

        # Add room to cart/bill
        booking = cart.add_room(target_room, nights=nights)
        ctx["last_action"] = {"type": "book_room", "room_id": target_room["id"], "nights": nights}
        ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})

        if lang in ("ta", "ta-Latn"):
            reply_text = (
                f"நிச்சயமாக! {target_room['name']} ({nights} இரவு, ₹{booking.line_total:.0f}) "
                f"உங்களுக்காக முன்பதிவு செய்யப்பட்டது 🎉 உங்களின் நேரலை பில் புதுப்பிக்கப்பட்டுள்ளது! "
                f"தற்போதைய பில் மொத்தம்: ₹{cart.total():.0f}. பிரியாணி அல்லது அறை சேவைகள் எதையும் சேர்க்க விரும்புகிறீர்களா?"
            )
        else:
            reply_text = (
                f"Sure! I have booked the {target_room['name']} for {nights} night{'s' if nights > 1 else ''} "
                f"(₹{booking.line_total:.0f}) for you 🎉. Your live bill on the right has been updated! "
                f"Current Grand Total: ₹{cart.total():.0f}. Would you like to order food or add room service?"
            )

    # ========================================================
    # 5. HOTEL GUEST SERVICES ACTION (ROOM SERVICE, LAUNDRY, SHUTTLE)
    # ========================================================
    elif intent == "add_service":
        ctx["last_topic"] = "service"
        service = extract_service_type(text)
        if not service:
            service = knowledge_service.get_service("srv-room")

        ctx["last_service_discussed"] = service["id"]
        cart.add_service(service, quantity=1)
        ctx["last_action"] = {"type": "add_service", "service_id": service["id"]}
        ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})

        if lang in ("ta", "ta-Latn"):
            reply_text = f"அறை சேவை சேர்க்கப்பட்டது: {service['name']} (₹{service['price']:.0f}) பில்லில் இணைக்கப்பட்டுள்ளது 🛎️. பில் மொத்தம்: ₹{cart.total():.0f}."
        else:
            reply_text = f"I've added {service['name']} (₹{service['price']:.0f}) to your bill 🛎️. Your live bill has been updated. Current Grand Total: ₹{cart.total():.0f}."

    # ========================================================
    # 6. FOOD ORDER ACTION: ADD ITEM (WITH CONTEXT RESOLUTION)
    # ========================================================
    elif intent == "add_item":
        ctx["last_topic"] = "food"
        qty, dish_query = extract_quantity_and_dish(text)
        item = menu_service.fuzzy_find_item(dish_query, score_cutoff=45)

        # Context fallback for "Give me two" or follow-up
        if not item and ctx.get("last_dish_discussed"):
            item = menu_service.fuzzy_find_item(ctx["last_dish_discussed"])

        # Also check if user typed "add two chicken biryanis" with "also"
        if not item and "biryani" in lowered:
            item = menu_service.fuzzy_find_item("Chicken Biryani")

        if item:
            cart.add_item(item, qty, [])
            ctx["last_dish_discussed"] = item["name_en"]
            ctx["last_action"] = {"type": "add_food", "item_id": item["id"], "name": item["name_en"], "quantity": qty}
            ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})

            if lang in ("ta", "ta-Latn"):
                reply_text = (
                    f"நிச்சயமாக! {qty}x {item['name_ta'] or item['name_en']} உங்கள் ஆர்டரில் சேர்க்கப்பட்டது 🛒. "
                    f"உங்களின் நேரலை பில் புதுப்பிக்கப்பட்டுள்ளது. பில் மொத்தம்: ₹{cart.total():.0f}."
                )
            else:
                reply_text = (
                    f"I've added {qty}x {item['name_en']} to your order 🛒. "
                    f"Your live bill has been updated! Current Grand Total: ₹{cart.total():.0f}. "
                    "Would you like anything else?"
                )
        else:
            if lang in ("ta", "ta-Latn"):
                reply_text = f"மன்னிக்கவும், '{dish_query}' மெனுவில் கிடைக்கவில்லை. சீரக சம்பா சிக்கன் பிரியாணி, நெய் ரோஸ்ட் அல்லது பில்டர் காபி சேர்க்கவா?"
            else:
                reply_text = f"Sorry, that item is not available in the current hotel menu. May I suggest our signature Seeraga Samba Chicken Biryani, Ghee Roast Dosa, or Degree Filter Coffee?"

    # ========================================================
    # 7. LIVE BILL & TOTAL INQUIRY (SYNCHRONIZED WITH UI)
    # ========================================================
    elif intent == "bill_query":
        ctx["last_topic"] = "bill"
        ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})
        reply_text = _format_live_bill_summary(cart, lang)

    # ========================================================
    # 8. PAYMENT ACTION (TRIGGERS IN-PAGE PAYMENT MODAL)
    # ========================================================
    elif intent == "pay_bill":
        ctx["last_topic"] = "bill"
        if cart.is_empty():
            reply_text = "Your bill is currently empty! Please book a room or add food items before making a payment."
        elif cart.payment_status == PaymentStatus.PAID:
            txn = cart.payment_details.get("transaction_id", "PAID") if cart.payment_details else "PAID"
            reply_text = f"Your bill of ₹{cart.total():.0f} has already been paid (Transaction ID: {txn}). There are no pending dues!"
        else:
            ui_events.append({"type": "open_payment_modal", "payload": cart.to_dict()})
            if lang in ("ta", "ta-Latn"):
                reply_text = f"பணம் செலுத்தும் பக்கம் திறக்கப்பட்டுள்ளது! உங்களின் மொத்த தொகை: ₹{cart.total():.0f}. UPI, Card, அல்லது Net Banking மூலம் இங்கேயே செலுத்தலாம் 💳"
            else:
                reply_text = f"I've opened the payment panel for you. Your total payable amount is ₹{cart.total():.0f}. You can choose UPI, Card, or Net Banking right here to complete payment!"

    # ========================================================
    # 9. ORDER ACTION: CANCEL / REMOVE
    # ========================================================
    elif intent == "cancel_action":
        if "food" in lowered or "order" in lowered and "room" not in lowered:
            cart.clear_food_orders()
            ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})
            reply_text = f"I have cleared your food order. Your updated live bill total is ₹{cart.total():.0f}."
        elif "room" in lowered:
            cart.clear_rooms()
            ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})
            reply_text = f"I have cancelled your room booking. Your updated live bill total is ₹{cart.total():.0f}."
        elif "all" in lowered or "bill" in lowered:
            cart_store.reset(session_id)
            new_cart = cart_store.get_or_create(session_id)
            ui_events.append({"type": "cart_updated", "payload": new_cart.to_dict()})
            reply_text = "Your entire bill and active session have been cleared."
        else:
            _, dish_query = extract_quantity_and_dish(text)
            removed = cart.remove_item(dish_query)
            ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})
            if removed:
                reply_text = f"Removed item from your bill. Updated total: ₹{cart.total():.0f}."
            else:
                reply_text = f"I couldn't find that item on your bill. Say 'Show my bill' to inspect current charges."

    # ========================================================
    # 10. MODIFY QUANTITY
    # ========================================================
    elif intent == "modify_quantity":
        qty = 2
        for word, val in NUMBER_MAP.items():
            if re.search(r"\b" + re.escape(word) + r"\b", lowered):
                qty = val
                break
        digit_match = re.search(r"\b(\d+)\b", lowered)
        if digit_match:
            qty = int(digit_match.group(1))

        cart_items = cart.to_dict().get("items", [])
        target_item = None
        if ctx.get("last_dish_discussed"):
            target_item = next((i for i in cart_items if i["name_en"].lower() == ctx["last_dish_discussed"].lower()), None)
        if not target_item and cart_items:
            target_item = cart_items[-1]

        if target_item:
            cart.set_line_quantity(target_item["item_id"], target_item.get("customizations", []), qty)
            ui_events.append({"type": "cart_updated", "payload": cart.to_dict()})
            reply_text = f"Updated quantity of {target_item['name_en']} to {qty}. New bill total: ₹{cart.total():.0f}."
        else:
            reply_text = f"I've noted quantity {qty}. Which item would you like to update?"

    # ========================================================
    # 11. DISH QUERY & PRICE
    # ========================================================
    elif intent == "dish_query":
        _, dish_query = extract_quantity_and_dish(text)
        item = menu_service.fuzzy_find_item(dish_query, score_cutoff=40)
        if item:
            ctx["last_dish_discussed"] = item["name_en"]
            ctx["last_topic"] = "food"
            menu_matches.append(item)
            diet_tag = "Pure Veg 🌱" if item.get("veg") else "Non-Veg 🍗"
            if lang in ("ta", "ta-Latn"):
                reply_text = f"{item['name_ta'] or item['name_en']} விலை ₹{item['price']} ({diet_tag}). {item['description_en']}. இதை உங்கள் ஆர்டரில் சேர்க்கவா?"
            else:
                reply_text = f"{item['name_en']} is priced at ₹{item['price']} ({diet_tag}). {item['description_en']}. Say 'Add two {item['name_en']}' if you would like to order it!"
        else:
            reply_text = "Which dish would you like to check the price or details for?"

    # ========================================================
    # 12. SPICE LEVEL QUERY
    # ========================================================
    elif intent == "spice_query":
        reply_text = (
            "Our spiciest authentic dishes are Chettinad Chicken Curry, Madurai Mutton Kari Dosa, and Spiced Chicken 65! "
            "For medium spice, our Seeraga Samba Chicken Biryani and Veg Meals are favorites. "
            "For mild, we recommend Crispy Ghee Roast Dosa or Steamed Idli."
        )

    # ========================================================
    # 13. VEGETARIAN & DIETARY QUERY
    # ========================================================
    elif intent == "dietary_veg":
        reply_text = (
            "Yes, absolutely! KPR Hotel features a dedicated pure vegetarian kitchen preparing our unlimited "
            "South Indian Veg Meals Thali (₹150), Crispy Ghee Roast Dosa (₹110), Idli-Vada, and Degree Filter Coffee 🌱"
        )

    # ========================================================
    # 14. HOTEL INFORMATION (TIMINGS, BRANCHES, LOCATION, POLICIES)
    # ========================================================
    elif intent == "hotel_info":
        if "time" in lowered or "open" in lowered or "close" in lowered or "hours" in lowered:
            reply_text = "KPR Hotel is open 7:00 AM to 11:00 PM every day (Breakfast: 7:00–11:30 AM, Lunch: 12:00–4:00 PM, Dinner: 6:30–11:00 PM) ⏰"
        elif "where" in lowered or "location" in lowered or "branch" in lowered or "address" in lowered:
            reply_text = (
                "We have two prime branches: 1. Madurai Main Branch (42 West Masi St, near Meenakshi Amman Temple & Mattuthavani). "
                "2. Chennai Flagship (88 Usman Rd, T. Nagar). Both feature valet parking, AC dining halls, and luxury rooms 📍"
            )
        elif "cancel" in lowered or "policy" in lowered:
            policies = knowledge_service.get_policies()
            reply_text = f"Our policy: {policies.get('cancellation', 'Free cancellation up to 24 hours prior to check-in.')} Government ID is required for all adult guests."
        else:
            reply_text = (
                "KPR Hotel has been serving authentic South Indian hospitality and culinary heritage since 1998 in Madurai and Chennai. "
                "We provide luxury room stays (Deluxe, Premium, Suite), in-room dining, fine dining restaurant, and banqueting."
            )

    # ========================================================
    # 15. OFFERS & COMBOS QUERY
    # ========================================================
    elif intent == "offers_query":
        reply_text = (
            "Today's featured value combos:\n"
            "1. Biryani + Starter + Drink Combo for ₹319 (Save 24%)\n"
            "2. South Indian Family Mega Feast for ₹749 (Save 24%)\n"
            "3. Morning Tiffin Grand Combo for ₹189 (Save 27%)\n"
            "Active coupons: KPR15 (15% off) or WELCOME (₹100 off)!"
        )

    # ========================================================
    # 16. TABLE INQUIRY & BOOKING
    # ========================================================
    elif intent == "table_inquiry":
        avail = get_table_availability()
        avail_tables = [t for t in avail if t["is_available"]]
        avail_str = ", ".join(f"{t['id']} ({t['seats']} Seats)" for t in avail_tables)
        reply_text = f"Currently available dining tables: {avail_str}. How many guests are joining you?"

    elif intent == "book_table":
        guests = 4
        for w, v in NUMBER_MAP.items():
            if re.search(r"\b" + re.escape(w) + r"\b", lowered) and "table" not in lowered:
                guests = v
                break
        digit_m = re.search(r"(\d+)\s*(people|guests|persons|seat)", lowered)
        if digit_m:
            guests = int(digit_m.group(1))

        b_date = _parse_date_from_text(text)
        b_time = _parse_time_from_text(text)
        t_match = re.search(r"table\s*([1-6])", lowered)
        pref_table = f"Table {t_match.group(1)}" if t_match else None

        booking_result = book_table(
            name="AI Hotel Guest",
            phone="+91 98400 12345",
            booking_date=b_date,
            booking_time=b_time,
            guests=guests,
            table_id=pref_table
        )

        if booking_result["status"] == "success":
            bid = booking_result["booking_id"]
            tid = booking_result["table_id"]
            ui_events.append({"type": "table_booked", "payload": booking_result["reservation"]})
            reply_text = f"Your table is confirmed! Table {tid} for {guests} guests on {b_date} at {b_time}. Booking ID: {bid} 🎉"
        else:
            reply_text = booking_result["message"]

    # ========================================================
    # 17. MENU QUERY
    # ========================================================
    elif intent == "menu_query":
        items = menu_service.semantic_search(text, top_k=4)
        if not items:
            items = menu_service.all_items()[:4]
        menu_matches = items
        dish_names = [i["name_en"] for i in items]
        ctx["last_dish_discussed"] = items[0]["name_en"]
        ctx["last_topic"] = "food"
        reply_text = f"We have delicious authentic choices: {', '.join(dish_names)}. Just say 'Add two {items[0]['name_en']}' to add to your bill!"

    # ========================================================
    # 18. SEMANTIC SEARCH FALLBACK & POLITE GUIDANCE
    # ========================================================
    else:
        # Check if semantic search on hotel knowledge returns good matches
        chunks = knowledge_service.search(text, top_k=1)
        if chunks:
            reply_text = chunks[0]["text"]
        else:
            reply_text = "I didn't quite understand that. You can ask me about rooms, food, bookings, hotel services, or your bill."

    # Save agent response in history
    ctx["history"].append({"role": "assistant", "text": reply_text, "timestamp": datetime.now().isoformat()})

    return {
        "session_id": session_id,
        "language": lang,
        "intent": intent,
        "reply_text": reply_text,
        "reply": reply_text,
        "cart": cart.to_dict(),
        "ui_events": ui_events,
        "menu_matches": [
            {"id": m["id"], "name_en": m["name_en"], "name_ta": m.get("name_ta", m["name_en"]),
             "price": m["price"], "description_en": m.get("description_en", "")}
            for m in menu_matches
        ],
        "source": source
    }
