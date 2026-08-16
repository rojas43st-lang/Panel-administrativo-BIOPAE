from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/admin", response_class=HTMLResponse)
async def panel_admin(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )