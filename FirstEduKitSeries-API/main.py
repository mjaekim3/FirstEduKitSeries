from dotenv import load_dotenv; load_dotenv()
from fastapi import FastAPI, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import os, json, time, requests
from google.oauth2 import service_account
import google.auth.transport.requests
import fitz

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEFAULT_SID = "14CbSiN8DsAPCeYlyfOZAVyOdGk3EBU-XBxco5mttQlM"

def get_headers():
    key_dict = json.loads(os.environ["GCP_SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(
        key_dict,
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"]
    )
    creds.refresh(google.auth.transport.requests.Request())
    return {"Authorization": f"Bearer {creds.token}"}

def fetch_retry(url, headers, retries=5):
    for i in range(1, retries+1):
        try:
            r = requests.get(url, headers=headers, timeout=30)
            r.raise_for_status()
            return r
        except requests.HTTPError as e:
            code = e.response.status_code if e.response else None
            if code in (429,500,502,503,504):
                time.sleep(i*15 if code==429 else i*5)
            else: raise
        except Exception:
            if i==retries: raise
            time.sleep(i*3)

@app.get("/sheets")
def list_sheets():
    import re
    SHEET_RE = re.compile(r'\((.+?)\)\s+(\d+-\d+)')
    h = get_headers()
    r = requests.get(f"https://sheets.googleapis.com/v4/spreadsheets/{DEFAULT_SID}?fields=sheets.properties", headers=h, timeout=15)
    r.raise_for_status()
    sheets = [{"name":s["properties"]["title"],"gid":str(s["properties"]["sheetId"])} for s in r.json().get("sheets",[])]
    seen, weeks = [], []
    for s in sheets:
        m = SHEET_RE.search(s["name"])
        if m and m.group(1) not in seen:
            seen.append(m.group(1)); weeks.append(m.group(1))
    return {"sheets": sheets, "weeks": weeks}

@app.get("/export")
def export_jpg(gid: str = Query(...)):
    h = get_headers()
    url = (f"https://docs.google.com/spreadsheets/d/{DEFAULT_SID}/export"
           f"?format=pdf&gid={gid}&portrait=true&size=A4&scale=4"
           f"&gridlines=false&r1=0&c1=0&r2=22&c2=6&fitw=true"
           f"&top_margin=0.25&bottom_margin=0&left_margin=0.25&right_margin=0.25")
    r = fetch_retry(url, h)
    doc = fitz.open(stream=r.content, filetype="pdf")
    page = doc.load_page(0)
    rect = page.rect
    crop_pts = 95
    clip = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y1 - crop_pts)
    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), clip=clip, alpha=False)
    jpg = pix.tobytes("jpeg")
    doc.close()
    return Response(content=jpg, media_type="image/jpeg")

@app.get("/export-all")
def export_all(gids: str = Query(...), names: str = Query(...)):
    import zipfile, io
    gid_list = gids.split(",")
    name_list = names.split(",")
    h = get_headers()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for gid, name in zip(gid_list, name_list):
            url = (f"https://docs.google.com/spreadsheets/d/{DEFAULT_SID}/export"
                   f"?format=pdf&gid={gid}&portrait=true&size=A4&scale=4"
                   f"&gridlines=false&r1=0&c1=0&r2=22&c2=6&fitw=true"
                   f"&top_margin=0.25&bottom_margin=0&left_margin=0.25&right_margin=0.25")
            r = fetch_retry(url, h)
            doc = fitz.open(stream=r.content, filetype="pdf")
            page = doc.load_page(0)
            rect = page.rect
            clip = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y1 - 95)
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), clip=clip, alpha=False)
            zf.writestr(f"{name}.jpg", pix.tobytes("jpeg"))
            doc.close()
    return Response(content=buf.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": "attachment; filename=lesson_plans.zip"})
