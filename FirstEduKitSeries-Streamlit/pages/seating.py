import dash, json, io, math, random, os
import dash_bootstrap_components as dbc
from dash import dcc, html, callback, clientside_callback, Input, Output, State, no_update, ctx
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager
import base64

dash.register_page(__name__, path="/seating", name="🪑 Seating Chart")

# ── 한글 폰트 ─────────────────────────────────────────────────────────
def _set_font():
    for fp in ["C:/Windows/Fonts/malgun.ttf","/usr/share/fonts/truetype/nanum/NanumGothic.ttf"]:
        if os.path.exists(fp):
            font_manager.fontManager.addfont(fp)
            matplotlib.rcParams["font.family"] = font_manager.FontProperties(fname=fp).get_name()
            return
_set_font(); matplotlib.rcParams["axes.unicode_minus"] = False

# ── 상수 ──────────────────────────────────────────────────────────────
DW, DH = 82, 58
SW, SH = 1000, 720
SCALE  = 0.70
GC = ["#E3F2FD","#E8F5E9","#FFF3E0","#FCE4EC","#F3E5F5"]
GA = ["#1976D2","#2E7D32","#E65100","#AD1457","#6A1B9A"]

# ── 프리셋 ────────────────────────────────────────────────────────────
def _hifs():
    sy=int(SH*2/3)-20; gap=60; gw=DW*2+14; ox=(SW-(gw*3+gap*2))//2; pts=[]
    for gi,(gid,rows) in enumerate([(1,3),(2,4),(3,3)]):
        bx=ox+gi*(gw+gap); by=sy-(rows*(DH+8)-8)+DH
        for r in range(rows):
            for c in range(2): pts.append((round(bx+c*(DW+14)),round(by+r*(DH+8)),gid))
    return pts
def _grid(rows,cols):
    MX,MY=50,15; uw=SW-MX*2; uh=SH-80-MY*2
    gx=(uw-DW*cols)/(cols-1) if cols>1 else 0; gy=(uh-DH*rows)/(rows-1) if rows>1 else 0
    return [(round(MX+c*(DW+gx)),round(80+MY+r*(DH+gy)),0) for r in range(rows) for c in range(cols)]
