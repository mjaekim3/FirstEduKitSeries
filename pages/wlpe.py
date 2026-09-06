"""
FirstEduKit — Weekly Lesson Plan Export (Dash)
"""
import re, time, io, zipfile, json, base64, os
import requests
import dash
import dash_bootstrap_components as dbc
from dash import dcc, html, callback, Input, Output, State, no_update, ctx

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

dash.register_page(__name__, path="/wlpe", name="📋 WLPE")

SHEET_RE    = re.compile(r'\((.+?)\)\s+(\d+-\d+)')
DEFAULT_SID = "14CbSiN8DsAPCeYlyfOZAVyOdGk3EBU-XBxco5mttQlM"

# ── 구글 인증 ─────────────────────────────────────────────────────────
def get_auth_headers():
    raw = os.environ.get("GCP_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        return None, "환경변수 GCP_SERVICE_ACCOUNT_JSON 없음"
    try:
        key_dict = json.loads(raw)
    except Exception:
        return None, "JSON 파싱 실패"
    creds = service_account.Credentials.from_service_account_info(
        key_dict,
        scopes=["https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"]
    )
    creds.refresh(google.auth.transport.requests.Request())
    return {"Authorization": f"Bearer {creds.token}"}, None

def fetch_with_retry(url, headers, max_retries=5):
    for attempt in range(1, max_retries + 1):
        try:
            res = requests.get(url, headers=headers, timeout=30)
            res.raise_for_status()
            return res
        except requests.exceptions.HTTPError as e:
            code = e.response.status_code if e.response else None
            if code in (429, 500, 502, 503, 504):
                time.sleep(attempt * 15 if code == 429 else attempt * 5)
            else:
                raise
        except requests.exceptions.RequestException:
            if attempt == max_retries: raise
            time.sleep(attempt * 3)
    raise Exception("최대 재시도 횟수 초과")

def list_sheets(sid, headers):
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
                seen.append(w); weeks.append(w)
    return sheets, weeks

def sheet_to_jpeg(sid, gid, headers, dpi=300):
    url = (f"https://docs.google.com/spreadsheets/d/{sid}/export"
           f"?format=pdf&gid={gid}&portrait=true&size=A4&scale=4"
           f"&gridlines=false&r1=0&c1=0&r2=22&c2=6&fitw=true"
           f"&top_margin=0.25&bottom_margin=0.00&left_margin=0.25&right_margin=0.25")
    res = fetch_with_retry(url, headers)
    doc = fitz.open(stream=res.content, filetype="pdf")
    page = doc.load_page(0)
    r = page.rect
    clip = fitz.Rect(r.x0, r.y0, r.x1, r.y1 - 100)
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72), clip=clip, alpha=False)
    jpg = pix.tobytes("jpeg")
    doc.close()
    return jpg

def get_targets(all_sheets, week_label, grades):
    targets, seen = [], set()
    for s in all_sheets:
        m = SHEET_RE.search(s["name"])
        if not m: continue
        wl, ck = m.group(1), m.group(2)
        if wl != week_label or ck.split("-")[0] not in grades or ck in seen: continue
        seen.add(ck)
        targets.append({**s, "class_key": ck, "week_label": wl})
    return sorted(targets, key=lambda x: x["class_key"])

# ── 레이아웃 ─────────────────────────────────────────────────────────
layout = dbc.Container([
    dcc.Store(id="wlpe-sheets", data=None),
    dcc.Store(id="wlpe-weeks",  data=None),
    dcc.Download(id="wlpe-dl"),

    html.H4("📋 Weekly Lesson Plan Export", className="mt-3 mb-1"),
    html.Hr(),

    dbc.Row([
        # ── 사이드바 ──────────────────────────────────────────────────
        dbc.Col([
            html.B("학년 선택"),
            dbc.Checklist(
                id="wlpe-grades",
                options=[{"label": f"{g}학년", "value": g} for g in ["1","2","3","4"]],
                value=[],
                className="mt-1 mb-3",
            ),
            dbc.Button("🔍 시트 조회", id="wlpe-load-btn", color="primary", size="sm", className="w-100"),
            html.Div(id="wlpe-load-status", className="mt-2 small"),
        ], width=2),

        # ── 메인 영역 ─────────────────────────────────────────────────
        dbc.Col([
            html.Div(id="wlpe-week-selector"),
            html.Div(id="wlpe-main"),
        ], width=10),
    ]),
], fluid=True)

