
import os
from pathlib import Path

import psycopg
import qrcode
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
CARPETA_QR = BASE_DIR / "codigos_qr"


def obtener_estudiantes():
    if not DATABASE_URL:
        raise RuntimeError(
            "No se encontró DATABASE_URL en el archivo .env"
        )

    consulta = """
        SELECT id, nombre, apellido
        FROM estudiantes
        WHERE activo = TRUE
        ORDER BY apellido, nombre;
    """

    with psycopg.connect(
        DATABASE_URL,
        connect_timeout=15
    ) as conexion:
        with conexion.cursor() as cursor:
            cursor.execute(consulta)
            return cursor.fetchall()