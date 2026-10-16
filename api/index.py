
import os
from pathlib import Path

import psycopg
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI()

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)

templates = Jinja2Templates(directory=BASE_DIR / "templates")


def obtener_conexion():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "Falta configurar DATABASE_URL en las variables de entorno."
        )

    return psycopg.connect(database_url)


@app.get("/api", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )


@app.get("/api/admin", response_class=HTMLResponse)
async def panel_admin(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )


@app.get("/api/db-test")
async def db_test():
    try:
        with obtener_conexion() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                resultado = cur.fetchone()

        return {
            "conexion": "ok",
            "resultado": resultado[0]
        }

    except Exception:
        return JSONResponse(
            status_code=500,
            content={
                "conexion": "error",
                "detalle": (
                    "No se pudo conectar con Neon. "
                    "Revisa DATABASE_URL y los registros de Vercel."
                )
            }
        )
