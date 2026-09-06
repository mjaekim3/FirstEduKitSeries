"""
FirstEduKitSeries
개발자: MJ@HIFS
"""
import streamlit as st

st.set_page_config(
    page_title="FirstEduKitSeries",
    page_icon="🎓",
    layout="wide",
)

st.title("🎓 FirstEduKitSeries")
st.caption("FirstEduKitSeries · 개발자 MJ@HIFS")
st.divider()

st.markdown("""
<style>
.module-grid { display: flex; gap: 20px; flex-wrap: wrap; }
.module-card {
    border: 2px solid rgba(128,128,128,0.3);
    border-radius: 14px;
    padding: 32px 24px;
    text-align: center;
    text-decoration: none;
    width: 160px;
    transition: border-color 0.2s, transform 0.15s;
    display: block;
}
.module-card:hover {
    border-color: #1976D2;
    transform: translateY(-2px);
    text-decoration: none;
}
.module-card.disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
}
.module-icon { font-size: 52px; line-height: 1; }
.module-title { font-size: 13px; font-weight: 700; margin-top: 10px; }
.module-badge { font-size: 11px; color: #9E9E9E; margin-top: 4px; }
</style>

<div class="module-grid">
  <a href="/Weekly_Lesson_Plan_Export" class="module-card">
    <div class="module-icon">📤</div>
    <div class="module-title">Weekly Lesson Plan Export</div>
  </a>
  <a href="/Seating_Chart" class="module-card">
    <div class="module-icon">🪑</div>
    <div class="module-title">Seating Chart</div>
  </a>
</div>
""", unsafe_allow_html=True)
