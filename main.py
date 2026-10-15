
import os

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

app = FastAPI(title="Panel Administrativo BIOPAE")


# =========================================================
# CONFIGURACIÓN DE SESIONES
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

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

templates = Jinja2Templates(directory="templates")


# =========================================================
# FUNCIONES AUXILIARES
# =========================================================

def usuario_autenticado(request: Request) -> bool:
    """Comprueba si existe una sesión autenticada."""
    return bool(request.session.get("autenticado"))


def obtener_conexion():
    """Crea una conexión con la base de datos de Neon."""
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "La variable DATABASE_URL no está configurada."
        )

    return psycopg.connect(database_url)


# =========================================================
# PÁGINA DE INICIO
# =========================================================

@app.get("/", response_class=HTMLResponse)
async def inicio(request: Request):

    if usuario_autenticado(request):
        return RedirectResponse(
            url="/admin",
            status_code=303
        )

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "autenticado": False,
            "error": None,
            "usuario": None,
            "admin_session": None,
        },
    )


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
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "autenticado": False,
                "error": (
                    "Falta configurar el usuario o la "
                    "contraseña en las variables de entorno."
                ),
                "usuario": None,
                "admin_session": None,
            },
            status_code=500,
        )

    if (
        usuario != admin_usuario
        or contrasena != admin_contrasena
    ):
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "autenticado": False,
                "error": "Usuario o contraseña incorrectos.",
                "usuario": None,
                "admin_session": None,
            },
            status_code=401,
        )

    # Crear una sesión nueva después de validar las credenciales.
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

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "autenticado": True,
            "usuario": usuario_actual,
            "admin_session": {
                "usuario": usuario_actual,
                "rol": "coordinador",
            },
            "error": None,
        },
    )


# =========================================================
# CONSULTAR ESTUDIANTES DESDE NEON
# =========================================================

@app.get("/api/admin/estudiantes")
async def listar_estudiantes(request: Request):

    # Verificar que el usuario haya iniciado sesión.
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
                        id,
                        documento,
                        nombre,
                        apellido,
                        grado,
                        grupo,
                        es_beneficiario,
                        activo
                    FROM estudiantes
                    ORDER BY apellido, nombre
                """)

                filas = cursor.fetchall()

                estudiantes = [
                    {
                        "id": fila[0],
                        "documento": fila[1],
                        "nombre": fila[2],
                        "apellido": fila[3],
                        "grado": fila[4],
                        "grupo": fila[5],
                        "es_beneficiario": fila[6],
                        "activo": fila[7],
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
        # Evitar exponer credenciales o detalles internos.
        raise HTTPException(
            status_code=500,
            detail=(
                "No fue posible consultar los estudiantes. "
                "Verifica la conexión con Neon y las columnas "
                "de la tabla estudiantes."
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
