"""
qr_service.py
-------------
Generates a functional-format (mock) UPI payment QR code that encodes the
exact calculated order total, using the standard `upi://pay` deep-link
schema recognised by real UPI apps (GPay/PhonePe/Paytm). No real payment
gateway is wired up — this is a demo/mock merchant VPA for interview
purposes — but the QR is a genuine, scannable UPI intent string.
"""

import base64
import io
from urllib.parse import quote

try:
    import qrcode
    _HAS_QR = True
except ImportError:
    _HAS_QR = False

MERCHANT_VPA = "kprhotel@upi"
MERCHANT_NAME = "KPR Hotel"


def build_upi_uri(amount: float, order_id: str) -> str:
    note = quote(f"KPR Hotel Order {order_id}")
    return (
        f"upi://pay?pa={MERCHANT_VPA}&pn={quote(MERCHANT_NAME)}"
        f"&am={amount:.2f}&cu=INR&tn={note}&tr={order_id}"
    )


def generate_qr_base64(amount: float, order_id: str) -> dict:
    uri = build_upi_uri(amount, order_id)
    if _HAS_QR:
        img = qrcode.make(uri, box_size=8, border=2)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        qr_data = f"data:image/png;base64,{b64}"
    else:
        # Fallback SVG QR placeholder
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#fff"/><text x="100" y="100" text-anchor="middle" font-size="12" fill="#333">UPI QR: ₹{amount:.2f}</text></svg>'
        b64 = base64.b64encode(svg.encode("utf-8")).decode("utf-8")
        qr_data = f"data:image/svg+xml;base64,{b64}"
    return {
        "qr_image_base64": qr_data,
        "upi_uri": uri,
        "amount": amount,
        "vpa": MERCHANT_VPA,
    }
