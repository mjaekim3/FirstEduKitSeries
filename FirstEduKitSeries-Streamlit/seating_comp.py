import os
import streamlit.components.v1 as components

_COMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seating_component")
seating_dnd = components.declare_component("seating_dnd", path=_COMP_DIR)