# ── 콜백: 시트 조회 ──────────────────────────────────────────────────
@callback(
    Output("wlpe-sheets", "data"),
    Output("wlpe-weeks",  "data"),
    Output("wlpe-load-status", "children"),
    Input("wlpe-load-btn", "n_clicks"),
    State("wlpe-grades", "value"),
    prevent_initial_call=True,
)
def load_sheets(n, grades):
    if not grades:
        return no_update, no_update, dbc.Alert("학년을 선택하세요.", color="warning", className="py-1 px-2")
    if not GOOGLE_AUTH_OK:
        return no_update, no_update, dbc.Alert("google-auth 없음", color="danger", className="py-1 px-2")
    headers, err = get_auth_headers()
    if err:
        return no_update, no_update, dbc.Alert(err, color="danger", className="py-1 px-2")
    try:
        sheets, weeks = list_sheets(DEFAULT_SID, headers)
        return sheets, weeks, dbc.Alert(f"✅ {len(sheets)}개 시트", color="success", className="py-1 px-2")
    except Exception as e:
        return no_update, no_update, dbc.Alert(str(e), color="danger", className="py-1 px-2")

# ── 콜백: 주차 선택기 ────────────────────────────────────────────────
@callback(
    Output("wlpe-week-selector", "children"),
    Input("wlpe-weeks", "data"),
)
def render_week_selector(weeks):
    if not weeks:
        return html.P("시트를 조회하면 주차 목록이 표시됩니다.", className="text-muted")
    return dbc.RadioItems(
        id="wlpe-week",
        options=[{"label": w, "value": w} for w in weeks],
        value=weeks[0],
        inline=True,
        className="mb-3",
    )

# ── 콜백: 반 카드 목록 ───────────────────────────────────────────────
@callback(
    Output("wlpe-main", "children"),
    Input("wlpe-week-selector", "children"),  # week selector 렌더 후
    State("wlpe-sheets", "data"),
    State("wlpe-grades", "value"),
    prevent_initial_call=True,
)
def render_cards(_, sheets, grades):
    if not sheets or not grades:
        return no_update
    # week-selector가 방금 렌더됐을 때는 week value가 없으므로 첫 주차 사용
    return html.Div("주차를 선택하면 반 목록이 나타납니다.", className="text-muted")

@callback(
    Output("wlpe-main", "children", allow_duplicate=True),
    Input({"type": "wlpe-week-radio", "index": 0}, "value"),
    State("wlpe-sheets", "data"),
    State("wlpe-grades", "value"),
    prevent_initial_call=True,
)
def _placeholder(v, s, g):
    return no_update

# wlpe-week RadioItems는 동적으로 생성되어 id="wlpe-week"가 suppress_callback_exceptions 필요
@callback(
    Output("wlpe-main", "children", allow_duplicate=True),
    Input("wlpe-week", "value"),
    State("wlpe-sheets", "data"),
    State("wlpe-grades", "value"),
    prevent_initial_call=True,
)
def render_class_cards(week, sheets, grades):
    if not week or not sheets or not grades:
        return no_update
    targets = get_targets(sheets, week, grades)
    if not targets:
        return dbc.Alert("해당 조건의 시트가 없습니다.", color="warning")

    cards = []
    for t in targets:
        cards.append(dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H6(t["class_key"], className="mb-0"),
                    html.Small(t["week_label"], className="text-muted"),
                    html.Div(id={"type":"wlpe-preview","gid":t["gid"]}, className="mt-2"),
                    dbc.Button("🖼️ 미리보기", id={"type":"wlpe-prev-btn","gid":t["gid"],"ck":t["class_key"],"wl":t["week_label"]},
                               size="sm", color="secondary", className="mt-2 w-100"),
                ])
            ], className="mb-3")
        ], width=4))

    zip_btn = dbc.Button(
        f"📦 전체 {len(targets)}개 ZIP 다운로드",
        id={"type":"wlpe-zip-btn","week":week,"grades":json.dumps(grades)},
        color="success", className="mb-3"
    )
    return html.Div([zip_btn, dbc.Row(cards)])

# ── 콜백: 개별 미리보기 ──────────────────────────────────────────────
@callback(
    Output({"type":"wlpe-preview","gid": dash.MATCH}, "children"),
    Input({"type":"wlpe-prev-btn","gid": dash.MATCH,"ck": dash.MATCH,"wl": dash.MATCH}, "n_clicks"),
    prevent_initial_call=True,
)
def preview_sheet(n):
    if not n: return no_update
    triggered = ctx.triggered_id
    gid = triggered["gid"]
    ck  = triggered["ck"]
    wl  = triggered["wl"]
    if not FITZ_OK:
        return dbc.Alert("PyMuPDF 없음", color="danger")
    headers, err = get_auth_headers()
    if err:
        return dbc.Alert(err, color="danger")
    try:
        jpg = sheet_to_jpeg(DEFAULT_SID, gid, headers)
        b64 = base64.b64encode(jpg).decode()
        return html.Div([
            html.Img(src=f"data:image/jpeg;base64,{b64}", style={"width":"100%","borderRadius":"4px"}),
            dcc.Download(id=f"dl-{gid}"),
            html.A("📥 저장", href=f"data:image/jpeg;base64,{b64}",
                   download=f"{ck}_{wl}.jpg",
                   className="btn btn-sm btn-outline-primary mt-1 w-100"),
        ])
    except Exception as e:
        return dbc.Alert(str(e), color="danger")
