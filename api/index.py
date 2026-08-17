from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI()

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)

templates = Jinja2Templates(
    directory=BASE_DIR / "templates"
)


@app.get("/api")
async def prueba():
    return {"mensaje": "FastAPI funciona en Vercel"}


@app.get("/api/admin", response_class=HTMLResponse)
async def panel_admin(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )