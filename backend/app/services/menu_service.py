"""
menu_service.py
----------------
Loads the KPR Hotel menu and exposes:
  - semantic_search(query) -> vector/embedding-style search over menu text
    (TF-IDF + cosine similarity — a lightweight, dependency-light stand-in
    for a production vector DB like pgvector/FAISS + sentence-transformers;
    swap `_VECTORIZER`/`_MATRIX` build for real embeddings without changing
    the calling code).
  - fuzzy_find_item(name) -> best matching menu item for slot-filling
    ("2 chicken biryani" -> Chicken Biryani), tolerant of typos/Tanglish.
"""

import json
from pathlib import Path

from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "menu.json"


class MenuService:
    def __init__(self):
        self.items: list[dict] = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        self._by_id = {item["id"]: item for item in self.items}

        # Build a searchable corpus combining English + Tamil name, category
        # and tags so the same vector index answers both language queries.
        self._corpus = [
            " ".join([
                item["name_en"], item["name_ta"], item["category"],
                item["description_en"], " ".join(item["tags"]),
            ])
            for item in self.items
        ]
        self._vectorizer = TfidfVectorizer(analyzer="word", ngram_range=(1, 2))
        self._matrix = self._vectorizer.fit_transform(self._corpus)

        # Flat name index used for fuzzy slot-filling lookups.
        self._name_index = {}
        for item in self.items:
            self._name_index[item["name_en"].lower()] = item["id"]
            self._name_index[item["name_ta"]] = item["id"]
            for tag in item["tags"]:
                self._name_index.setdefault(tag.lower(), item["id"])

    def all_items(self) -> list[dict]:
        return self.items

    def grouped_by_meal_type(self) -> dict:
        """Groups the menu into Breakfast / Lunch / Dinner buckets so the
        frontend can render them as separate sections/tabs instead of one
        flat list. An item can appear in more than one bucket (e.g. dosa
        served at both breakfast and dinner)."""
        order = ["breakfast", "lunch", "dinner"]
        grouped: dict[str, list[dict]] = {m: [] for m in order}
        for item in self.items:
            for meal in item.get("meal_type", []):
                if meal in grouped:
                    grouped[meal].append(item)
        return grouped

    def get(self, item_id: str) -> dict | None:
        return self._by_id.get(item_id)

    def get_by_id(self, item_id: str) -> dict | None:
        return self._by_id.get(item_id)

    def semantic_search(self, query: str, top_k: int = 5, min_score: float = 0.08) -> list[dict]:
        """Vector-style semantic search used for open menu/ingredient/
        recommendation questions ("what's spicy", "food pathina kelvi")."""
        q_vec = self._vectorizer.transform([query])
        sims = cosine_similarity(q_vec, self._matrix)[0]
        ranked = sorted(zip(self.items, sims), key=lambda x: x[1], reverse=True)
        return [item for item, score in ranked[:top_k] if score >= min_score]

    def fuzzy_find_item(self, name_guess: str, score_cutoff: int = 50) -> dict | None:
        """Best-effort match from a spoken/typed item name to a menu item.
        Prioritizes item English and Tamil names over generic tags."""
        lowered = name_guess.lower().strip()
        best_item = None
        best_score = 0

        for item in self.items:
            name_en = item["name_en"].lower()
            name_ta = item["name_ta"].lower()

            if lowered == name_en or lowered == name_ta:
                return item

            r_en = SequenceMatcher(None, lowered, name_en).ratio() * 100
            r_ta = SequenceMatcher(None, lowered, name_ta).ratio() * 100
            score = max(r_en, r_ta)

            name_words = set(name_en.split())
            query_words = set(lowered.split())
            if name_words.issubset(query_words):
                score += 30
            elif "biryani" in lowered and "biryani" in name_en:
                score += 25
            elif "meals" in lowered and "meals" in name_en:
                score += 25
            elif "dosa" in lowered and "dosa" in name_en:
                score += 25

            if score > best_score:
                best_score = score
                best_item = item

        if best_score >= score_cutoff:
            return best_item

        return None


    def is_food_related(self, text: str, threshold: float = 0.05) -> bool:
        """Guardrail check: does this text touch the food/menu domain at all?"""
        q_vec = self._vectorizer.transform([text])
        sims = cosine_similarity(q_vec, self._matrix)[0]
        return bool(len(sims) and sims.max() >= threshold)


menu_service = MenuService()
