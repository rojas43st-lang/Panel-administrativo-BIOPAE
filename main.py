
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
                            WHERE LOWER(a.nombre) LIKE '%%leche%%'
                        ),
                        COUNT(*) FILTER (
                            WHERE LOWER(a.nombre) LIKE '%%almuerzo%%'
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
                    WHERE fecha = (
                        SELECT MAX(fecha)
                        FROM cupos_diarios
                    )
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
            ),
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


# =========================================================
# CONTROL DIARIO
# =========================================================

@app.get("/api/admin/control-diario")
async def obtener_control_diario(request: Request):

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
                        c.id,
                        c.fecha,
                        a.nombre AS alimento,
                        c.cantidad_disponible,
                        c.cantidad_entregada
                    FROM cupos_diarios c
                    LEFT JOIN alimentos a
                        ON a.id = c.alimento_id
                    ORDER BY c.fecha DESC, c.id DESC
                """)

                filas = cursor.fetchall()

        return {
            "ok": True,
            "cupos": [
                {
                    "id": fila[0],
                    "fecha": (
                        fila[1].isoformat()
                        if fila[1] else None
                    ),
                    "alimento": fila[2] or "Sin alimento",
                    "cantidad_disponible": fila[3] or 0,
                    "cantidad_entregada": fila[4] or 0,
                }
                for fila in filas
            ],
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception(
            "Error consultando el control diario de BIOPAE."
        )

        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar el control diario."
        )


# =========================================================
# REGISTRAR UNA ENTREGA DESDE EL CONTROL DIARIO
# =========================================================

@app.post("/api/admin/control-diario/entregar")
async def registrar_entrega_diaria(
    request: Request,
    estudiante_id: int = Form(...),
    cupo_diario_id: int = Form(...),
    observacion: str = Form(""),
):
    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión.",
        )

    try:
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute(
                    """
                    SELECT id
                    FROM estudiantes
                    WHERE id = %s AND activo = TRUE
                    """,
                    (estudiante_id,),
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="El estudiante no existe o está inactivo.",
                    )

                cursor.execute(
                    """
                    SELECT
                        id,
                        alimento_id,
                        fecha,
                        cantidad_disponible
                    FROM cupos_diarios
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (cupo_diario_id,),
                )

                cupo = cursor.fetchone()

                if cupo is None:
                    raise HTTPException(
                        status_code=404,
                        detail="No se encontró el cupo seleccionado.",
                    )

                cupo_id, alimento_id, fecha, disponibles = cupo

                if disponibles is None or disponibles <= 0:
                    raise HTTPException(
                        status_code=409,
                        detail="No quedan cupos disponibles para este alimento.",
                    )

                cursor.execute(
                    """
                    INSERT INTO entregas (
                        estudiante_id,
                        alimento_id,
                        cupo_diario_id,
                        fecha,
                        hora,
                        tipo_entrega,
                        estado,
                        observacion
                    )
                    VALUES (
                        %s, %s, %s, %s, CURRENT_TIME,
                        'normal', 'entregado', %s
                    )
                    RETURNING id
                    """,
                    (
                        estudiante_id,
                        alimento_id,
                        cupo_id,
                        fecha,
                        observacion.strip() or None,
                    ),
                )

                entrega_id = cursor.fetchone()[0]

                cursor.execute(
                    """
                    UPDATE cupos_diarios
                    SET cantidad_disponible = cantidad_disponible - 1,
                        cantidad_entregada = cantidad_entregada + 1
                    WHERE id = %s
                    """,
                    (cupo_id,),
                )

        return {
            "ok": True,
            "mensaje": "Entrega registrada correctamente.",
            "entrega_id": entrega_id,
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception(
            "Error registrando una entrega desde el control diario."
        )

        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar la entrega. Revisa los logs del servidor.",
        )



# =========================================================
# CASOS EN REVISIÓN
# =========================================================

from datetime import date


