"""
FirstEduKit — Seating Chart (Streamlit)
"""
import io, os, math, random
import streamlit as st
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle
from matplotlib import font_manager

st.set_page_config(page_title="Seating Chart · FirstEduKit Series", page_icon="🪑", layout="wide")
st.title("🪑 Seating Chart")
st.caption("FirstEduKit Series · 개발자 MJ@HIFS")

def _set_korean_font():
    for fp in ["C:/Windows/Fonts/malgun.ttf","C:/Windows/Fonts/NanumGothic.ttf",
               "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"]:
        if os.path.exists(fp):
            font_manager.fontManager.addfont(fp)
            prop = font_manager.FontProperties(fname=fp)
            matplotlib.rcParams['font.family'] = prop.get_name()
            return
_set_korean_font()
matplotlib.rcParams['axes.unicode_minus'] = False

DESK_W, DESK_H = 82, 58
SCENE_W, SCENE_H = 1000, 720
GRP_COLORS = ["#E3F2FD","#E8F5E9","#FFF3E0","#FCE4EC","#F3E5F5"]
GRP_ACCENT = ["#1976D2","#2E7D32","#E65100","#AD1457","#6A1B9A"]

def _hifs():
    start_y=int(SCENE_H*2/3)-20; gap=60
    gw=DESK_W*2+14; ox=(SCENE_W-(gw*3+gap*2))//2; pts=[]
    for gi,(gid,rows) in enumerate([(1,3),(2,4),(3,3)]):
        bx=ox+gi*(gw+gap); by=start_y-(rows*(DESK_H+8)-8)+DESK_H
        for r in range(rows):
            for c in range(2): pts.append((round(bx+c*(DESK_W+14)),round(by+r*(DESK_H+8)),gid))
    return pts

def _grid(rows,cols):
    MX,MY=50,15; uw=SCENE_W-MX*2; uh=SCENE_H-80-MY*2
    gx=(uw-DESK_W*cols)/(cols-1) if cols>1 else 0
    gy=(uh-DESK_H*rows)/(rows-1) if rows>1 else 0
    return [(round(MX+c*(DESK_W+gx)),round(80+MY+r*(DESK_H+gy)),0) for r in range(rows) for c in range(cols)]

