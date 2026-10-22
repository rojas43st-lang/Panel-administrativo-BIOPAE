
import os
import re
import secrets
from pathlib import Path

import psycopg
import qrcode
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
CARPETA_QR = BASE_DIR / "codigos_qr"


def preparar_tabla(conexion):
    """Crea la tabla de escarapelas si todavía no existe."""
    consulta = """
        CREATE TABLE IF NOT EXISTS escarapelas (
            id SERIAL PRIMARY KEY,
            estudiante_id INTEGER NOT NULL UNIQUE
                REFERENCES estudiantes(id),
            codigo_qr TEXT NOT NULL UNIQUE,
            activa BOOLEAN NOT NULL DEFAULT TRUE,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """

    with conexion.cursor() as cursor:
        cursor.execute(consulta)


def obtener_o_crear_codigo(conexion, estudiante_id):
    """Reutiliza el QR existente o crea uno nuevo para el estudiante."""
    with conexion.cursor() as cursor:
        cursor.execute(
            """
            SELECT codigo_qr
            FROM escarapelas
            WHERE estudiante_id = %s AND activa = TRUE
            LIMIT 1;
            """,
            (estudiante_id,)
        )

        resultado = cursor.fetchone()

        if resultado:
            return resultado[0]

        # Token aleatorio: no expone el documento ni el ID del estudiante.
        codigo = secrets.token_urlsafe(32)

        cursor.execute(
            """
            INSERT INTO escarapelas (estudiante_id, codigo_qr, activa)
            VALUES (%s, %s, TRUE)
            RETURNING codigo_qr;
            """,
            (estudiante_id, codigo)
        )

        return cursor.fetchone()[0]


def nombre_archivo(estudiante_id, nombre, apellido):
    """Crea un nombre de archivo seguro y fácil de identificar."""
    nombre_completo = f"{nombre}_{apellido}".strip()
    nombre_seguro = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "_",
        nombre_completo
    ).strip("_")

    return f"{estudiante_id}_{nombre_seguro or 'estudiante'}.png"


def generar_imagen(codigo, ruta):
    """Genera una imagen QR con el token del estudiante."""
    imagen = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4
    )

    imagen.add_data(codigo)
    imagen.make(fit=True)

    imagen_final = imagen.make_image(
        fill_color="black",
        back_color="white"
    )

    imagen_final.save(ruta)


def main():
    if not DATABASE_URL:
        raise RuntimeError(
            "No se encontró DATABASE_URL. "
            "Comprueba el archivo .env."
        )

    CARPETA_QR.mkdir(parents=True, exist_ok=True)

    with psycopg.connect(
        DATABASE_URL,
        connect_timeout=15
    ) as conexion:

        preparar_tabla(conexion)

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, nombre, apellido
                FROM estudiantes
                WHERE activo = TRUE
                ORDER BY apellido, nombre;
                """
            )
            estudiantes = cursor.fetchall()

        conexion.commit()

        if not estudiantes:
            print("No se encontraron estudiantes activos.")
            return

        generados = 0
        errores = 0

        for estudiante_id, nombre, apellido in estudiantes:
            try:
                codigo = obtener_o_crear_codigo(
                    conexion,
                    estudiante_id
                )

                conexion.commit()

                archivo = nombre_archivo(
                    estudiante_id,
                    nombre or "",
                    apellido or ""
                )

                ruta = CARPETA_QR / archivo

                generar_imagen(codigo, ruta)

                print(
                    f"QR generado: {nombre} {apellido} "
                    f"-> {ruta.name}"
                )

                generados += 1

            except Exception as error:
                conexion.rollback()
                errores += 1

                print(
                    f"Error con estudiante ID {estudiante_id}: "
                    f"{error}"
                )

        print("\nProceso finalizado.")
        print(f"Estudiantes procesados: {len(estudiantes)}")
        print(f"Imágenes generadas: {generados}")
        print(f"Errores: {errores}")
        print(f"Carpeta: {CARPETA_QR}")


if __name__ == "__main__":
    main()
