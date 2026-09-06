"""
FirstEduKit — Weekly Lesson Plan Export (Web)
"""
import re
import time
import io
import zipfile
import requests
import streamlit as st

try:
    from google.oauth2 import service_account
    import google.auth.transport.requests
    GOOGLE_AUTH_OK = True
except ImportError:
    GOOGLE_AUTH_OK = False

try:
    import fitz
    FITZ_OK = True
except ImportError:
    FITZ_OK = False

# ── 상수 ──────────────────────────────────────────────────────────────
SHEET_RE    = re.compile(r'\((.+?)\)\s+(\d+-\d+)')
DEFAULT_SID = "14CbSiN8DsAPCeYlyfOZAVyOdGk3EBU-XBxco5mttQlM"

# ── 인증 ──────────────────────────────────────────────────────────────
def get_auth_headers(key_dict: dict) -> dict:
    creds = service_account.Credentials.from_service_account_info(
        key_dict,
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"]
    )
    creds.refresh(google.auth.transport.requests.Request())
    return {"Authorization": f"Bearer {creds.token}"}


def fetch_with_retry(url, headers, max_retries=5):
    for attempt in range(1, max_retries + 1):
        try:
            res = requests.get(url, headers=headers, timeout=30)
            res.raise_for_status()
            return res
        except requests.exceptions.HTTPError as e:
            code = e.response.status_code if e.response is not None else None
            if code in (429, 500, 502, 503, 504):
                wait = attempt * 15 if code == 429 else attempt * 5
                time.sleep(wait)
            else:
                raise
        except requests.exceptions.RequestException:
            if attempt == max_retries:
                raise
            time.sleep(attempt * 3)
    raise Exception("최대 재시도 횟수 초과")


# ── 시트 목록 조회 ────────────────────────────────────────────────────
def list_sheets(sid: str, headers: dict):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=sheets.properties"
    res = requests.get(url, headers=headers, timeout=15)
    res.raise_for_status()
    sheets = [
        {"name": s["properties"]["title"], "gid": str(s["properties"]["sheetId"])}
        for s in res.json().get("sheets", [])
    ]
    seen, weeks = [], []
    for s in sheets:
        m = SHEET_RE.search(s["name"])
        if m:
            w = m.group(1)
            if w not in seen:
                seen.append(w)
                weeks.append(w)
    return sheets, weeks


# ── PDF → 이미지 ──────────────────────────────────────────────────────
def sheet_to_image(sid: str, gid: str, headers: dict, dpi=300):
    url = (f"https://docs.google.com/spreadsheets/d/{sid}/export"
           f"?format=pdf&gid={gid}&portrait=true&size=A4&scale=4"
           f"&gridlines=false&r1=0&c1=0&r2=22&c2=6&fitw=true"
           f"&top_margin=0.25&bottom_margin=0.00&left_margin=0.25&right_margin=0.25")
    res = fetch_with_retry(url, headers)
    doc = fitz.open(stream=res.content, filetype="pdf")
    page = doc.load_page(0)
    # 아래쪽만 크롭 (구글이 강제하는 아래 여백 제거)
    r = page.rect
    clip = fitz.Rect(r.x0, r.y0, r.x1, r.y1 - 100)
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72),
                          clip=clip, alpha=False)
    jpg = pix.tobytes("jpeg")
    doc.close()
    return jpg


# ── 대상 시트 필터링 ──────────────────────────────────────────────────
def get_targets(all_sheets, week_label, grades):
    targets, seen = [], set()
    for s in all_sheets:
        m = SHEET_RE.search(s["name"])
        if not m:
            continue
        wl, ck = m.group(1), m.group(2)
        if wl != week_label or ck.split("-")[0] not in grades or ck in seen:
            continue
        seen.add(ck)
        targets.append({**s, "class_key": ck, "week_label": wl})
    return sorted(targets, key=lambda x: x["class_key"])


# ── 메인 UI ───────────────────────────────────────────────────────────
st.set_page_config(page_title="WLPE · FirstEduKit Series", page_icon="📤", layout="wide")
st.title("📤 Weekly Lesson Plan Export")
st.caption("FirstEduKit Series · 개발자 MJ@HIFS")

# ── 사이드바 ──────────────────────────────────────────────────────────
spreadsheet_id = DEFAULT_SID

with st.sidebar:
    st.markdown("**학년 선택**")
    grades = [g for g in ["1", "2", "3", "4"]
              if st.checkbox(f"{g}학년", key=f"grade_{g}")]

