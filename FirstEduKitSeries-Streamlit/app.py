from dotenv import load_dotenv; load_dotenv()
import dash
import dash_bootstrap_components as dbc
from dash import html

app = dash.Dash(__name__, use_pages=True,
                external_stylesheets=[dbc.themes.DARKLY],
                suppress_callback_exceptions=True)
server = app.server

app.layout = html.Div([
    dbc.NavbarSimple(brand="🪑 FirstEduKit Series", brand_href="/",
        color="dark", dark=True,
        children=[
            dbc.NavItem(dbc.NavLink("🪑 Seating Chart", href="/seating")),
            dbc.NavItem(dbc.NavLink("📋 WLPE", href="/wlpe")),
        ]),
    dash.page_container,
])

if __name__ == "__main__":
    app.run(debug=True)