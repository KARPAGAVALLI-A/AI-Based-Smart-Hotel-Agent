"""
table_service.py
----------------
Centralized Table Reservation & Real-Time Availability Engine for KPR Hotel.
Shared between REST API endpoints and AI Assistant dialogue actions.
"""

from datetime import datetime, date

# Standard dining tables definition
ALL_TABLES = [
    {"id": "Table 1", "seats": 2, "type": "Standard Couple Table", "ac": False},
    {"id": "Table 2", "seats": 4, "type": "Standard Family Table", "ac": False},
    {"id": "Table 3", "seats": 4, "type": "A/C Executive Dining Table", "ac": True},
    {"id": "Table 4", "seats": 6, "type": "A/C Family Booth", "ac": True},
    {"id": "Table 5", "seats": 2, "type": "Cozy Window Seating", "ac": False},
    {"id": "Table 6", "seats": 8, "type": "Grand Family / Celebration Table", "ac": True},
]

# Initial in-memory confirmed reservations
reservations_db = [
    {
        "id": "KPR-TB-101",
        "name": "Sundar Pichai",
        "phone": "+91 98401 11223",
        "date": "2026-09-30",
        "time": "12:30 PM (Lunch)",
        "guests": 4,
        "table_type": "Table 2",
        "special_requests": "Window side",
        "status": "Confirmed"
    },
    {
        "id": "KPR-TB-102",
        "name": "Anitha Raman",
        "phone": "+91 94441 22334",
        "date": "2026-09-30",
        "time": "07:30 PM (Dinner)",
        "guests": 2,
        "table_type": "Table 5",
        "special_requests": "Quiet corner",
        "status": "Confirmed"
    }
]


def normalize_time_slot(time_str: str) -> str:
    """Normalizes various user inputs to standard time slot strings."""
    t = time_str.lower().strip()
    if "12:30" in t or "12" in t and "lunch" in t:
        return "12:30 PM (Lunch)"
    if "1:30" in t or "01:30" in t:
        return "01:30 PM (Lunch)"
    if "7:30" in t or "07:30" in t or ("7" in t and "pm" in t):
        return "07:30 PM (Dinner)"
    if "8:30" in t or "08:30" in t or ("8" in t and "pm" in t):
        return "08:30 PM (Dinner)"
    return time_str if time_str else "07:30 PM (Dinner)"


def get_all_reservations() -> list[dict]:
    return reservations_db


def get_table_availability(booking_date: str = None, booking_time: str = None) -> list[dict]:
    """Calculates true dynamic availability for every table for a specific date and time slot.
    DOES NOT mark tables booked by default. Tables are ONLY booked if a confirmed reservation
    exists for that exact date and time slot."""
    if not booking_date:
        booking_date = date.today().strftime("%Y-%m-%d")

    norm_time = normalize_time_slot(booking_time) if booking_time else ""

    booked_tables = set()
    for res in reservations_db:
        if res.get("status") == "Confirmed" and res.get("date") == booking_date:
            res_time = normalize_time_slot(res.get("time", ""))
            if not norm_time or res_time == norm_time:
                t_val = res.get("table_type", "")
                booked_tables.add(t_val)
                # also check for Table 1 vs Table 1 (Standard)
                for t in ALL_TABLES:
                    if t["id"] in t_val:
                        booked_tables.add(t["id"])

    result = []
    for t in ALL_TABLES:
        is_booked = t["id"] in booked_tables
        result.append({
            "id": t["id"],
            "seats": t["seats"],
            "type": t["type"],
            "ac": t["ac"],
            "status": "booked" if is_booked else "available",
            "is_available": not is_booked
        })
    return result


def find_suitable_table(guests: int, booking_date: str, booking_time: str) -> dict | None:
    """Finds the best available table matching guest capacity."""
    avail = get_table_availability(booking_date, booking_time)
    suitable = [t for t in avail if t["is_available"] and t["seats"] >= guests]
    if suitable:
        # Pick table with closest seat capacity to minimize wasted seats
        suitable.sort(key=lambda t: t["seats"])
        return suitable[0]
    return None


def book_table(
    name: str,
    phone: str,
    booking_date: str,
    booking_time: str,
    guests: int,
    table_id: str = None,
    special_requests: str = "None"
) -> dict:
    """Performs real table booking with final concurrency check."""
    norm_time = normalize_time_slot(booking_time)

    # Validate 4-digit future year
    try:
        parts = booking_date.split("-")
        year = int(parts[0])
        if year < 2026 or year > 2030 or len(parts[0]) != 4:
            return {"status": "error", "message": "Invalid date year. Please select a valid 4-digit date."}
    except Exception:
        return {"status": "error", "message": "Invalid date format. Please use YYYY-MM-DD."}

    # If table_id is not specified, auto-assign best available table
    if not table_id:
        table_obj = find_suitable_table(guests, booking_date, norm_time)
        if not table_obj:
            return {
                "status": "error",
                "message": f"Sorry, all tables for {guests} guests are currently booked on {booking_date} at {norm_time}. Please try another time slot."
            }
        table_id = table_obj["id"]

    # Final availability check
    avail = get_table_availability(booking_date, norm_time)
    target = next((t for t in avail if t["id"] == table_id), None)
    if not target or not target["is_available"]:
        return {
            "status": "error",
            "message": f"{table_id} is already booked for {booking_date} at {norm_time}. Please choose an available table."
        }

    booking_id = f"KPR-TB-{abs(hash(name + booking_date + norm_time + str(len(reservations_db)))) % 9000 + 1000}"
    new_res = {
        "id": booking_id,
        "name": name,
        "phone": phone,
        "date": booking_date,
        "time": norm_time,
        "guests": guests,
        "table_type": table_id,
        "special_requests": special_requests or "None",
        "status": "Confirmed",
        "created_at": datetime.now().isoformat()
    }
    reservations_db.append(new_res)

    return {
        "status": "success",
        "booking_id": booking_id,
        "reservation": new_res,
        "table_id": table_id,
        "message": f"Table booked successfully! Table {table_id} reserved for {guests} guests on {booking_date} at {norm_time}."
    }