def _group5():
    MX,MY=50,15; gw=DESK_W*2+10; gh=DESK_H*2+10
    uw=SCENE_W-MX*2; uh=SCENE_H-80-MY*2
    gapx=(uw-gw*3)/2; gapy=uh-gh; pts=[]
    for gi,(gc,gr) in enumerate([(0,0),(1,0),(2,0),(0,1),(1,1)]):
        bx=MX+(uw-gw*2-gapx)/2+gc*(gw+gapx) if gr==1 else MX+gc*(gw+gapx)
        by=80+MY+gr*(gh+gapy)
        for di in range(4): pts.append((round(bx+(di%2)*(DESK_W+10)),round(by+(di//2)*(DESK_H+10)),gi+1))
    return pts

def _u_shape():
    MX,MY=50,15; uh=SCENE_H-80-MY*2; iw=SCENE_W-MX*2-DESK_W*2-20; pts=[]
    for r in range(5):
        y=round(80+MY+r*(uh-DESK_H)/4)
        pts+=[(MX,y,0),(SCENE_W-MX-DESK_W,y,0)]
    for c in range(5):
        x=round(MX+DESK_W+10+c*(iw-DESK_W)/4)
        pts+=[(x,80+MY,0),(x,80+MY+uh-DESK_H,0)]
    return pts

PRESETS={
    "HIFS 기본 배치 (20명)":_hifs(),
    "균등 4×5 (20명)":_grid(5,4),
    "균등 5×4 (20명)":_grid(4,5),
    "모둠형 5모둠 (20명)":_group5(),
    "ㄷ자형 (20명)":_u_shape(),
}

for k,v in [("students",[]),("conflicts",[]),("seat_seed",42),
            ("preset","HIFS 기본 배치 (20명)"),("assignment",[])]:
    if k not in st.session_state: st.session_state[k]=v

def make_assignment(students, desk_pts, conflicts, seed):
    if not students: return [None]*len(desk_pts)
    rng=random.Random(seed)
    by_y=sorted(range(len(desk_pts)),key=lambda i:desk_pts[i][1])
    short=[s for s in students if s["height"]=="작음"]
    other=[s for s in students if s["height"]!="작음"]
    rng.shuffle(short); rng.shuffle(other)
    asgn=[None]*len(desk_pts)
    si=iter(short); front_n=max(1,len(by_y)//4)
    for di in by_y[:front_n]:
        s=next(si,None)
        if s: asgn[di]=s["sid"]
    remaining=list(si)+other; rng.shuffle(remaining); ri=iter(remaining)
    for di in by_y[front_n:]:
        s=next(ri,None)
        if s: asgn[di]=s["sid"]
    return asgn

def get_conflict_sids(assignment, desk_pts, conflicts):
    idx={sid:i for i,sid in enumerate(assignment) if sid}
    cf=set()
    for a,b in conflicts:
        ia,ib=idx.get(a),idx.get(b)
        if ia is None or ib is None: continue
        x1,y1,_=desk_pts[ia]; x2,y2,_=desk_pts[ib]
        if math.hypot(x1-x2,y1-y2)<DESK_W*2.5: cf.add(a);cf.add(b)
    return cf

def render(students, desk_pts, assignment, show_furn=True):
    sm={s["sid"]:s for s in students}
    cf=get_conflict_sids(assignment,desk_pts,st.session_state.conflicts)
    fig,ax=plt.subplots(figsize=(14,10))
    ax.set_xlim(0,SCENE_W); ax.set_ylim(SCENE_H,0)
    ax.set_aspect('equal'); ax.axis('off')
    ax.set_facecolor('#F5F4F0'); fig.patch.set_facecolor('#F5F4F0')
    if show_furn:
        by=8;bh=40;ww=180;sw=320;bx=round((SCENE_W-(ww+sw+ww))/2)
        for rx,rw,lbl,clr in [(bx,ww,"화이트보드","#E0E0E0"),(bx+ww,sw,"스마트보드","#90CAF9"),(bx+ww+sw,ww,"화이트보드","#E0E0E0")]:
            ax.add_patch(FancyBboxPatch((rx,by),rw,bh,fc=clr,ec='#888',lw=1,boxstyle="round,pad=2"))
            ax.text(rx+rw/2,by+bh/2,lbl,ha='center',va='center',fontsize=9)
        ax.add_patch(FancyBboxPatch((bx-10,by+bh+18),120,60,fc='#A5D6A7',ec='#388E3C',lw=1,boxstyle="round,pad=2"))
        ax.text(bx+50,by+bh+48,"교사 책상",ha='center',va='center',fontsize=8)
        for i in range(4): ax.add_patch(FancyBboxPatch((6,80+i*158),18,128,fc='#B3E5FC',ec='#0288D1',lw=1,boxstyle="round,pad=2"))
        for i in range(3): ax.add_patch(FancyBboxPatch((SCENE_W-50,80+i*205),40,175,fc='#D7CCC8',ec='#795548',lw=1,boxstyle="round,pad=2"))
        ax.add_patch(FancyBboxPatch((SCENE_W/2-30,SCENE_H-26),60,18,fc='#FFCC80',ec='#E65100',lw=1.5,boxstyle="round,pad=2"))
        ax.text(SCENE_W/2,SCENE_H-17,"출입문",ha='center',va='center',fontsize=7)
    # 모둠 레이블
    grp_tops={}
    for (x,y,gid) in desk_pts:
        if gid>0: grp_tops[gid]=min(grp_tops.get(gid,y),y)
    for gid,top_y in grp_tops.items():
        ci=gid-1
        ax.text(0,top_y-4,f"모둠 {gid}",fontsize=8,color=GRP_ACCENT[ci],fontweight='bold',va='bottom')
    # 책상
    for xi,(x,y,gid) in enumerate(desk_pts):
        sid=assignment[xi] if xi<len(assignment) else None
        s=sm.get(sid) if sid else None
        ci=gid-1 if gid>0 else -1
        fc=GRP_COLORS[ci] if ci>=0 else '#F0F0F0'
        is_cf=s and s["sid"] in cf
        ec='#D32F2F' if is_cf else (GRP_ACCENT[ci] if ci>=0 else '#888')
        lw=2.5 if is_cf else 1.5
        ax.add_patch(FancyBboxPatch((x,y),DESK_W,DESK_H,fc=fc,ec=ec,lw=lw,boxstyle="round,pad=3"))
        if s:
            ax.text(x+DESK_W/2,y+11,s.get("student_number",""),ha='center',va='center',fontsize=7,color='#666')
            ax.text(x+DESK_W/2,y+DESK_H/2,s["name"],ha='center',va='center',fontsize=10,fontweight='bold')
            badge=("👦" if s["gender"]=="남" else "👧")+("🔵" if s["height"]=="작음" else "")
            ax.text(x+DESK_W/2,y+DESK_H-10,badge,ha='center',va='center',fontsize=8)
            if s.get("special"): ax.add_patch(Circle((x+DESK_W-6,y+6),4,fc='#FF5722',ec='none'))
        else:
            ax.text(x+DESK_W/2,y+DESK_H/2,str(xi+1),ha='center',va='center',fontsize=9,color='#bbb')
    return fig

# ── 사이드바 ──────────────────────────────────────────────────────────
with st.sidebar:
    with st.expander("👥 학생 명단",expanded=True):
        uf=st.file_uploader("Excel 업로드",type=["xlsx","xls"],key="uf")
        if uf:
            import pandas as pd
            df=pd.read_excel(uf); df.columns=[c.strip() for c in df.columns]; added=0
            for _,row in df.iterrows():
                sid=str(row.get("학번",row.get("student_number","")))
                name=str(row.get("이름",row.get("name","")))
                if not name or name=="nan": continue
                if any(s["sid"]==sid for s in st.session_state.students): continue
                st.session_state.students.append({"sid":sid,"name":name,"student_number":sid,
                    "gender":str(row.get("성별","남")),"height":str(row.get("키","보통")),
                    "special":str(row.get("특이사항",""))})
                added+=1
            if added: st.session_state.assignment=[]; st.success(f"{added}명 추가"); st.rerun()
        with st.form("add_student",clear_on_submit=True):
            c1,c2=st.columns(2)
            snum=c1.text_input("학번"); sname=c2.text_input("이름")
            c3,c4=st.columns(2)
            sg=c3.selectbox("성별",["남","여"]); sh=c4.selectbox("키",["보통","작음","큰 편"])
            sp=st.text_input("특이사항(선택)")
            if st.form_submit_button("추가") and sname:
                sid=snum or f"s{len(st.session_state.students)+1}"
                st.session_state.students.append({"sid":sid,"name":sname,"student_number":snum,
                    "gender":sg,"height":sh,"special":sp})
                st.session_state.assignment=[]; st.rerun()
        if st.session_state.students:
            st.caption(f"총 {len(st.session_state.students)}명")
            del_s=st.selectbox("삭제",["—"]+[f"{s['student_number']} {s['name']}" for s in st.session_state.students])
            if del_s!="—" and st.button("삭제"):
                nm=del_s.split(" ",1)[1]
                st.session_state.students=[s for s in st.session_state.students if s["name"]!=nm]
                st.session_state.assignment=[]; st.rerun()
    with st.expander("🚫 주의 조합"):
        if len(st.session_state.students)>=2:
            nm_list=[f"{s['student_number']} {s['name']}" for s in st.session_state.students]
            sid_by_nm={f"{s['student_number']} {s['name']}":s["sid"] for s in st.session_state.students}
            c1,c2=st.columns(2)
            sa=c1.selectbox("학생 A",nm_list,key="ca"); sb=c2.selectbox("학생 B",nm_list,key="cb")
            if st.button("추가",key="add_cf") and sa!=sb:
                pair=(sid_by_nm[sa],sid_by_nm[sb])
                if pair not in st.session_state.conflicts and (pair[1],pair[0]) not in st.session_state.conflicts:
                    st.session_state.conflicts.append(pair); st.rerun()
        sid_nm={s["sid"]:s["name"] for s in st.session_state.students}
        del_cf=None
        for i,(a,b) in enumerate(st.session_state.conflicts):
            c1,c2=st.columns([4,1])
            c1.caption(f"🚫 {sid_nm.get(a,'?')} ↔ {sid_nm.get(b,'?')}")
            if c2.button("✕",key=f"dc_{i}"): del_cf=i
        if del_cf is not None: st.session_state.conflicts.pop(del_cf); st.rerun()
    with st.expander("🏫 레이아웃"):
        preset=st.selectbox("배치 프리셋",list(PRESETS.keys()),
                            index=list(PRESETS.keys()).index(st.session_state.preset))
        if preset!=st.session_state.preset:
            st.session_state.preset=preset; st.session_state.assignment=[]; st.rerun()

# ── 메인 ──────────────────────────────────────────────────────────────
if not st.session_state.students:
    st.info("사이드바에서 학생을 추가하세요.")
    st.stop()

desk_pts=PRESETS[st.session_state.preset]
if not st.session_state.assignment or len(st.session_state.assignment)!=len(desk_pts):
    st.session_state.assignment=make_assignment(
        st.session_state.students,desk_pts,st.session_state.conflicts,st.session_state.seat_seed)

c1,c2,_=st.columns([1,1,5])
with c1:
    if st.button("🔀 재배치",use_container_width=True):
        st.session_state.seat_seed=random.randint(0,99999)
        st.session_state.assignment=make_assignment(
            st.session_state.students,desk_pts,st.session_state.conflicts,st.session_state.seat_seed)
        st.rerun()
with c2:
    show_furn=st.checkbox("가구 표시",value=True)

fig=render(st.session_state.students,desk_pts,st.session_state.assignment,show_furn)
st.pyplot(fig,use_container_width=True)

# 충돌 경고
cf_sids=get_conflict_sids(st.session_state.assignment,desk_pts,st.session_state.conflicts)
if cf_sids:
    sm_n={s["sid"]:s["name"] for s in st.session_state.students}
    warned=set()
    for a,b in st.session_state.conflicts:
        if a in cf_sids and b in cf_sids:
            key=tuple(sorted([a,b]))
            if key not in warned:
                warned.add(key)
                st.warning(f"⚠️ 충돌: **{sm_n.get(a,'?')}** ↔ **{sm_n.get(b,'?')}** 인접해 있어요")

# ── 자리 바꾸기 ───────────────────────────────────────────────────────
st.divider()
st.subheader("🔄 자리 바꾸기")
asgn=st.session_state.assignment
sm={s["sid"]:s for s in st.session_state.students}
desk_labels=[f"자리 {i+1}" + (f" ({sm[asgn[i]]['name']})" if asgn[i] and asgn[i] in sm else " (빈자리)") for i in range(len(desk_pts))]
c1,c2,c3=st.columns([2,2,1])
with c1: sw_a=st.selectbox("자리 A",range(len(desk_pts)),format_func=lambda i:desk_labels[i],key="sw_a")
with c2: sw_b=st.selectbox("자리 B",range(len(desk_pts)),format_func=lambda i:desk_labels[i],key="sw_b")
with c3:
    st.write("")
    if st.button("바꾸기",use_container_width=True) and sw_a!=sw_b:
        asgn[sw_a],asgn[sw_b]=asgn[sw_b],asgn[sw_a]
        st.session_state.assignment=asgn; st.rerun()

# PNG 다운로드
st.divider()
buf=io.BytesIO()
fig.savefig(buf,format="png",dpi=180,bbox_inches='tight',facecolor='#F5F4F0')
buf.seek(0); plt.close(fig)
st.download_button("📥 PNG 저장",data=buf,
    file_name=f"seating_{st.session_state.seat_seed}.png",mime="image/png")
