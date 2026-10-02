"""
intent_service.py
------------------
Machine Learning & NLP Intent Classification and Multilingual Entity Extraction.
Combines:
  1. ML: TF-IDF Vectorizer + Logistic Regression classifier trained on
     multilingual conversational hotel and restaurant training corpus (English, Tamil, Tanglish).
  2. NLP Entity Extraction: Quantities (digits + English/Tamil/Tanglish number words),
     menu item matching (SequenceMatcher), room type extraction, service extraction,
     dates, times, and hotel actions.
"""

import re
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from .menu_service import menu_service
from .knowledge_service import knowledge_service

# Number mapping for English, Tamil script, and Tanglish transliterated words
NUMBER_MAP = {
    "a": 1, "an": 1, "one": 1, "single": 1, "onnu": 1, "oru": 1, "ஒன்று": 1, "ஒரு": 1,
    "two": 2, "double": 2, "rendu": 2, "irandu": 2, "இரண்டு": 2, "ரெண்டு": 2,
    "three": 3, "triple": 3, "moonu": 3, "moondru": 3, "மூன்று": 3, "மூணு": 3,
    "four": 4, "naalu": 4, "naangu": 4, "நான்கு": 4, "நாலு": 4,
    "five": 5, "anju": 5, "ainthu": 5, "ஐந்து": 5, "அஞ்சு": 5,
    "six": 6, "aaru": 6, "ஆறு": 6,
    "seven": 7, "ezhu": 7, "ஏழு": 7,
    "eight": 8, "ettu": 8, "எட்டு": 8,
    "nine": 9, "onpathu": 9, "ஒன்பது": 9,
    "ten": 10, "pathu": 10, "பத்து": 10,
}

TRAINING_DATA = [
    # GREETINGS
    ("hi", "greeting"), ("hello", "greeting"), ("hey", "greeting"),
    ("vanakkam", "greeting"), ("vannakam", "greeting"), ("வணக்கம்", "greeting"),
    ("good morning", "greeting"), ("good evening", "greeting"), ("namaste", "greeting"),

    # ROOMS & LODGING QUERIES
    ("what rooms are available", "room_query"),
    ("what rooms do you have", "room_query"),
    ("show available rooms", "room_query"),
    ("room availability", "room_query"),
    ("what are your room types", "room_query"),
    ("tell me about rooms", "room_query"),
    ("what is the price of the deluxe room", "room_query"),
    ("how much is the deluxe room", "room_query"),
    ("how much is the deluxe", "room_query"),
    ("deluxe room price", "room_query"),
    ("how much is premium room", "room_query"),
    ("suite room price", "room_query"),
    ("how much does the suite cost", "room_query"),
    ("executive suite price", "room_query"),
    ("rooms enna irukku", "room_query"),
    ("room rate evlo", "room_query"),
    ("ரூம் என்ன இருக்கு", "room_query"),
    ("டீலக்ஸ் ரூம் விலை என்ன", "room_query"),

    # ROOM AMENITIES, BREAKFAST & TIMINGS
    ("does it include breakfast", "room_amenity_query"),
    ("is breakfast included", "room_amenity_query"),
    ("does deluxe room include breakfast", "room_amenity_query"),
    ("does room price include breakfast", "room_amenity_query"),
    ("what is included in the room", "room_amenity_query"),
    ("what amenities are provided", "room_amenity_query"),
    ("what time is check in", "room_amenity_query"),
    ("check in and check out timing", "room_amenity_query"),
    ("check out time", "room_amenity_query"),
    ("breakfast timing", "room_amenity_query"),
    ("is wifi free", "room_amenity_query"),
    ("does it have ac", "room_amenity_query"),
    ("காலை உணவு உண்டா", "room_amenity_query"),
    ("செக் இன் நேரம் என்ன", "room_amenity_query"),

    # ROOM BOOKING ACTIONS
    ("okay book that for me", "book_room"),
    ("book that for me", "book_room"),
    ("book that", "book_room"),
    ("book it", "book_room"),
    ("book the deluxe room", "book_room"),
    ("book a deluxe room", "book_room"),
    ("reserve deluxe room", "book_room"),
    ("book premium room", "book_room"),
    ("book the suite room", "book_room"),
    ("i want to book a room", "book_room"),
    ("reserve a room for two nights", "book_room"),
    ("room book pannunga", "book_room"),
    ("deluxe room book pannu", "book_room"),
    ("ரூம் புக் பண்ணுங்க", "book_room"),

    # HOTEL SERVICES ACTIONS
    ("add room service", "add_service"),
    ("order room service", "add_service"),
    ("i need room service", "add_service"),
    ("add laundry service", "add_service"),
    ("wash my clothes", "add_service"),
    ("book airport shuttle", "add_service"),
    ("airport drop venum", "add_service"),
    ("add extra bed", "add_service"),
    ("need extra bed", "add_service"),
    ("book spa massage", "add_service"),
    ("room service sethukonga", "add_service"),

    # LIVE BILL & PAYMENT INQUIRIES
    ("show my bill", "bill_query"),
    ("show bill", "bill_query"),
    ("how much is my bill", "bill_query"),
    ("how much do i have to pay", "bill_query"),
    ("how much do i need to pay", "bill_query"),
    ("what did i order", "bill_query"),
    ("what is my total", "bill_query"),
    ("what is the total", "bill_query"),
    ("how much now", "bill_query"),
    ("is my bill paid", "bill_query"),
    ("payment status", "bill_query"),
    ("current bill", "bill_query"),
    ("bill details", "bill_query"),
    ("bill evvalavu", "bill_query"),
    ("bill evlo aachu", "bill_query"),
    ("total evlo", "bill_query"),
    ("பில் விவரம்", "bill_query"),
    ("எவ்வளவு கட்ட வேண்டும்", "bill_query"),

    # PAYMENT ACTIONS
    ("pay my bill", "pay_bill"),
    ("pay bill", "pay_bill"),
    ("pay now", "pay_bill"),
    ("i want to pay", "pay_bill"),
    ("proceed to pay", "pay_bill"),
    ("make payment", "pay_bill"),
    ("payment pannu", "pay_bill"),
    ("bill kattanum", "pay_bill"),
    ("பணம் செலுத்து", "pay_bill"),

    # MENU GENERAL QUERY
    ("what food do you have", "menu_query"),
    ("what do you have to eat", "menu_query"),
    ("show me the menu", "menu_query"),
    ("what are your popular dishes", "menu_query"),
    ("bestsellers", "menu_query"),
    ("what biryanis do you have", "menu_query"),
    ("what dosas are available", "menu_query"),
    ("what do you recommend", "menu_query"),
    ("enna sappadu irukku", "menu_query"),
    ("menu kaatunga", "menu_query"),
    ("special dishes enna", "menu_query"),
    ("உணவு பட்டியல் என்ன", "menu_query"),

    # DISH ATTRIBUTE & PRICE
    ("how much is chicken biryani", "dish_query"),
    ("what is the price of chicken biryani", "dish_query"),
    ("chicken biryani price enna", "dish_query"),
    ("how much does mutton biryani cost", "dish_query"),
    ("cost of ghee roast", "dish_query"),
    ("filter coffee price", "dish_query"),
    ("சிக்கன் பிரியாணி விலை என்ன", "dish_query"),

    # SPICE LEVEL
    ("what is spicy", "spice_query"),
    ("which dish is spicy", "spice_query"),
    ("is chicken biryani spicy", "spice_query"),
    ("kaaramana unavu enna", "spice_query"),
    ("edhu spicy ah irukkum", "spice_query"),

    # DIETARY & VEG
    ("do you have vegetarian food", "dietary_veg"),
    ("show vegetarian dishes", "dietary_veg"),
    ("pure veg food", "dietary_veg"),
    ("is there veg food", "dietary_veg"),
    ("சைவ உணவுகள் உள்ளதா", "dietary_veg"),

    # HOTEL INFO & GENERAL
    ("what time does the hotel open", "hotel_info"),
    ("when do you close", "hotel_info"),
    ("hotel opening hours", "hotel_info"),
    ("where are you located", "hotel_info"),
    ("what is your address", "hotel_info"),
    ("hotel facilities", "hotel_info"),
    ("cancellation policy", "hotel_info"),
    ("parking available", "hotel_info"),
    ("ஹோட்டல் எப்போது திறக்கும்", "hotel_info"),
    ("முகவரி என்ன", "hotel_info"),

    # OFFERS & DEALS
    ("what are today's offers", "offers_query"),
    ("show offers", "offers_query"),
    ("today offers", "offers_query"),
    ("any discount available", "offers_query"),
    ("coupons", "offers_query"),
    ("enna offer irukku", "offers_query"),

    # ORDER ACTIONS - ADD FOOD
    ("add two chicken biryanis", "add_item"),
    ("also add two chicken biryanis", "add_item"),
    ("add 2 chicken biryani", "add_item"),
    ("order one coffee", "add_item"),
    ("add one coffee", "add_item"),
    ("give me two", "add_item"),
    ("give me two chicken biryanis", "add_item"),
    ("add one chicken 65", "add_item"),
    ("enaku rendu chicken biryani venum", "add_item"),
    ("2 chicken biryani add pannu", "add_item"),
    ("chicken biryani 2 podunga", "add_item"),
    ("filter coffee onnu add pannu", "add_item"),
    ("i want two chicken biryanis", "add_item"),
    ("order 1 ghee roast dosa", "add_item"),
    ("add mutton biryani", "add_item"),
    ("எனக்கு இரண்டு சிக்கன் பிரியாணி வேண்டும்", "add_item"),

    # ORDER ACTIONS - MODIFY QUANTITY
    ("make it three", "modify_quantity"),
    ("make it two", "modify_quantity"),
    ("change quantity to 3", "modify_quantity"),
    ("rendu aakunga", "modify_quantity"),
    ("moonu aakunga", "modify_quantity"),

    # CANCEL / REMOVE
    ("cancel my food order", "cancel_action"),
    ("cancel my order", "cancel_action"),
    ("clear my bill", "cancel_action"),
    ("remove chicken 65", "cancel_action"),
    ("remove biryani", "cancel_action"),
    ("cancel the room", "cancel_action"),
    ("remove room booking", "cancel_action"),
    ("order cancel pannunga", "cancel_action"),

    # TABLE INQUIRIES & AVAILABILITY
    ("how many tables are available", "table_inquiry"),
    ("show available tables", "table_inquiry"),
    ("is table 3 available", "table_inquiry"),
    ("table availability", "table_inquiry"),

    # TABLE BOOKING
    ("book a table", "book_table"),
    ("reserve a table", "book_table"),
    ("table booking", "book_table"),
    ("table book pannunga", "book_table"),

    # NAVIGATION
    ("open menu", "navigate_menu"),
    ("open favorites", "navigate_favorites"),
    ("open offers", "navigate_offers"),
    ("open kitchen admin", "navigate_kitchen_admin"),
    ("go home", "navigate_home"),
    ("open cart", "navigate_cart"),

    # SETTINGS & THEMES
    ("change language to tamil", "settings_lang_ta"),
    ("change language to english", "settings_lang_en"),
    ("change language to tanglish", "settings_lang_tanglish"),
    ("switch to dark mode", "settings_theme_dark"),
    ("switch to light mode", "settings_theme_light"),

    # GENERAL OFF TOPIC
    ("who is the prime minister", "off_topic"),
    ("what is the weather today", "off_topic"),
]


