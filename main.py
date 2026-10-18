
import os
import logging
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

# =========================================================
# CONFIGURACIÓN GENERAL
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="Panel Administrativo BIOPAE")

# =========================================================
# SESIONES
# =========================================================

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv(
        "SESSION_SECRET",
        "clave-local-solo-desarrollo"
    ),
    same_site="lax",
    https_only=os.getenv(
        "COOKIE_HTTPS_ONLY",
        "true"
    ).lower() == "true",
)

# =========================================================
# ARCHIVOS ESTÁTICOS Y PLANTILLAS
# =========================================================

STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

if not STATIC_DIR.is_dir():
    raise RuntimeError(
        f"No se encontró la carpeta estática: {STATIC_DIR}"
    )

if not TEMPLATES_DIR.is_dir():
    raise RuntimeError(
        f"No se encontró la carpeta de plantillas: {TEMPLATES_DIR}"
    )

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static"
)

templates = Jinja2Templates(
    directory=str(TEMPLATES_DIR)
)

# =========================================================
# FUNCIONES AUXILIARES
# =========================================================

def usuario_autenticado(request: Request) -> bool:
    return bool(request.session.get("autenticado"))


def obtener_conexion():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL no está configurada."
        )

    return psycopg.connect(database_url)


def renderizar_pagina(
    request: Request,
    autenticado: bool = False,
    usuario: str | None = None,
    error: str | None = None,
    status_code: int = 200,
):
    admin_session = None

    if autenticado:
        admin_session = {
            "usuario": usuario or "Administrador",
            "rol": "coordinador",
        }

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "autenticado": autenticado,
            "usuario": usuario,
            "admin_session": admin_session,
            "error": error,
        },
        status_code=status_code,
    )

# =========================================================
# PÁGINA PRINCIPAL
# =========================================================

@app.get("/", response_class=HTMLResponse)
async def inicio(request: Request):

    if usuario_autenticado(request):
        return RedirectResponse(
            url="/admin",
            status_code=303
        )

    return renderizar_pagina(request)


# =========================================================
# INICIAR SESIÓN
# =========================================================

@app.post("/admin/login", response_class=HTMLResponse)
async def iniciar_sesion(
    request: Request,
    usuario: str = Form(...),
    contrasena: str = Form(...),
):
    admin_usuario = os.getenv("ADMIN_USER")
    admin_contrasena = os.getenv("ADMIN_PASSWORD")

    if not admin_usuario or not admin_contrasena:
        return renderizar_pagina(
            request,
            error=(
                "Falta configurar ADMIN_USER o "
                "ADMIN_PASSWORD en las variables de entorno."
            ),
            status_code=500,
        )

    if (
        usuario != admin_usuario
        or contrasena != admin_contrasena
    ):
        return renderizar_pagina(
            request,
            error="Usuario o contraseña incorrectos.",
            status_code=401,
        )

    request.session.clear()
    request.session["autenticado"] = True
    request.session["usuario"] = usuario

    return RedirectResponse(
        url="/admin",
        status_code=303
    )


# =========================================================
# PANEL ADMINISTRATIVO
# =========================================================

@app.get("/admin", response_class=HTMLResponse)
async def panel_admin(request: Request):

    if not usuario_autenticado(request):
        return RedirectResponse(
            url="/",
            status_code=303
        )

    usuario_actual = request.session.get(
        "usuario",
        "Administrador"
    )

    return renderizar_pagina(
        request,
        autenticado=True,
        usuario=usuario_actual,
    )


# =========================================================
# ESTUDIANTES Y BENEFICIARIOS DESDE NEON
# =========================================================

@app.get("/api/admin/estudiantes")
async def listar_estudiantes(request: Request):

    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión."
        )

    try:
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    SELECT
                        e.id,
                        e.documento,
                        e.nombre,
                        e.apellido,
                        e.grupo,
                        e.activo,
                        COALESCE(
                            STRING_AGG(
                                DISTINCT b.tipo_beneficio,
                                ', '
                            ),
                            'No beneficiario'
                        ) AS beneficio
                    FROM estudiantes e
                    LEFT JOIN beneficiarios b
                        ON b.estudiante_id = e.id
                        AND b.activo = TRUE
                    GROUP BY
                        e.id,
                        e.documento,
                        e.nombre,
                        e.apellido,
                        e.grupo,
                        e.activo
                    ORDER BY e.apellido, e.nombre
                """)

                filas = cursor.fetchall()

                estudiantes = [
                    {
                        "id": fila[0],
                        "documento": fila[1],
                        "nombre": fila[2],
                        "apellido": fila[3],
                        "grupo": fila[4],
                        "activo": fila[5],
                        "grado": "",
                        "es_beneficiario": (
                            fila[6] != "No beneficiario"
                        ),
                        "beneficio": fila[6],
                    }
                    for fila in filas
                ]

        return {
            "ok": True,
            "total": len(estudiantes),
            "estudiantes": estudiantes,
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception(
            "Error consultando estudiantes y beneficiarios en Neon."
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "No fue posible consultar los estudiantes "
                "y sus beneficios. Revisa los logs del servidor."
            )
        )


# =========================================================
# CERRAR SESIÓN
# =========================================================

@app.post("/admin/logout")
async def cerrar_sesion(request: Request):

    request.session.clear()

    return RedirectResponse(
        url="/",
        status_code=303
    )
