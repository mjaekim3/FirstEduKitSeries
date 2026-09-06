import os
from supabase import create_client, Client

_client: Client | None = None

def get_db() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        _client = create_client(url, key)
    return _client

def load_classroom(email: str) -> dict | None:
    try:
        res = get_db().table("classrooms").select("*").eq("teacher_email", email).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"DB load error: {e}"); return None

def save_classroom(email: str, data: dict) -> None:
    try:
        db = get_db()
        existing = db.table("classrooms").select("id").eq("teacher_email", email).limit(1).execute()
        payload = {**data, "teacher_email": email, "updated_at": "now()"}
        if existing.data:
            db.table("classrooms").update(payload).eq("teacher_email", email).execute()
        else:
            db.table("classrooms").insert(payload).execute()
    except Exception as e:
        print(f"DB save error: {e}")