class IntentModel:
    def __init__(self):
        self.texts = [t[0] for t in TRAINING_DATA]
        self.labels = [t[1] for t in TRAINING_DATA]
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 3), analyzer="char_wb")
        X = self.vectorizer.fit_transform(self.texts)
        self.classifier = LogisticRegression(max_iter=600, C=4.0)
        self.classifier.fit(X, self.labels)

    def predict(self, text: str) -> tuple[str, float]:
        X_test = self.vectorizer.transform([text.lower().strip()])
        probs = self.classifier.predict_proba(X_test)[0]
        max_idx = probs.argmax()
        intent = self.classifier.classes_[max_idx]
        confidence = probs[max_idx]
        return intent, float(confidence)


# Train model singleton
intent_model = IntentModel()


def extract_quantity_and_dish(text: str) -> tuple[int, str]:
    """Robustly extracts quantity and target dish name from natural input in
    English, Tamil, and Tanglish."""
    lowered = text.lower().strip()
    qty = 1

    sanitized = re.sub(r"\b(chicken|gobi|paneer)?\s*65\b", "chicken_sixtyfive", lowered)

    # 1. Check for number words in NUMBER_MAP
    words = re.findall(r"[\w]+", sanitized, flags=re.UNICODE)
    found_word_qty = False
    for w in words:
        if w in NUMBER_MAP and w != "a":
            qty = NUMBER_MAP[w]
            found_word_qty = True
            break

    # 2. Check for explicit digit (e.g. '2 biryani', 'add 3 dosas')
    if not found_word_qty:
        digit_match = re.search(r"\b(\d+)\b", sanitized)
        if digit_match:
            qty = int(digit_match.group(1))

    # 3. Clean common filler and command words
    clean_text = sanitized
    digit_m = re.search(r"\b(\d+)\b", clean_text)
    if digit_m:
        clean_text = clean_text.replace(digit_m.group(1), "")
    for nw in NUMBER_MAP.keys():
        clean_text = re.sub(r"\b" + re.escape(nw) + r"\b", "", clean_text, flags=re.IGNORECASE)

    filler_words = [
        "enaku", "enakku", "enakum", "venum", "vendum", "kudunga", "add", "also",
        "pannunga", "pannu", "podunga", "please", "pls", "want", "i", "need", "like",
        "to", "have", "order", "can", "get", "give", "me", "send", "parcel", "takeaway",
        "plate", "plates", "cups", "cup", "items", "dishes", "dish", "வேண்டும்", "சேருங்கள்"
    ]
    for fw in filler_words:
        clean_text = re.sub(r"(?i)\b" + re.escape(fw) + r"\b", "", clean_text)
    clean_text = clean_text.replace("chicken_sixtyfive", "chicken 65").strip(" .,!?")

    if "chicken 65" in lowered or "chicken_sixtyfive" in sanitized:
        return qty, "Chicken 65"
    if "kari dosa" in lowered or "mutton kari dosa" in lowered:
        return qty, "Madurai Mutton Kari Dosa"
    if "jigarthanda" in lowered:
        return qty, "Madurai Jigarthanda"
    if "coffee" in lowered:
        return qty, "Kumbakonam Degree Filter Coffee"

    all_items = menu_service.all_items()
    best_dish = None
    best_score = 0

    if clean_text:
        for item in all_items:
            name_en = item["name_en"].lower()
            name_ta = (item.get("name_ta") or "").lower()
            if clean_text in name_en or (name_ta and clean_text in name_ta):
                score = 95
            elif name_en in clean_text or (name_ta and name_ta in clean_text):
                score = 90
            else:
                s1 = SequenceMatcher(None, clean_text, name_en).ratio() * 100
                s2 = SequenceMatcher(None, clean_text, name_ta).ratio() * 100 if name_ta else 0
                score = max(s1, s2)
            if score > best_score:
                best_score = score
                best_dish = item

    if best_score < 50:
        for item in all_items:
            name_en = item["name_en"].lower()
            if name_en in lowered or (item.get("name_ta") and item["name_ta"] in text):
                best_dish = item
                best_score = 90
                break
            for tag in item.get("tags", []):
                if tag.lower() in lowered:
                    best_dish = item
                    best_score = 75
                    break

    dish_name = best_dish["name_en"] if best_dish else clean_text
    return qty, dish_name


