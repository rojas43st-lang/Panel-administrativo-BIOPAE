
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

app = FastAPI()

# Configuración de las sesiones
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "clave-local-solo-desarrollo"),
    same_site="lax",
    https_only=os.getenv("COOKIE_HTTPS_ONLY", "true").lower() == "true",
)

# Archivos estáticos y plantillas
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def inicio(request: Request):
    # Si ya inició sesión, entrar directamente al panel
    if request.session.get("autenticado"):
        return RedirectResponse("/admin", status_code=303)

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


@app.post("/admin/login", response_class=HTMLResponse)
async def iniciar_sesion(
    request: Request,
    usuario: str = Form(...),
    contrasena: str = Form(...),
):
    admin_usuario = os.getenv("ADMIN_USER")
    admin_contrasena = os.getenv("ADMIN_PASSWORD")

    # Comprobar que las variables estén configuradas
    if not admin_usuario or not admin_contrasena:
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "autenticado": False,
                "error": "Falta configurar el usuario o la contraseña en Vercel.",
                "usuario": None,
                "admin_session": None,
            },
            status_code=500,
        )

    # Validar las credenciales
    if usuario != admin_usuario or contrasena != admin_contrasena:
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

    # Crear una nueva sesión
    request.session.clear()
    request.session["autenticado"] = True
    request.session["usuario"] = usuario

    return RedirectResponse("/admin", status_code=303)


@app.get("/admin", response_class=HTMLResponse)
async def panel_admin(request: Request):
    # Impedir el acceso sin iniciar sesión
    if not request.session.get("autenticado"):
        return RedirectResponse("/", status_code=303)

    usuario_actual = request.session.get("usuario", "Administrador")

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


@app.post("/admin/logout")
async def cerrar_sesion(request: Request):
    request.session.clear()
    return RedirectResponse("/", status_code=303)