def generar_casos_automaticos(cursor):
    """
    Crea un caso automático cuando un beneficiario acumula
    7 días de servicio disponible sin reclamar su beneficio.

    Los días se calculan usando las fechas registradas
    en cupos_diarios y las entregas normales realizadas.
    """

    cursor.execute("""
        WITH dias_servicio AS (
            SELECT
                b.estudiante_id,
                LOWER(TRIM(b.tipo_beneficio)) AS beneficio,
                b.fecha_registro,
                c.fecha,
                CASE
                    WHEN LOWER(TRIM(b.tipo_beneficio))
                         LIKE '%%leche%%'
                         AND LOWER(a.nombre) LIKE '%%leche%%'
                        THEN TRUE
                    WHEN LOWER(TRIM(b.tipo_beneficio))
                         LIKE '%%almuerzo%%'
                         AND LOWER(a.nombre) LIKE '%%almuerzo%%'
                        THEN TRUE
                    ELSE FALSE
                END AS alimento_corresponde
            FROM beneficiarios b
            JOIN cupos_diarios c
                ON c.fecha >= b.fecha_registro::date
            JOIN alimentos a
                ON a.id = c.alimento_id
            WHERE b.activo = TRUE
              AND (
                    (
                        LOWER(TRIM(b.tipo_beneficio))
                            LIKE '%%leche%%'
                        AND LOWER(a.nombre) LIKE '%%leche%%'
                    )
                    OR
                    (
                        LOWER(TRIM(b.tipo_beneficio))
                            LIKE '%%almuerzo%%'
                        AND LOWER(a.nombre) LIKE '%%almuerzo%%'
                    )
              )
              AND (
                    COALESCE(c.cantidad_disponible, 0)
                    + COALESCE(c.cantidad_entregada, 0)
                  ) > 0
        ),
        dias_sin_reclamar AS (
            SELECT
                ds.estudiante_id,
                ds.beneficio,
                COUNT(DISTINCT ds.fecha)::INTEGER AS total_dias
            FROM dias_servicio ds
            WHERE NOT EXISTS (
                SELECT 1
                FROM entregas en
                JOIN alimentos a
                    ON a.id = en.alimento_id
                WHERE en.estudiante_id = ds.estudiante_id
                  AND en.fecha = ds.fecha
                  AND LOWER(en.estado) = 'entregado'
                  AND LOWER(en.tipo_entrega) = 'normal'
                  AND (
                        (
                            ds.beneficio LIKE '%%leche%%'
                            AND LOWER(a.nombre) LIKE '%%leche%%'
                        )
                        OR
                        (
                            ds.beneficio LIKE '%%almuerzo%%'
                            AND LOWER(a.nombre) LIKE '%%almuerzo%%'
                        )
                  )
            )
            GROUP BY ds.estudiante_id, ds.beneficio
            HAVING COUNT(DISTINCT ds.fecha) >= 7
        )
        INSERT INTO casos_revision (
            estudiante_id,
            tipo_beneficio,
            origen,
            motivo,
            dias_sin_reclamar
        )
        SELECT
            d.estudiante_id,
            CASE
                WHEN d.beneficio LIKE '%%leche%%'
                    THEN 'vaso de leche'
                ELSE 'almuerzo'
            END,
            'automatico',
            'Beneficio sin reclamar durante 7 o más días con servicio disponible.',
            d.total_dias
        FROM dias_sin_reclamar d
        WHERE NOT EXISTS (
            SELECT 1
            FROM casos_revision cr
            WHERE cr.estudiante_id = d.estudiante_id
              AND LOWER(cr.tipo_beneficio) = d.beneficio
              AND cr.estado = 'pendiente'
        )
    """)


# Consultar casos
@app.get("/api/admin/casos-revision")
async def obtener_casos_revision(request: Request):

    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión."
        )

    try:
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                # Detectar casos automáticos nuevos.
                generar_casos_automaticos(cursor)

                cursor.execute("""
                    SELECT
                        cr.id,
                        cr.estudiante_id,
                        cr.tipo_beneficio,
                        cr.origen,
                        cr.motivo,
                        cr.dias_sin_reclamar,
                        cr.fecha_apertura,
                        cr.estado,
                        cr.decision,
                        cr.fecha_resolucion,
                        cr.resuelto_por,
                        cr.observacion_resolucion,
                        e.nombre,
                        e.apellido,
                        e.grupo
                    FROM casos_revision cr
                    JOIN estudiantes e
                        ON e.id = cr.estudiante_id
                    ORDER BY
                        CASE WHEN cr.estado = 'pendiente'
                             THEN 0 ELSE 1 END,
                        cr.fecha_apertura DESC,
                        cr.id DESC
                """)

                filas = cursor.fetchall()

        casos = []

        for fila in filas:
            casos.append({
                "id": fila[0],
                "estudiante_id": fila[1],
                "tipo_beneficio": fila[2],
                "origen": fila[3],
                "motivo": fila[4],
                "dias_sin_reclamar": fila[5],
                "fecha_apertura": (
                    fila[6].isoformat() if fila[6] else None
                ),
                "estado": fila[7],
                "decision": fila[8],
                "fecha_resolucion": (
                    fila[9].isoformat() if fila[9] else None
                ),
                "resuelto_por": fila[10],
                "observacion_resolucion": fila[11],
                "nombre": fila[12],
                "apellido": fila[13],
                "grupo": fila[14]
            })

        return {
            "ok": True,
            "total": len(casos),
            "casos": casos
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception("Error consultando casos en revisión.")

        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los casos en revisión."
        )