def extract_room_type(text: str) -> dict | None:
    """Extracts target room type from text (Deluxe, Premium, Suite)."""
    lowered = text.lower()
    if "deluxe" in lowered:
        return knowledge_service.get_room("deluxe")
    if "premium" in lowered:
        return knowledge_service.get_room("premium")
    if "suite" in lowered or "executive" in lowered:
        return knowledge_service.get_room("suite")
    return None


def extract_service_type(text: str) -> dict | None:
    """Extracts target hotel service from text (room service, laundry, shuttle, spa, extra bed)."""
    lowered = text.lower()
    if "room service" in lowered:
        return knowledge_service.get_service("srv-room")
    if "laundry" in lowered or "wash" in lowered or "iron" in lowered:
        return knowledge_service.get_service("srv-laundry")
    if "shuttle" in lowered or "airport" in lowered or "railway" in lowered or "pickup" in lowered or "drop" in lowered:
        return knowledge_service.get_service("srv-shuttle")
    if "spa" in lowered or "massage" in lowered or "ayurved" in lowered:
        return knowledge_service.get_service("srv-spa")
    if "extra bed" in lowered or "bed" in lowered:
        return knowledge_service.get_service("srv-bed")
    return None


def classify_intent(text: str, context: dict | None = None) -> str:
    """Classifies user input with priority rule-based fast paths and ML backup."""
    lowered = text.lower().strip()

    # 1. Greetings
    if lowered in ["hi", "hello", "hey", "vanakkam", "வணக்கம்", "namaste", "good morning", "good evening"]:
        return "greeting"

    # 2. Payment Actions
    if (
        "pay my bill" in lowered or "pay bill" in lowered or "pay now" in lowered or
        "i want to pay" in lowered or "make payment" in lowered or "proceed to pay" in lowered or
        "proceed to payment" in lowered or "payment pannu" in lowered or "bill kattanum" in lowered or
        "பணம் செலுத்து" in lowered
    ):
        return "pay_bill"

    # 3. Live Bill Inquiries
    if (
        "show my bill" in lowered or "show bill" in lowered or "how much is my bill" in lowered or
        "how much do i have to pay" in lowered or "how much do i need to pay" in lowered or
        "what did i order" in lowered or "what's my bill" in lowered or "whats my bill" in lowered or
        "what is my total" in lowered or "what is the total" in lowered or "how much now" in lowered or
        "is my bill paid" in lowered or "check my bill" in lowered or "current bill" in lowered or
        "bill status" in lowered or "bill total" in lowered or "total bill" in lowered or
        "bill evvalavu" in lowered or "bill evlo" in lowered or "total evlo" in lowered or
        "bill details" in lowered or "பில்" in lowered
    ):
        return "bill_query"

    # Policy & Rules Check
    if "policy" in lowered or "rules" in lowered or "terms" in lowered or "guidelines" in lowered:
        return "hotel_info"

    # 4. Cancel Actions
    if (
        "cancel my food order" in lowered or "cancel food order" in lowered or "cancel my order" in lowered or
        "cancel order" in lowered or "clear my bill" in lowered or "clear bill" in lowered or
        "cancel room" in lowered or "cancel booking" in lowered
    ):
        return "cancel_action"

    # 5. Room Amenities, Breakfast & Timings
    if (
        "breakfast" in lowered or "check in" in lowered or "check-in" in lowered or
        "check out" in lowered or "check-out" in lowered or "amenities" in lowered or
        "facility" in lowered or "facilities" in lowered or "wifi" in lowered or
        "does it include" in lowered or "is it included" in lowered or "timing" in lowered or
        "காலை உணவு" in lowered
    ):
        return "room_amenity_query"

    # 6. Room Booking Actions
    if (
        "book that for me" in lowered or "book that" in lowered or "book it" in lowered or
        "book the deluxe" in lowered or "book a deluxe" in lowered or "book deluxe" in lowered or
        "book the room" in lowered or "book a room" in lowered or "book room" in lowered or
        "reserve a room" in lowered or "reserve room" in lowered or "book the suite" in lowered or
        "book suite" in lowered or "book premium" in lowered or "room book pannu" in lowered or
        "room book pannunga" in lowered or "ரூம் புக்" in lowered
    ):
        return "book_room"

    # 7. Room Inquiries (types, availability, prices)
    if (
        "what rooms" in lowered or "rooms available" in lowered or "room availability" in lowered or
        "rooms do you have" in lowered or "room types" in lowered or "types of rooms" in lowered or
        "price of the deluxe" in lowered or "price of deluxe" in lowered or "how much is the deluxe" in lowered or
        "how much is deluxe" in lowered or "deluxe room" in lowered or "deluxe cost" in lowered or
        "suite room" in lowered or "premium room" in lowered or "room rate" in lowered or
        "room price" in lowered or "room cost" in lowered or "room irukka" in lowered or
        "rooms enna" in lowered or "ரூம்" in lowered
    ):
        return "room_query"

    # 8. Hotel Services
    if (
        "room service" in lowered or "laundry" in lowered or "airport shuttle" in lowered or
        "shuttle" in lowered or "extra bed" in lowered or "spa massage" in lowered or "ayurvedic" in lowered
    ):
        return "add_service"

    # 9. Table Inquiries vs Booking
    if (
        "how many people" in lowered or "capacity" in lowered or "how many tables" in lowered or
        "available tables" in lowered or "is table" in lowered or "table availability" in lowered
    ):
        return "table_inquiry"

    if (
        "book a table" in lowered or "book table" in lowered or "reserve a table" in lowered or
        "reserve table" in lowered or "table booking" in lowered or "table book" in lowered
    ):
        return "book_table"

    # 10. Food Order Actions - Add
    if (
        "add " in lowered or "order " in lowered or "give me" in lowered or
        "also add" in lowered or "venum" in lowered or "vendum" in lowered or
        "kudunga" in lowered or "podunga" in lowered or "சேருங்கள்" in lowered
    ):
        return "add_item"

    # 11. Follow-up "Give me two" / "Two please"
    if context and context.get("last_dish_discussed"):
        words = set(re.findall(r"\w+", lowered))
        if words.intersection(set(NUMBER_MAP.keys())):
            return "add_item"

    # 12. Modify Quantity
    if "make it" in lowered or "make the" in lowered or "change quantity" in lowered or "quantity to" in lowered:
        return "modify_quantity"

    # 13. Remove Item
    if ("remove" in lowered or "delete" in lowered or "edukatha" in lowered or "venam" in lowered or
        ("cancel" in lowered and "policy" not in lowered)):
        return "cancel_action"

    # 14. ML Classifier
    pred_intent, conf = intent_model.predict(lowered)
    return pred_intent
