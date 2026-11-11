# BIOPAE integrado

Aplicación FastAPI única con una página de entrada, el panel administrativo y
las operaciones BIOPAE1 de consulta de disponibilidad y registro de entregas
mediante QR.

## Ejecución

Instala las dependencias de `requirements.txt` y ejecuta desde la raíz:

```powershell
uvicorn main:app --reload
```

Configura `DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD` y `SESSION_SECRET` en
el entorno. En producción, la aplicación no inicia sin `SESSION_SECRET`. Para
desarrollo local sobre HTTP configura `COOKIE_HTTPS_ONLY=false`; en un despliegue
HTTPS debe mantenerse en `true`.

## Rutas principales

- `/`: selección entre el panel administrativo y BIOPAE.
- `/admin`: panel protegido; sin sesión redirige a `/admin/login`.
- `/admin/login`: autenticación administrativa existente.
- `/biopae` y `/menu`: entrada al módulo BIOPAE1.
- `/scanner`, `/vaso` y `/almuerzo`: escaneo QR y consulta de disponibilidad.

Las rutas de escaneo mantienen el procesamiento y la validación originales de
BIOPAE1. El panel y BIOPAE utilizan la misma variable `DATABASE_URL`; no se
crea ni inicializa una segunda base de datos. No ejecutes `generar_qr.py` como
parte del despliegue: el script contiene creación de tabla e inserción de
registros.

## Sesiones y cierre de sesión

La autenticación administrativa conserva las sesiones firmadas mediante la
cookie de Starlette. Cerrar sesión vacía la sesión y la respuesta invalida la
cookie en el navegador; las páginas y API administrativas envían encabezados
`no-store` para evitar que el contenido privado se conserve en caché.

Las cookies firmadas son autocontenidas y no tienen una lista de revocación en
el servidor. El logout elimina la cookie del navegador actual, pero no puede
revocar copias que ya hayan sido obtenidas. Para invalidar todas las sesiones
emitidas, rota `SESSION_SECRET`; conserva un valor secreto y estable en
producción.

## Base de datos

El arranque de la aplicación no ejecuta migraciones ni scripts de inicialización.
Las operaciones existentes de disponibilidad y registro de entregas conservan
su comportamiento y solo se ejecutan cuando se invocan las rutas del módulo.