# Registrar un caso manual
@app.post("/api/admin/casos-revision")
async def registrar_caso_manual(request: Request):

    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión."
        )

    try:
        datos = await request.json()

        estudiante_id = int(datos.get("estudiante_id", 0))
        beneficio = str(
            datos.get("tipo_beneficio", "")
        ).strip().lower()
        motivo = str(datos.get("motivo", "")).strip()

        if estudiante_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Selecciona un estudiante válido."
            )

        if beneficio not in ("vaso de leche", "almuerzo"):
            raise HTTPException(
                status_code=400,
                detail="El beneficio debe ser vaso de leche o almuerzo."
            )

        if not motivo:
            raise HTTPException(
                status_code=400,
                detail="Escribe el motivo de la revisión."
            )

        if len(motivo) > 1000:
            raise HTTPException(
                status_code=400,
                detail="El motivo no puede superar 1000 caracteres."
            )

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    SELECT id
                    FROM estudiantes
                    WHERE id = %s
                """, (estudiante_id,))

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="No se encontró el estudiante."
                    )

                cursor.execute("""
                    INSERT INTO casos_revision (
                        estudiante_id,
                        tipo_beneficio,
                        origen,
                        motivo,
                        dias_sin_reclamar,
                        estado
                    )
                    VALUES (%s, %s, 'manual', %s, 0, 'pendiente')
                    RETURNING id
                """, (
                    estudiante_id,
                    beneficio,
                    motivo
                ))

                caso_id = cursor.fetchone()[0]

        return {
            "ok": True,
            "mensaje": "Caso manual registrado correctamente.",
            "caso_id": caso_id
        }

    except HTTPException:
        raise

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Los datos enviados no son válidos."
        )

    except Exception:
        logging.exception("Error registrando caso manual.")

        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar el caso manual."
        )


# Mantener el cupo o suspender el beneficio
@app.post("/api/admin/casos-revision/{caso_id}/resolver")
async def resolver_caso_revision(
    caso_id: int,
    request: Request
):

    if not usuario_autenticado(request):
        raise HTTPException(
            status_code=401,
            detail="Debes iniciar sesión."
        )

    try:
        datos = await request.json()

        decision = str(datos.get("decision", "")).strip()
        observacion = str(
            datos.get("observacion_resolucion", "")
        ).strip()

        if decision not in (
            "mantener_cupo",
            "suspender_beneficio"
        ):
            raise HTTPException(
                status_code=400,
                detail="La decisión seleccionada no es válida."
            )

        if len(observacion) > 1000:
            raise HTTPException(
                status_code=400,
                detail="La observación no puede superar 1000 caracteres."
            )

        usuario = request.session.get(
            "usuario",
            "Administrador"
        )

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:

                cursor.execute("""
                    SELECT
                        estudiante_id,
                        tipo_beneficio,
                        estado
                    FROM casos_revision
                    WHERE id = %s
                    FOR UPDATE
                """, (caso_id,))

                caso = cursor.fetchone()

                if caso is None:
                    raise HTTPException(
                        status_code=404,
                        detail="El caso no existe."
                    )

                estudiante_id, beneficio, estado = caso

                if estado != "pendiente":
                    raise HTTPException(
                        status_code=409,
                        detail="Este caso ya fue resuelto."
                    )

                if decision == "suspender_beneficio":
                    cursor.execute("""
                        UPDATE beneficiarios
                        SET activo = FALSE
                        WHERE estudiante_id = %s
                          AND LOWER(TRIM(tipo_beneficio))
                              = LOWER(TRIM(%s))
                          AND activo = TRUE
                    """, (
                        estudiante_id,
                        beneficio
                    ))

                    if cursor.rowcount == 0:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "No se encontró un beneficio activo "
                                "coincidente para suspender."
                            )
                        )

                cursor.execute("""
                    UPDATE casos_revision
                    SET estado = 'resuelto',
                        decision = %s,
                        fecha_resolucion = CURRENT_TIMESTAMP,
                        resuelto_por = %s,
                        observacion_resolucion = %s
                    WHERE id = %s
                """, (
                    decision,
                    usuario,
                    observacion or None,
                    caso_id
                ))

        mensaje = (
            "El cupo se mantiene. Caso resuelto."
            if decision == "mantener_cupo"
            else "El beneficio fue suspendido. Caso resuelto."
        )

        return {
            "ok": True,
            "mensaje": mensaje
        }

    except HTTPException:
        raise

    except Exception:
        logging.exception("Error resolviendo caso de revisión.")

        raise HTTPException(
            status_code=500,
            detail="No fue posible guardar la decisión del caso."
        )