# ── 인증 ─────────────────────────────────────────────────────────────
if "gcp_service_account" in st.secrets:
    key_dict = dict(st.secrets["gcp_service_account"])
else:
    key_dict = st.session_state.get("key_dict")

if not GOOGLE_AUTH_OK:
    st.error("google-auth 라이브러리가 없습니다.")
    st.stop()

if not key_dict:
    st.info("인증 정보가 없습니다. 관리자에게 문의하세요.")
    st.stop()

if not FITZ_OK:
    st.error("PyMuPDF가 없습니다.")
    st.stop()

# ── 학년 선택 시 자동 시트 조회 ──────────────────────────────────────
if grades and "headers" not in st.session_state:
    with st.spinner("시트 목록 조회 중..."):
        try:
            headers = get_auth_headers(key_dict)
            sheets, weeks = list_sheets(spreadsheet_id, headers)
            st.session_state["all_sheets"] = sheets
            st.session_state["weeks"]      = weeks
            st.session_state["headers"]    = headers
        except Exception as e:
            st.error(f"조회 실패: {e}")
            st.stop()

if not grades:
    st.info("사이드바에서 학년을 선택하세요.")
    st.stop()

weeks = st.session_state.get("weeks", [])
if not weeks:
    st.stop()

# ── 주차 선택 ─────────────────────────────────────────────────────────
week_label = st.radio("주차 선택", weeks, horizontal=True)

if not grades:
    st.caption("사이드바에서 학년을 선택하세요.")
    st.stop()

targets = get_targets(st.session_state.get("all_sheets", []), week_label, grades)
if not targets:
    st.warning("해당 조건의 시트가 없습니다.")
    st.stop()

headers = st.session_state.get("headers")

# ── 전체 ZIP ──────────────────────────────────────────────────────────
if st.button(f"📦 전체 {len(targets)}개 ZIP 다운로드 (300dpi)", use_container_width=False):
    buf = io.BytesIO()
    with st.spinner(f"전체 생성 중... ({len(targets)}개 × ~5초)"):
        with zipfile.ZipFile(buf, "w") as zf:
            prog = st.progress(0)
            for i, s in enumerate(targets):
                try:
                    jpg = sheet_to_image(spreadsheet_id, s["gid"], headers)
                    zf.writestr(f"{s['class_key']}_{s['week_label']}.jpg", jpg)
                except Exception:
                    pass
                prog.progress((i + 1) / len(targets))
                time.sleep(5)
            prog.empty()
    buf.seek(0)
    st.download_button("📥 ZIP 저장", data=buf,
                       file_name=f"LessonPlans_{week_label}.zip",
                       mime="application/zip")

st.divider()

# ── 카드 그리드 + 개별 미리보기/다운로드 ─────────────────────────────
COLS = 3
for row_start in range(0, len(targets), COLS):
    batch = targets[row_start:row_start + COLS]
    cols = st.columns(COLS)

    # 반 이름 표시
    for j, s in enumerate(batch):
        with cols[j]:
            st.markdown(
                f"<div style='border:2px solid #2E7D32;border-radius:8px;"
                f"padding:10px 14px;background:#fff;text-align:center;"
                f"font-weight:700;font-size:15px'>"
                f"{s['class_key']} <span style='font-size:12px;color:#757575'>"
                f"{s['week_label']}</span></div>",
                unsafe_allow_html=True
            )

    # 미리보기/다운로드 버튼
    for j, s in enumerate(batch):
        with cols[j]:
            if st.button("🖼️ 미리보기 · 다운로드",
                         key=f"prev_{s['class_key']}",
                         use_container_width=True):
                with st.spinner(f"{s['class_key']} 생성 중..."):
                    try:
                        jpg = sheet_to_image(spreadsheet_id, s["gid"], headers, dpi=300)
                        st.session_state[f"jpg_{s['class_key']}"] = jpg
                    except Exception as e:
                        st.error(f"생성 실패: {e}")

    # 미리보기 이미지 + 다운로드 버튼
    for j, s in enumerate(batch):
        jpg = st.session_state.get(f"jpg_{s['class_key']}")
        if jpg:
            with cols[j]:
                st.image(jpg, caption=s['class_key'])
                st.download_button(
                    "📥 저장",
                    data=jpg,
                    file_name=f"{s['class_key']}_{s['week_label']}.jpg",
                    mime="image/jpeg",
                    key=f"dl_{s['class_key']}",
                    use_container_width=True
                )
