"""
templates.py
------------
Bilingual response templates. Tanglish (`ta-Latn`) replies re-use the
Tamil-script templates so gTTS synthesizes them naturally as spoken Tamil,
while the chat bubble can optionally show Tamil script — this mirrors how
real bilingual support agents reply in "proper" Tamil even when the
customer types in romanized Tanglish.
"""

T = {
    "greeting": {
        "en": "Vanakkam! Welcome to KPR Hotel 🍛 What would you like to order today?",
        "ta": "வணக்கம்! KPR ஹோட்டலுக்கு வரவேற்கிறோம் 🍛 இன்று என்ன ஆர்டர் செய்ய விரும்புகிறீர்கள்?",
    },
    "item_added": {
        "en": "Added {qty} x {item} to your cart{custom}. Anything else?",
        "ta": "{qty} x {item}{custom} உங்கள் கார்ட்டில் சேர்க்கப்பட்டது. வேறு ஏதாவது வேண்டுமா?",
    },
    "item_not_found": {
        "en": "Sorry, I couldn't find \"{query}\" on our menu. Could you check the spelling or try another dish?",
        "ta": "மன்னிக்கவும், \"{query}\" எங்கள் மெனுவில் இல்லை. வேறு பெயரில் முயற்சிக்கவும்.",
    },
    "item_removed": {
        "en": "Removed {item} from your cart.",
        "ta": "{item} உங்கள் கார்ட்டிலிருந்து அகற்றப்பட்டது.",
    },
    "cart_empty": {
        "en": "Your cart is empty right now. Tell me what you'd like to eat!",
        "ta": "உங்கள் கார்ட் காலியாக உள்ளது. என்ன சாப்பிட விரும்புகிறீர்கள்?",
    },
    "cart_summary": {
        "en": "Here's your cart so far — total ₹{total}. Say 'checkout' when you're ready!",
        "ta": "இது உங்கள் கார்ட் — மொத்தம் ₹{total}. தயாராக இருந்தால் 'checkout' என்று சொல்லுங்கள்!",
    },
    "ask_payment_method": {
        "en": "Your total is ₹{total}. How would you like to pay — Cash or UPI?",
        "ta": "உங்கள் மொத்த தொகை ₹{total}. பணம் எப்படி செலுத்த விரும்புகிறீர்கள் — Cash அல்லது UPI?",
    },
    "upi_qr_shown": {
        "en": "Scan the QR code shown to pay ₹{total} via UPI. Let me know once you've paid!",
        "ta": "₹{total} செலுத்த காட்டப்பட்டுள்ள QR குறியீட்டை ஸ்கேன் செய்யவும். பணம் செலுத்தியதும் சொல்லுங்கள்!",
    },
    "cash_selected": {
        "en": "Great, ₹{total} will be collected as Cash on Delivery. Confirming your order now!",
        "ta": "சரி, ₹{total} டெலிவரி செய்யும் போது பணமாக வசூலிக்கப்படும். ஆர்டர் உறுதி செய்யப்படுகிறது!",
    },
    "order_confirmed": {
        "en": "🎉 Order Confirmed! Your order #{order_id} for ₹{total} is being prepared. Thank you for choosing KPR Hotel!",
        "ta": "🎉 ஆர்டர் உறுதி செய்யப்பட்டது! உங்கள் ஆர்டர் #{order_id} (₹{total}) தயாராகிறது. KPR ஹோட்டலைத் தேர்ந்தெடுத்ததற்கு நன்றி!",
    },
    "checkout_empty_cart": {
        "en": "Your cart is empty — add a few dishes before checking out!",
        "ta": "உங்கள் கார்ட் காலியாக உள்ளது — செக்அவுட் செய்வதற்கு முன் சில உணவுகளைச் சேர்க்கவும்!",
    },
    "off_topic_pivot": {
        "en": "I'm KPR Hotel's food assistant, so I can only help with our menu, orders and food questions 😊 Would you like to see today's specials?",
        "ta": "நான் KPR ஹோட்டலின் உணவு உதவியாளர், எனவே மெனு, ஆர்டர்கள் மற்றும் உணவு கேள்விகளில் மட்டுமே உதவ முடியும் 😊 இன்றைய ஸ்பெஷல்களைப் பார்க்க விரும்புகிறீர்களா?",
    },
    "no_search_results": {
        "en": "I couldn't find a dish matching that. Try asking about biryani, dosa, curries, starters or desserts!",
        "ta": "அதற்கு பொருந்தும் உணவு கிடைக்கவில்லை. பிரியாணி, தோசை, கறி, ஸ்டார்ட்டர் அல்லது இனிப்பு பற்றி கேளுங்கள்!",
    },
    "already_confirmed": {
        "en": "This order is already confirmed 🎉 Would you like to start a new order?",
        "ta": "இந்த ஆர்டர் ஏற்கனவே உறுதி செய்யப்பட்டது 🎉 புதிய ஆர்டர் தொடங்க விரும்புகிறீர்களா?",
    },
    "payment_unclear": {
        "en": "Please choose Cash or UPI to proceed with payment.",
        "ta": "பணம் செலுத்த Cash அல்லது UPI என்பதைத் தேர்ந்தெடுக்கவும்.",
    },
}


def render(lang: str, key: str, **kwargs) -> str:
    lang_key = "ta" if lang in ("ta", "ta-Latn") else "en"
    template = T.get(key, {}).get(lang_key) or T.get(key, {}).get("en", "")
    return template.format(**kwargs)
