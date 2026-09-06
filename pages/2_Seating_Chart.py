"""
FirstEduKit — Seating Chart
"""
import io, os, math, random
import streamlit as st
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import font_manager

st.set_page_config(page_title="Seating Chart · FirstEduKit Series", page_icon="🪑", layout="wide")
st.title("🪑 Seating Chart")
st.caption("FirstEduKit Series · 개발자 MJ@HIFS")

# ── 한글 폰트 ─────────────────────────────────────────────────────────
def _set_korean_font():
    for fp in [
        "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/NanumGothic.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    ]:
        if os.path.exists(fp):
            font_manager.fontManager.addfont(fp)
            prop = font_manager.FontProperties(fname=fp)
            matplotlib.rcParams['font.family'] = prop.get_name()
            return
    matplotlib.rcParams['font.family'] = 'sans-serif'

_set_korean_font()
matplotlib.rcParams['axes.unicode_minus'] = False

# ── 사이드바 ──────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 👥 학생 명단")
    method = st.radio("입력 방식", ["직접 입력", "엑셀 업로드"], horizontal=True)

    students = []
    if method == "직접 입력":
        raw = st.text_area("이름 (줄바꿈 구분)", height=220,
                           placeholder="홍길동\n김철수\n이영희...")
        students = [n.strip() for n in raw.splitlines() if n.strip()]
    else:
        uploaded = st.file_uploader("엑셀 파일 (.xlsx/.xls)", type=["xlsx", "xls"])
        if uploaded:
            try:
                import pandas as pd
                df = pd.read_excel(uploaded, header=None)
                col_idx = st.selectbox(
                    "이름 열",
                    options=list(range(df.shape[1])),
                    format_func=lambda i: f"{i+1}열 (예: {df.iloc[0,i]})"
                )
                skip = st.checkbox("첫 행 건너뛰기 (헤더)", value=True)
                start = 1 if skip else 0
                students = [str(v).strip() for v in df.iloc[start:, col_idx]
                            if str(v).strip() and str(v) != 'nan']
            except Exception as e:
                st.error(f"파일 오류: {e}")

    if students:
        st.caption(f"총 {len(students)}명")

    st.divider()
    st.markdown("### 🏫 레이아웃")
    mode = st.radio("배치 모드", ["그리드 (행×열)", "모둠 (그룹 테이블)"])

    if mode == "그리드 (행×열)":
        rows = int(st.number_input("행 수", 1, 12, 5))
        cols = int(st.number_input("열 수", 1, 12, 6))
    else:
        num_groups    = int(st.number_input("모둠 수", 1, 16, 6))
        seats_per_grp = int(st.number_input("모둠당 자리", 2, 8, 4))

if not students:
    st.info("사이드바에서 학생 명단을 입력하세요.")
    st.stop()

# ── 재배치 버튼 ───────────────────────────────────────────────────────
if "seat_seed" not in st.session_state:
    st.session_state.seat_seed = random.randint(0, 99999)
if st.button("🔀 재배치"):
    st.session_state.seat_seed = random.randint(0, 99999)

rng = random.Random(st.session_state.seat_seed)
shuffled = students[:]
rng.shuffle(shuffled)

# ── 팔레트 ────────────────────────────────────────────────────────────
GRP_FC = ["#E3F2FD","#E8F5E9","#FFF3E0","#F3E5F5",
          "#E0F7FA","#FCE4EC","#F9FBE7","#EDE7F6"]
GRP_EC = ["#1976D2","#388E3C","#F57C00","#7B1FA2",
          "#0097A7","#C2185B","#9E9D24","#512DA8"]

# ── 그리드 렌더러 ─────────────────────────────────────────────────────
def draw_grid(names, rows, cols):
    fig, ax = plt.subplots(figsize=(max(8, cols*1.5), max(6, rows*1.4)+1))
    ax.set_xlim(0, cols); ax.set_ylim(0, rows+0.6)
    ax.axis('off'); ax.set_aspect('equal')
    # 칠판
    ax.add_patch(mpatches.FancyBboxPatch(
        (cols*0.2, rows+0.05), cols*0.6, 0.38,
        boxstyle="round,pad=0.04", fc="#2E7D32", ec="white", lw=2))
    ax.text(cols/2, rows+0.24, "📋  칠판", ha='center', va='center',
            color='white', fontsize=10, fontweight='bold')
    idx = 0
    for r in range(rows-1, -1, -1):
        for c in range(cols):
            name = names[idx] if idx < len(names) else ""
            fc = "#E3F2FD" if name else "#F5F5F5"
            ec = "#1976D2" if name else "#BDBDBD"
            ax.add_patch(mpatches.FancyBboxPatch(
                (c+0.07, r+0.07), 0.83, 0.83,
                boxstyle="round,pad=0.05", fc=fc, ec=ec, lw=1.5))
            if name:
                ax.text(c+0.18, r+0.83, str(idx+1),
                        ha='center', va='center', fontsize=6.5, color='#9E9E9E')
                ax.text(c+0.5, r+0.45, name,
                        ha='center', va='center', fontsize=9, fontweight='bold', color='#1A237E')
            idx += 1
    fig.patch.set_facecolor('#FAFAFA')
    plt.tight_layout(pad=0.4)
    return fig

# ── 모둠 렌더러 ───────────────────────────────────────────────────────
def draw_groups(names, num_groups, seats_per_grp):
    groups = [[] for _ in range(num_groups)]
    for i, s in enumerate(names):
        groups[i % num_groups].append(s)

    max_col = 4
    gcols = min(num_groups, max_col)
    grows = math.ceil(num_groups / max_col)
    fig, axes = plt.subplots(grows, gcols,
                             figsize=(gcols*3.5, grows*3.5), squeeze=False)
    fig.patch.set_facecolor('#FAFAFA')

    gi = 0
    for gr in range(grows):
        for gc in range(gcols):
            ax = axes[gr][gc]; ax.axis('off')
            if gi >= num_groups:
                gi += 1; continue
            grp = groups[gi]
            spg = max(len(grp), seats_per_grp)
            scols = 2; srows = math.ceil(spg / scols)
            ax.set_xlim(-0.1, scols+0.1); ax.set_ylim(-0.3, srows+0.55)
            ax.set_aspect('equal')
            fc = GRP_FC[gi % len(GRP_FC)]; ec = GRP_EC[gi % len(GRP_EC)]
            ax.text(scols/2, srows+0.28, f"모둠 {gi+1}",
                    ha='center', va='center', fontsize=11, fontweight='bold', color=ec)
            for si in range(spg):
                sr = si // scols; sc = si % scols
                name = grp[si] if si < len(grp) else ""
                ax.add_patch(mpatches.FancyBboxPatch(
                    (sc+0.06, srows-sr-1+0.06), 0.85, 0.82,
                    boxstyle="round,pad=0.05",
                    fc=fc if name else "#F5F5F5",
                    ec=ec if name else "#BDBDBD", lw=1.5))
                if name:
                    ax.text(sc+0.5, srows-sr-0.54, name,
                            ha='center', va='center', fontsize=9, fontweight='bold')
            gi += 1
    plt.tight_layout(pad=1.0)
    return fig

# ── 렌더링 & 출력 ─────────────────────────────────────────────────────
with st.spinner("생성 중..."):
    fig = draw_grid(shuffled, rows, cols) if mode.startswith("그리드") \
          else draw_groups(shuffled, num_groups, seats_per_grp)

st.pyplot(fig)

buf = io.BytesIO()
fig.savefig(buf, format="png", dpi=200, bbox_inches='tight',
            facecolor=fig.get_facecolor())
buf.seek(0)
plt.close(fig)

st.download_button("📥 PNG 저장", data=buf,
                   file_name=f"seating_{st.session_state.seat_seed}.png",
                   mime="image/png")