def _g5():
    MX,MY=50,15; gw=DW*2+10; gh=DH*2+10; uw=SW-MX*2; uh=SH-80-MY*2
    gapx=(uw-gw*3)/2; gapy=uh-gh; pts=[]
    for gi,(gc,gr) in enumerate([(0,0),(1,0),(2,0),(0,1),(1,1)]):
        bx=MX+(uw-gw*2-gapx)/2+gc*(gw+gapx) if gr==1 else MX+gc*(gw+gapx); by=80+MY+gr*(gh+gapy)
        for di in range(4): pts.append((round(bx+(di%2)*(DW+10)),round(by+(di//2)*(DH+10)),gi+1))
    return pts
def _u():
    MX,MY=50,15; uh=SH-80-MY*2; iw=SW-MX*2-DW*2-20; pts=[]
    for r in range(5):
        y=round(80+MY+r*(uh-DH)/4); pts+=[(MX,y,0),(SW-MX-DW,y,0)]
    for c in range(5):
        x=round(MX+DW+10+c*(iw-DW)/4); pts+=[(x,80+MY,0),(x,80+MY+uh-DH,0)]
    return pts
PRESETS={"HIFS 기본 배치 (20명)":_hifs(),"균등 4×5 (20명)":_grid(5,4),
         "균등 5×4 (20명)":_grid(4,5),"모둠형 5모둠 (20명)":_g5(),"ㄷ자형 (20명)":_u()}

# ── 배정 로직 ─────────────────────────────────────────────────────────
def make_assignment(students, desk_pts, seed):
    if not students: return [None]*len(desk_pts)
    rng=random.Random(seed); by_y=sorted(range(len(desk_pts)),key=lambda i:desk_pts[i][1])
    short=[s for s in students if s["height"]=="작음"]; other=[s for s in students if s["height"]!="작음"]
    rng.shuffle(short); rng.shuffle(other); asgn=[None]*len(desk_pts)
    fn=max(1,len(by_y)//4); si=iter(short)
    for di in by_y[:fn]:
        s=next(si,None)
        if s: asgn[di]=s["sid"]
    rem=list(si)+other; rng.shuffle(rem); ri=iter(rem)
    for di in by_y[fn:]:
        s=next(ri,None)
        if s: asgn[di]=s["sid"]
    return asgn

def conflict_sids(assignment, desk_pts, conflicts):
    idx={sid:i for i,sid in enumerate(assignment) if sid}; cf=set()
    for a,b in conflicts:
        ia,ib=idx.get(a),idx.get(b)
        if ia is None or ib is None: continue
        x1,y1,_=desk_pts[ia]; x2,y2,_=desk_pts[ib]
        if math.hypot(x1-x2,y1-y2)<DW*2.5: cf.add(a);cf.add(b)
    return cf

# ── 캔버스 렌더 ───────────────────────────────────────────────────────
def make_desk_div(i, x, y, gid, sid, sm, cf_sids):
    s = sm.get(sid) if sid else None
    is_conflict = s and s["sid"] in cf_sids
    ci = gid - 1 if gid > 0 else -1
    bg = GC[ci] if ci >= 0 else "#e8e8e8"
    if is_conflict:
        border = "2.5px solid #D32F2F"
        bg = "#FFEBEE"
    elif ci >= 0:
        border = f"1.5px solid {GA[ci]}"
    else:
        border = "1.5px solid #999"

    inner = []
    if s:
        inner = [
            html.Div(str(s.get("student_number","")),
                     style={"fontSize":"9px","color":"#666","lineHeight":"1.1"}),
            html.Div(s["name"],
                     style={"fontSize":"11px","fontWeight":"bold","color":"#1a1a2e","lineHeight":"1.3"}),
            html.Div("👦" if s["gender"]=="남" else "👧",
                     style={"fontSize":"9px"}),
        ]
    else:
        inner = [html.Div(str(i+1), style={"color":"#bbb","fontSize":"10px"})]

    return html.Div(
        inner,
        id={"type":"desk","index":i},
        draggable="true",
        **{"data-desk-index": str(i), "data-has-student": "1" if s else "0"},
        style={
            "position":"absolute",
            "left":f"{round(x*SCALE)}px",
            "top":f"{round(y*SCALE)}px",
            "width":f"{round(DW*SCALE)}px",
            "height":f"{round(DH*SCALE)}px",
            "backgroundColor":bg,
            "border":border,
            "borderRadius":"6px",
            "cursor":"grab",
            "display":"flex","flexDirection":"column",
            "alignItems":"center","justifyContent":"center",
            "userSelect":"none","boxSizing":"border-box",
            "fontSize":"11px",
            "transition":"transform 0.1s, box-shadow 0.1s",
        }
    )

def make_canvas(students, desk_pts, assignment, conflicts):
    sm = {s["sid"]:s for s in students}
    cf_sids = conflict_sids(assignment, desk_pts, conflicts)
    desks = [make_desk_div(i,x,y,gid,
                           assignment[i] if i<len(assignment) else None,
                           sm, cf_sids)
             for i,(x,y,gid) in enumerate(desk_pts)]
    return html.Div(
        desks,
        id="seating-canvas",
        style={
            "position":"relative",
            "width":f"{round(SW*SCALE)}px",
            "height":f"{round(SH*SCALE)}px",
            "backgroundColor":"#F5F4F0",
            "borderRadius":"10px",
            "border":"1px solid #ddd",
            "overflow":"hidden",
            "userSelect":"none",
        }
    )

# ── PNG 렌더 ──────────────────────────────────────────────────────────
def render_png(students, desk_pts, assignment, conflicts):
    sm={s["sid"]:s for s in students}; cf=conflict_sids(assignment,desk_pts,conflicts)
    fig,ax=plt.subplots(figsize=(13,9)); ax.set_xlim(0,SW); ax.set_ylim(SH,0)
    ax.set_aspect("equal"); ax.axis("off"); ax.set_facecolor("#F5F4F0"); fig.patch.set_facecolor("#F5F4F0")
    for i,(x,y,gid) in enumerate(desk_pts):
        sid=assignment[i] if i<len(assignment) else None; s=sm.get(sid) if sid else None
        ci=gid-1 if gid>0 else -1; fc=GC[ci] if ci>=0 else "#F0F0F0"
        ec="#D32F2F" if (s and s["sid"] in cf) else (GA[ci] if ci>=0 else "#888")
        ax.add_patch(FancyBboxPatch((x,y),DW,DH,fc=fc,ec=ec,lw=1.5,boxstyle="round,pad=3"))
        if s:
            ax.text(x+DW/2,y+10,s.get("student_number",""),ha="center",va="center",fontsize=7,color="#666")
            ax.text(x+DW/2,y+DH/2,s["name"],ha="center",va="center",fontsize=10,fontweight="bold")
    buf=io.BytesIO(); fig.savefig(buf,format="png",dpi=150,bbox_inches="tight",facecolor="#F5F4F0")
    buf.seek(0); plt.close(fig)
    return "data:image/png;base64,"+base64.b64encode(buf.read()).decode()

# ── 레이아웃 ──────────────────────────────────────────────────────────
layout = dbc.Container([
    dcc.Store(id="st-email",     storage_type="local"),
    dcc.Store(id="st-students",  data=[]),
    dcc.Store(id="st-assignment",data=[]),
    dcc.Store(id="st-conflicts", data=[]),
    dcc.Store(id="st-seed",      data=42),
    dcc.Store(id="st-preset",    data="HIFS 기본 배치 (20명)"),
    dcc.Store(id="dnd-store",    data=None),
    dcc.Interval(id="dnd-poll",  interval=150, n_intervals=0),
    dcc.Interval(id="dnd-setup", interval=200, n_intervals=0, max_intervals=-1),
    dcc.Download(id="dl-png"),

    html.H4("🪑 Seating Chart", className="mt-3 mb-1"),
    html.Hr(),

    dbc.Row([
        # ── 사이드바 ────────────────────────────────────────────────
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("👤 선생님 로그인"),
                dbc.CardBody([
                    dbc.Input(id="inp-email",placeholder="이메일",type="email",size="sm"),
                    dbc.Button("불러오기",id="btn-load",color="primary",size="sm",className="mt-2 w-100"),
                    html.Div(id="load-status",className="mt-1 small"),
                ])
            ], className="mb-2"),

            dbc.Card([
                dbc.CardHeader("👥 학생 명단"),
                dbc.CardBody([
                    dcc.Upload(id="upload-excel",
                        children=dbc.Button("📂 Excel 업로드",size="sm",color="secondary",className="w-100"),
                        accept=".xlsx,.xls"),
                    html.Hr(className="my-2"),
                    dbc.Input(id="inp-snum",placeholder="학번",size="sm",className="mb-1"),
                    dbc.Input(id="inp-sname",placeholder="이름",size="sm",className="mb-1"),
                    dbc.Row([
                        dbc.Col(dbc.Select(id="inp-gender",options=[{"label":"남","value":"남"},{"label":"여","value":"여"}],value="남",size="sm")),
                        dbc.Col(dbc.Select(id="inp-height",options=[{"label":"보통","value":"보통"},{"label":"작음","value":"작음"},{"label":"큰 편","value":"큰 편"}],value="보통",size="sm")),
                    ], className="mb-1"),
                    dbc.Input(id="inp-special",placeholder="특이사항(선택)",size="sm",className="mb-1"),
                    dbc.Button("추가",id="btn-add-student",color="success",size="sm",className="w-100"),
                    html.Div(id="student-list",className="mt-2 small"),
                ])
            ], className="mb-2"),

            dbc.Card([
                dbc.CardHeader("🚫 주의 조합"),
                dbc.CardBody([
                    dbc.Select(id="cf-a",options=[],size="sm",className="mb-1"),
                    dbc.Select(id="cf-b",options=[],size="sm",className="mb-1"),
                    dbc.Button("추가",id="btn-add-cf",color="warning",size="sm",className="w-100"),
                    html.Div(id="conflict-list",className="mt-2 small"),
                ])
            ], className="mb-2"),

            dbc.Card([
                dbc.CardHeader("🏫 레이아웃"),
                dbc.CardBody([
                    dbc.Select(id="sel-preset",
                        options=[{"label":k,"value":k} for k in PRESETS],
                        value="HIFS 기본 배치 (20명)", size="sm"),
                ])
            ]),
        ], width=3),

        # ── 메인 캔버스 ─────────────────────────────────────────────
        dbc.Col([
            dbc.Row([
                dbc.Col(dbc.Button("🔀 재배치",id="btn-reseat",color="primary",size="sm"),width="auto"),
                dbc.Col(dbc.Button("💾 저장",id="btn-save",color="success",size="sm"),width="auto"),
                dbc.Col(dbc.Button("📥 PNG",id="btn-png",color="secondary",size="sm"),width="auto"),
                dbc.Col(html.Small("↔ 드래그로 자리 교체",className="text-muted mt-1"),width="auto"),
            ], className="mb-2 g-2"),
            html.Div(id="save-status",className="mb-1 small"),
            html.Div(id="canvas-container"),
            html.Div(id="conflict-warnings",className="mt-2"),
        ], width=9),
    ]),

], fluid=True)


# ── 클라이언트사이드: DnD 리스너 셋업 ──────────────────────────────────
clientside_callback(
    """
    function(n, children) {
        var _from = null;
        function attach() {
            document.querySelectorAll('[data-desk-index]').forEach(function(el) {
                if (el._dndAttached) return;
                el._dndAttached = true;
                el.ondragstart = function(e) {
                    _from = parseInt(this.getAttribute('data-desk-index'));
                    this.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                };
                el.ondragend = function(e) { this.style.opacity = ''; this.style.boxShadow = ''; this.style.transform = ''; };
                el.ondragover = function(e) { e.preventDefault(); this.style.boxShadow = '0 0 0 3px #1976D2'; };
                el.ondragleave = function(e) { this.style.boxShadow = ''; };
                el.ondrop = function(e) {
                    e.preventDefault();
                    this.style.boxShadow = '';
                    var to = parseInt(this.getAttribute('data-desk-index'));
                    if (_from !== null && _from !== to) {
                        window._dndPending = {from: _from, to: to};
                    }
                    _from = null;
                };
            });
        }
        attach();
        return window.dash_clientside.no_update;
    }
    """,
    Output("dnd-store","data", allow_duplicate=True),
    Input("dnd-setup","n_intervals"),
    State("canvas-container","children"),
    prevent_initial_call=True,
)

# ── 클라이언트사이드: DnD 폴링 ───────────────────────────────────────
clientside_callback(
    """
    function(n) {
        if (window._dndPending) {
            var r = window._dndPending;
            window._dndPending = null;
            return r;
        }
        return window.dash_clientside.no_update;
    }
    """,
    Output("dnd-store","data"),
    Input("dnd-poll","n_intervals"),
)

# ── 콜백: DnD → 배정 교체 ────────────────────────────────────────────
@callback(
    Output("st-assignment","data"),
    Input("dnd-store","data"),
    State("st-assignment","data"),
    prevent_initial_call=True,
)
def apply_dnd(evt, assignment):
    if not evt or assignment is None: return no_update
    asgn = list(assignment)
    f, t = evt.get("from"), evt.get("to")
    if f is None or t is None: return no_update
    if f < len(asgn) and t < len(asgn):
        asgn[f], asgn[t] = asgn[t], asgn[f]
    return asgn

# ── 콜백: 학생 추가 / Excel ──────────────────────────────────────────
@callback(
    Output("st-students","data"),
    Output("st-assignment","data",allow_duplicate=True),
    Input("btn-add-student","n_clicks"),
    Input("upload-excel","contents"),
    State("inp-snum","value"), State("inp-sname","value"),
    State("inp-gender","value"), State("inp-height","value"), State("inp-special","value"),
    State("st-students","data"), State("st-preset","data"), State("st-seed","data"),
    prevent_initial_call=True,
)
def add_student(n, excel_content, snum, sname, gender, height, special, students, preset, seed):
    students = list(students or [])
    trigger = ctx.triggered_id
    if trigger == "btn-add-student" and sname:
        sid = snum or f"s{len(students)+1}"
        if not any(s["sid"]==sid for s in students):
            students.append({"sid":sid,"name":sname,"student_number":snum or "","gender":gender,"height":height,"special":special or ""})
    elif trigger == "upload-excel" and excel_content:
        import pandas as pd, base64 as b64
        content_type, content_string = excel_content.split(",")
        df = pd.read_excel(io.BytesIO(b64.b64decode(content_string)))
        df.columns = [c.strip() for c in df.columns]
        for _, row in df.iterrows():
            sid = str(row.get("학번", row.get("student_number","")))
            name = str(row.get("이름", row.get("name","")))
            if not name or name == "nan": continue
            if any(s["sid"]==sid for s in students): continue
            students.append({"sid":sid,"name":name,"student_number":sid,
                "gender":str(row.get("성별","남")),"height":str(row.get("키","보통")),"special":str(row.get("특이사항",""))})
    asgn = make_assignment(students, PRESETS[preset], seed)
    return students, asgn

# ── 콜백: 재배치 ─────────────────────────────────────────────────────
@callback(
    Output("st-seed","data"), Output("st-assignment","data",allow_duplicate=True),
    Input("btn-reseat","n_clicks"),
    State("st-students","data"), State("st-preset","data"),
    prevent_initial_call=True,
)
def reseat(n, students, preset):
    seed = random.randint(0, 99999)
    return seed, make_assignment(students or [], PRESETS[preset], seed)

# ── 콜백: 프리셋 변경 ────────────────────────────────────────────────
@callback(
    Output("st-preset","data"), Output("st-assignment","data",allow_duplicate=True),
    Input("sel-preset","value"),
    State("st-students","data"), State("st-seed","data"),
    prevent_initial_call=True,
)
def change_preset(preset, students, seed):
    return preset, make_assignment(students or [], PRESETS[preset], seed)

# ── 콜백: 주의 조합 추가 ─────────────────────────────────────────────
@callback(
    Output("st-conflicts","data"),
    Input("btn-add-cf","n_clicks"),
    State("cf-a","value"), State("cf-b","value"), State("st-conflicts","data"),
    prevent_initial_call=True,
)
def add_conflict(n, a, b, conflicts):
    if not a or not b or a==b: return no_update
    conflicts = list(conflicts or [])
    if [a,b] not in conflicts and [b,a] not in conflicts:
        conflicts.append([a,b])
    return conflicts

# ── 콜백: 캔버스 + 사이드 렌더링 ────────────────────────────────────
@callback(
    Output("canvas-container","children"),
    Output("student-list","children"),
    Output("conflict-list","children"),
    Output("conflict-warnings","children"),
    Output("cf-a","options"), Output("cf-b","options"),
    Input("st-students","data"), Input("st-assignment","data"),
    Input("st-conflicts","data"), Input("st-preset","data"),
)
def update_view(students, assignment, conflicts, preset):
    students = students or []; assignment = assignment or []; conflicts = conflicts or []
    desk_pts = PRESETS[preset]
    canvas = make_canvas(students, desk_pts, assignment, conflicts)
    sm = {s["sid"]:s["name"] for s in students}
    s_items = [html.Div(f"• {s['student_number']} {s['name']} ({s['gender']}, {s['height']})") for s in students] or [html.Div("학생 없음",className="text-muted")]
    cf_items = [html.Div(f"🚫 {sm.get(a,'?')} ↔ {sm.get(b,'?')}") for a,b in conflicts]
    cf_sids = conflict_sids(assignment, desk_pts, conflicts)
    warnings = []
    warned = set()
    for a,b in conflicts:
        if a in cf_sids and b in cf_sids:
            key = tuple(sorted([a,b]))
            if key not in warned:
                warned.add(key)
                warnings.append(dbc.Alert(f"⚠️ 충돌: {sm.get(a,'?')} ↔ {sm.get(b,'?')} 인접",color="warning",className="py-1 small"))
    opts = [{"label":f"{s['student_number']} {s['name']}","value":s["sid"]} for s in students]
    return canvas, s_items, cf_items, warnings, opts, opts

# ── 콜백: Supabase 불러오기 ──────────────────────────────────────────
@callback(
    Output("st-email","data"), Output("load-status","children"),
    Output("st-students","data",allow_duplicate=True),
    Output("st-assignment","data",allow_duplicate=True),
    Output("st-conflicts","data",allow_duplicate=True),
    Output("st-preset","data",allow_duplicate=True),
    Output("st-seed","data",allow_duplicate=True),
    Input("btn-load","n_clicks"),
    State("inp-email","value"), State("st-preset","data"), State("st-seed","data"),
    prevent_initial_call=True,
)
def load_data(n, email, preset, seed):
    if not email: return no_update,no_update,no_update,no_update,no_update,no_update,no_update
    from utils.db import load_classroom
    row = load_classroom(email)
    if not row:
        return email, dbc.Badge("새 계정",color="info"), [], [], [], preset, seed
    sts=row.get("students",[]) or []; asgn=row.get("assignment",[]) or []
    cfs=row.get("conflicts",[]) or []; prs=row.get("preset",preset); sd=row.get("seed",seed)
    if not asgn: asgn=make_assignment(sts,PRESETS.get(prs,_hifs()),sd)
    return email, dbc.Badge("불러옴 ✓",color="success"), sts, asgn, cfs, prs, sd

# ── 콜백: 저장 ───────────────────────────────────────────────────────
@callback(
    Output("save-status","children"),
    Input("btn-save","n_clicks"),
    State("st-email","data"), State("st-students","data"),
    State("st-assignment","data"), State("st-conflicts","data"),
    State("st-preset","data"), State("st-seed","data"),
    prevent_initial_call=True,
)
def save_data(n, email, students, assignment, conflicts, preset, seed):
    if not email: return dbc.Alert("이메일 입력 후 로그인해주세요",color="danger",className="py-1 small")
    from utils.db import save_classroom
    save_classroom(email,{"students":students,"assignment":assignment,"conflicts":conflicts,"preset":preset,"seed":seed})
    return dbc.Badge("저장됨 ✓",color="success")

# ── 콜백: PNG 다운로드 ───────────────────────────────────────────────
@callback(
    Output("dl-png","data"),
    Input("btn-png","n_clicks"),
    State("st-students","data"), State("st-assignment","data"),
    State("st-conflicts","data"), State("st-preset","data"), State("st-seed","data"),
    prevent_initial_call=True,
)
def download_png(n, students, assignment, conflicts, preset, seed):
    img_str = render_png(students or [], PRESETS[preset], assignment or [], conflicts or [])
    img_bytes = base64.b64decode(img_str.split(",")[1])
    return dcc.send_bytes(lambda b: b, content=img_bytes, filename=f"seating_{seed}.png")
