
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
# HISTORIAL DE ENTREGAS DESDE NEON
# =========================================================

@app.get("/api/admin/entregas")
async def listar_entregas(request: Request):

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
                        en.id,
                        en.fecha,
                        en.hora,
                        e.documento,
                        e.nombre,
                        e.apellido,
                        a.nombre AS alimento,
                        en.tipo_entrega,
                        en.estado,
                        en.observacion
                    FROM entregas en
                    JOIN estudiantes e
                        ON e.id = en.estudiante_id
                    JOIN alimentos a
                        ON a.id = en.alimento_id
                    ORDER BY en.fecha DESC, en.hora DESC, en.id DESC
                """)

                filas = cursor.fetchall()

                entregas = [
                    {
                        "id": fila[0],
                        "fecha": (
                            fila[1].isoformat()
                            if fila[1] else None
                        ),
                        "hora": (
                            fila[2].isoformat()
                            if fila[2] else None
                        ),
                        "documento": fila[3],
                        "nombre": fila[4],
                        "apellido": fila[5],
                        "alimento": fila[6],
                        "tipo_entrega": fila[7],
                        "estado": fila[8],
                        "observacion": fila[9],
                    }
                    for fila in filas
                ]

        return {
            "ok": True,
            "total": len(entregas),
            "entregas": entregas,
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception(
            "Error consultando el historial de entregas en Neon."
        )
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar el historial de entregas."
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
# =========================================================
# ESTADÍSTICAS DEL PANEL GENERAL
# =========================================================


@app.get("/api/admin/estadisticas")
async def obtener_estadisticas(request: Request):

    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión."
        )

    try:
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM estudiantes
                    WHERE activo = TRUE
                """)
                estudiantes_activos = cursor.fetchone()[0] or 0

                cursor.execute("""
                    SELECT MAX(fecha)
                    FROM entregas
                    WHERE LOWER(estado) = 'entregado'
                """)
                fecha_entregas = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT
                        COUNT(*),
                        COUNT(*) FILTER (
                            WHERE LOWER(a.nombre) LIKE '%leche%'
                        ),
                        COUNT(*) FILTER (
                            WHERE LOWER(a.nombre) LIKE '%almuerzo%'
                        )
                    FROM entregas e
                    JOIN alimentos a ON a.id = e.alimento_id
                    WHERE e.fecha = %s
                      AND LOWER(e.estado) = 'entregado'
                """, (fecha_entregas,))

                fila = cursor.fetchone()
                entregas_hoy = fila[0] or 0
                vasos_leche = fila[1] or 0
                almuerzos = fila[2] or 0

                cursor.execute("""
                    SELECT
                        COALESCE(SUM(cantidad_disponible), 0),
                        COALESCE(SUM(cantidad_entregada), 0)
                    FROM cupos_diarios
                    WHERE fecha = CURRENT_DATE
                """)
                cupos = cursor.fetchone()

        return {
            "ok": True,
            "estudiantes_activos": estudiantes_activos,
            "entregas_hoy": entregas_hoy,
            "vasos_leche": vasos_leche,
            "almuerzos": almuerzos,
            "cupos_disponibles": cupos[0],
            "cupos_entregados": cupos[1],
            "fecha_entregas": (
                fecha_entregas.isoformat()
                if fecha_entregas else None
            )
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception(
            "Error consultando las estadísticas de BIOPAE."
        )
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar las estadísticas."
        )
