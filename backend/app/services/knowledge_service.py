"""
knowledge_service.py
--------------------
Structured Knowledge Retrieval & Semantic Search for KPR Hotel.
Provides factual knowledge retrieval for:
  - Hotel rooms, lodging, rates, amenities, breakfast inclusion, availability
  - In-room dining & hotel guest services (room service, laundry, shuttle, spa)
  - Hotel timings (check-in, check-out, breakfast, lunch, dinner)
  - Hotel policies (cancellation, ID proof, pets, smoking, parking, Wi-Fi)
  - Restaurant branches, spice levels, vegetarian policy, offers/combos, table booking policies, and menu details.
"""

import json
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

KNOWLEDGE_PATH = Path(__file__).resolve().parent.parent / "data" / "hotel_knowledge.json"
MENU_PATH = Path(__file__).resolve().parent.parent / "data" / "menu.json"


class HotelKnowledgeService:
    def __init__(self):
        self.reload()

    def reload(self):
        self.knowledge: dict = {}
        if KNOWLEDGE_PATH.exists():
            self.knowledge = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))

        self.menu_items: list[dict] = []
        if MENU_PATH.exists():
            self.menu_items = json.loads(MENU_PATH.read_text(encoding="utf-8"))

        self._chunks: list[dict] = []
        self._build_knowledge_chunks()

        corpus = [c["text"] for c in self._chunks]
        if corpus:
            self._vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
            self._matrix = self._vectorizer.fit_transform(corpus)
        else:
            self._vectorizer = None
            self._matrix = None

    def _build_knowledge_chunks(self):
        info = self.knowledge.get("hotel_info", {})
        # Overview
        self._chunks.append({
            "category": "about",
            "title": "About KPR Hotel",
            "text": f"KPR Hotel was founded in 1998 in Madurai and Chennai. {info.get('description', '')} Authentic Chettinad and Madurai cuisine and luxury accommodations.",
            "data": info
        })

        # Branches & Location
        for b in info.get("branches", []):
            self._chunks.append({
                "category": "location",
                "title": f"Location: {b['name']}",
                "text": f"KPR Hotel {b['name']} address: {b['address']}. Phone: {b['phone']}. Hours: {b['hours']}. Dining: {b['dining']}. Parking: {b['parking']}.",
                "data": b
            })

        # Timings & Check-in / Check-out
        timings = info.get("timings", {})
        self._chunks.append({
            "category": "timings",
            "title": "Opening Hours, Check-in & Check-out Timings",
            "text": (
                f"KPR Hotel timings: Check-in is at {timings.get('check_in', '12:00 PM')}. "
                f"Check-out is at {timings.get('check_out', '11:00 AM')}. "
                f"Breakfast is served from {timings.get('breakfast', '7:00 AM – 11:30 AM')}. "
                f"Lunch: {timings.get('lunch')}. Snacks & Tiffin: {timings.get('snacks_tiffin')}. "
                f"Dinner: {timings.get('dinner')}. Open all 7 days."
            ),
            "data": timings
        })

        # Rooms Catalog
        rooms = self.knowledge.get("rooms_catalog", [])
        for r in rooms:
            bfast_txt = r.get("breakfast_details", "Complimentary breakfast included.") if r.get("breakfast_included") else "Breakfast not included."
            amenities_txt = ", ".join(r.get("amenities", []))
            self._chunks.append({
                "category": "rooms",
                "title": f"Room: {r['name']}",
                "text": (
                    f"{r['name']} price is ₹{r['price']} per night. Capacity: {r['capacity']}. "
                    f"Bed type: {r['bed_type']}. Size: {r.get('size')}. {bfast_txt} "
                    f"Available rooms: {r.get('available_count')}. Amenities: {amenities_txt}. {r.get('description')}"
                ),
                "data": r
            })

        # Hotel Guest Services
        services = self.knowledge.get("hotel_services", [])
        for s in services:
            self._chunks.append({
                "category": "services",
                "title": f"Service: {s['name']}",
                "text": f"Hotel service: {s['name']} costs ₹{s['price']}. {s['description']}",
                "data": s
            })

        # Facilities
        facilities = info.get("facilities", [])
        if facilities:
            self._chunks.append({
                "category": "facilities",
                "title": "Hotel Facilities & Amenities",
                "text": f"KPR Hotel facilities include: {', '.join(facilities)}.",
                "data": facilities
            })

        # Policies
        policies = info.get("policies", {})
        self._chunks.append({
            "category": "policies",
            "title": "Hotel Policies",
            "text": (
                f"Cancellation: {policies.get('cancellation')}. "
                f"ID Proof required: {policies.get('id_proof')}. "
                f"Children: {policies.get('children')}. "
                f"Pets: {policies.get('pets')}. Smoking: {policies.get('smoking')}."
            ),
            "data": policies
        })

        # Payment & Delivery
        self._chunks.append({
            "category": "policies",
            "title": "Payment & Delivery",
            "text": f"Payment options: {', '.join(info.get('payment_methods', []))}. Delivery policy: {info.get('delivery_policy', {}).get('fee')}, time: {info.get('delivery_policy', {}).get('estimated_time')}.",
            "data": info.get("delivery_policy", {})
        })

        # Dietary & Spice
        diet = self.knowledge.get("menu_highlights", {}).get("dietary_and_spice", {})
        self._chunks.append({
            "category": "dietary",
            "title": "Vegetarian & Halal Policy",
            "text": f"Vegetarian: {diet.get('vegetarian', '')} Halal: {diet.get('halal', '')} Pure veg meals, dosa, idli available.",
            "data": diet
        })

        spice = diet.get("spice_levels", {})
        self._chunks.append({
            "category": "spice",
            "title": "Spice Levels",
            "text": f"Mild dishes: {', '.join(spice.get('mild', []))}. Medium spicy dishes: {', '.join(spice.get('medium', []))}. Spicy and hot dishes: {', '.join(spice.get('spicy', []))}. Chettinad Chicken Curry and Madurai Mutton Kari Dosa are spicy.",
            "data": spice
        })

        # Offers & Combos
        offers = self.knowledge.get("offers_and_combos", [])
        for off in offers:
            self._chunks.append({
                "category": "offers",
                "title": f"Offer: {off['name']}",
                "text": f"Special Offer Deal: {off['name']} for ₹{off['price']} (regular ₹{off['original_price']}). {off['savings']}. Includes: {off['includes']}.",
                "data": off
            })

        # Coupons
        coupons = self.knowledge.get("coupons", [])
        coupons_text = ", ".join(f"{c['code']} ({c['benefit']})" for c in coupons)
        self._chunks.append({
            "category": "coupons",
            "title": "Discount Coupons",
            "text": f"Today's active coupon promo codes: {coupons_text}.",
            "data": coupons
        })

        # Table booking
        tables = self.knowledge.get("table_booking_info", {})
        table_rules = tables.get("booking_rules", "")
        for t in tables.get("table_types", []):
            self._chunks.append({
                "category": "table_booking",
                "title": f"Table: {t['id']}",
                "text": f"{t['id']} has maximum capacity of {t['seats']} guests. Type: {t['type']}. AC: {t['ac']}. {table_rules}",
                "data": t
            })

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        if not self._matrix or not self._vectorizer:
            return []
        q_vec = self._vectorizer.transform([query])
        sims = cosine_similarity(q_vec, self._matrix)[0]
        ranked = sorted(zip(self._chunks, sims), key=lambda x: x[1], reverse=True)
        return [chunk for chunk, score in ranked[:top_k] if score > 0.05]

    def get_hotel_info(self) -> dict:
        return self.knowledge.get("hotel_info", {})

    def get_rooms(self) -> list[dict]:
        return self.knowledge.get("rooms_catalog", [])

    def get_room(self, identifier: str) -> dict | None:
        if not identifier:
            return None
        lowered = identifier.lower().strip()
        for r in self.get_rooms():
            if r["id"] == lowered or lowered in r["name"].lower() or r["name"].lower() in lowered:
                return r
        return None

    def get_services(self) -> list[dict]:
        return self.knowledge.get("hotel_services", [])

    def get_service(self, identifier: str) -> dict | None:
        if not identifier:
            return None
        lowered = identifier.lower().strip()
        for s in self.get_services():
            if s["id"] == lowered or lowered in s["name"].lower() or s["name"].lower() in lowered:
                return s
        return None

    def get_policies(self) -> dict:
        return self.knowledge.get("hotel_info", {}).get("policies", {})

    def get_offers(self) -> list[dict]:
        return self.knowledge.get("offers_and_combos", [])

    def get_coupons(self) -> list[dict]:
        return self.knowledge.get("coupons", [])

    def get_table_specs(self) -> list[dict]:
        return self.knowledge.get("table_booking_info", {}).get("table_types", [])


knowledge_service = HotelKnowledgeService()
