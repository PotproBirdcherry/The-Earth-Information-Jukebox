import colorsys
import json
import os
import uuid
from pathlib import Path

from flask import (Flask, abort, flash, jsonify, redirect, render_template,
                   request, url_for)
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion"),
    # Archivo de configuración con el título, ubicación y descripción de cada imagen
    CONFIG_FILE=BASE_DIR / "config" / "imagenes.json",
    # Carpeta donde se guardan las imágenes que suben los usuarios
    UPLOAD_FOLDER=BASE_DIR / "static" / "Imagenes",
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,  # 10 MB por imagen
)

EXTENSIONES_PERMITIDAS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}


# ---------------------------------------------------------------------------
# Archivo de configuración
# ---------------------------------------------------------------------------
def leer_config():
    """Devuelve la lista de imágenes guardadas en el archivo de configuración."""
    ruta = Path(app.config["CONFIG_FILE"])
    if not ruta.exists():
        return []
    with ruta.open(encoding="utf-8") as f:
        return json.load(f)


def guardar_config(imagenes):
    """Escribe la lista completa (primero a un temporal para no corromper el archivo)."""
    ruta = Path(app.config["CONFIG_FILE"])
    ruta.parent.mkdir(parents=True, exist_ok=True)
    temporal = ruta.with_suffix(".tmp")
    with temporal.open("w", encoding="utf-8") as f:
        json.dump(imagenes, f, ensure_ascii=False, indent=2)
    os.replace(temporal, ruta)


def buscar_imagen(imagen_id):
    return next((i for i in leer_config() if i["id"] == imagen_id), None)


def con_url(imagen):
    """Agrega la URL pública de la imagen para usarla en el navegador."""
    return {**imagen, "url": url_for("static", filename=f"Imagenes/{imagen['archivo']}")}


# ---------------------------------------------------------------------------
# Sonificación con la escala pentatónica
# ---------------------------------------------------------------------------
# Escala pentatónica mayor: Do, Re, Mi, Sol, La (semitonos desde la tónica).
ESCALA_PENTATONICA = [0, 2, 4, 7, 9]
NOMBRES_NOTAS = {0: "Do", 2: "Re", 4: "Mi", 7: "Sol", 9: "La"}
FRECUENCIA_DO3 = 130.81
OCTAVAS = 3
COLUMNAS = 48            # cada columna de la imagen es una nota
DURACION_NOTA = 0.25     # segundos por nota


def notas_pentatonicas():
    """Lista de (nombre, frecuencia) de la escala pentatónica, de grave a agudo."""
    notas = []
    for octava in range(OCTAVAS):
        for semitono in ESCALA_PENTATONICA:
            frecuencia = FRECUENCIA_DO3 * 2 ** ((octava * 12 + semitono) / 12)
            notas.append((f"{NOMBRES_NOTAS[semitono]}{octava + 3}", frecuencia))
    notas.append((f"Do{OCTAVAS + 3}", FRECUENCIA_DO3 * 2 ** OCTAVAS))
    return notas


def sonificar(ruta_imagen, columnas=COLUMNAS):
    """
    Recorre la imagen de izquierda a derecha y convierte cada columna en una nota:
      - brillo de la columna  -> altura de la nota (más claro = más agudo)
      - saturación del color  -> volumen (colores intensos = más fuerte)
    Solo se usan notas de la escala pentatónica, así cualquier imagen suena armónica.
    """
    escala = notas_pentatonicas()
    with Image.open(ruta_imagen) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        # Promedia cada columna en un solo píxel
        franja = img.resize((columnas, 1), Image.Resampling.BOX)
        colores = [franja.getpixel((x, 0)) for x in range(columnas)]

    brillos = [(0.299 * r + 0.587 * g + 0.114 * b) / 255 for r, g, b in colores]
    # Estira el contraste para que la melodía use todo el rango de la escala
    minimo, maximo = min(brillos), max(brillos)
    rango = maximo - minimo if maximo - minimo > 0.05 else 1.0

    notas = []
    for (r, g, b), brillo in zip(colores, brillos):
        _, saturacion, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        indice = round((brillo - minimo) / rango * (len(escala) - 1))
        nombre, frecuencia = escala[indice]
        notas.append({
            "nota": nombre,
            "frecuencia": round(frecuencia, 2),
            "volumen": round(0.35 + 0.65 * saturacion, 2),
            "color": f"#{r:02x}{g:02x}{b:02x}",
        })

    return {
        "escala": "Pentatónica mayor (Do, Re, Mi, Sol, La)",
        "duracion_nota": DURACION_NOTA,
        "notas": notas,
    }


# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
@app.route("/")
def Inicio():
    return render_template("base.html")


@app.route("/playlist")
def playlist():
    imagenes = [con_url(i) for i in leer_config()]
    return render_template("Jukebox.html", imagenes=imagenes,
                           seleccionada=request.args.get("imagen"))


@app.route("/api/sonificar/<imagen_id>")
def api_sonificar(imagen_id):
    imagen = buscar_imagen(imagen_id)
    if imagen is None:
        abort(404)
    ruta = Path(app.config["UPLOAD_FOLDER"]) / imagen["archivo"]
    if not ruta.exists():
        abort(404)
    return jsonify(sonificar(ruta))


@app.route("/cargar-imagen", methods=["GET", "POST"])
def cargar_imagen():
    datos = {"titulo": "", "ubicacion": "", "descripcion": ""}
    errores = {}

    if request.method == "POST":
        datos = {campo: request.form.get(campo, "").strip() for campo in datos}
        archivo = request.files.get("imagen")

        if not datos["titulo"]:
            errores["titulo"] = "Escribe un título."
        elif any(i["titulo"].lower() == datos["titulo"].lower() for i in leer_config()):
            errores["titulo"] = "Ya existe una imagen con ese título."
        if not datos["ubicacion"]:
            errores["ubicacion"] = "Escribe la ubicación."
        if not datos["descripcion"]:
            errores["descripcion"] = "Escribe una descripción."

        extension = ""
        if not archivo or not archivo.filename:
            errores["imagen"] = "Selecciona una imagen de tu computadora."
        else:
            extension = archivo.filename.rsplit(".", 1)[-1].lower() if "." in archivo.filename else ""
            if extension not in EXTENSIONES_PERMITIDAS:
                errores["imagen"] = "Formato no permitido. Usa PNG, JPG, GIF, WEBP o BMP."
            else:
                try:
                    with Image.open(archivo.stream) as img:
                        img.verify()
                    archivo.stream.seek(0)
                except (UnidentifiedImageError, OSError):
                    errores["imagen"] = "El archivo no es una imagen válida."

        if not errores:
            imagen_id = uuid.uuid4().hex[:8]
            nombre_seguro = secure_filename(archivo.filename.rsplit(".", 1)[0]) or "imagen"
            nombre_archivo = f"{imagen_id}_{nombre_seguro}.{extension}"
            carpeta = Path(app.config["UPLOAD_FOLDER"])
            carpeta.mkdir(parents=True, exist_ok=True)
            archivo.save(carpeta / nombre_archivo)

            imagenes = leer_config()
            imagenes.append({"id": imagen_id, **datos, "archivo": nombre_archivo})
            guardar_config(imagenes)

            flash(f"«{datos['titulo']}» se agregó a la playlist.", "success")
            return redirect(url_for("playlist", imagen=imagen_id))

    return render_template("cargar_imagen.html", datos=datos, errores=errores)


@app.errorhandler(413)
def archivo_muy_grande(_error):
    flash("La imagen es demasiado grande (máximo 10 MB).", "danger")
    return redirect(url_for("cargar_imagen"))


if __name__ == "__main__":
    app.run(debug=True)
