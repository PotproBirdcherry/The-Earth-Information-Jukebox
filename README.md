# 🌎🎵 Earth Sonification Jukebox

**Escuchar el planeta: datos de observación de la Tierra convertidos en música.**

Proyecto para el **NASA Space Apps Challenge 2026** · Reto: *The Earth Information Jukebox*

---

## La idea

La información sobre el estado del planeta (mapas de sequía, anomalías de temperatura, series de tiempo, imágenes satelitales) se comunica casi exclusivamente con imágenes, y eso deja fuera a muchas personas.

El **Earth Sonification Jukebox** convierte visualizaciones de datos de la Tierra en sonido sincronizado con la imagen. Así abre un segundo canal de acceso a la información: **el oído**.

## ¿Por qué importa?

### El problema: los datos del planeta son solo visuales

- La Organización Mundial de la Salud estima que **al menos 2,200 millones de personas** en el mundo viven con algún tipo de discapacidad visual o ceguera.
- En México, el Censo de Población y Vivienda 2020 registró **6,179,890 personas con discapacidad** (4.9 % de la población). De acuerdo con el INEGI, alrededor del **44 %** de ellas tiene dificultad para ver.
- Para estas personas, la mayoría de los mapas, gráficas e imágenes satelitales sobre el clima y el ambiente son hoy inaccesibles.

### La evidencia: la sonificación funciona

NASA ya ha explorado este camino con su programa *Universe of Sound*, que traduce datos de telescopios espaciales a sonido. Un estudio publicado en 2024 en *Frontiers in Communication* encuestó a **3,184 personas**, videntes y con discapacidad visual, y encontró:

- Mejoras significativas en el aprendizaje percibido.
- Respuestas positivas respecto al disfrute de la experiencia.
- Que involucrar varios sentidos genera confianza en los datos científicos, amplía el acceso y aumenta la conciencia sobre accesibilidad, tanto en público vidente como en personas ciegas o con baja visión.

### Más allá de la accesibilidad

- **Comunicación de riesgo:** un sonido que se vuelve más tenso cuando empeora una sequía o crece una anomalía se entiende sin interpretar una gráfica ni una escala de colores.
- **Educación:** escuchar décadas de datos en unos segundos deja una impresión más duradera que una tabla de cifras.
- **Conexión emocional:** el cambio ambiental deja de ser un número abstracto y se convierte en algo que se percibe.

## ¿Qué hace la aplicación?

| Sección | Descripción |
|---|---|
| **Home** (`/`) | Presenta el proyecto y cómo usar el jukebox. |
| **Upload image** (`/cargar-imagen`) | Formulario para agregar una imagen nueva con título, ubicación y descripción. Valida el formato (PNG, JPG, GIF, WEBP, BMP) y el tamaño (máx. 10 MB). |
| **Playlist** (`/playlist`) | El jukebox: eliges una imagen y la escuchas como melodía, con un marcador que muestra qué zona de la imagen está sonando. |
| **About us** (`/about`) | Presentación del equipo. |

### Cómo se convierte una imagen en sonido

El servidor reduce cada imagen a una rejilla de 96 × 64 zonas, mide su color, brillo y textura, y las convierte en notas de la **escala pentatónica mayor** (Do, Re, Mi, Sol, La). Se eligió esta escala porque casi nunca suena disonante, así que cualquier imagen produce una melodía agradable.

**Siete modos de reproducción:**

| # | Modo | Recorrido |
|---|---|---|
| 1 | Columnas | De izquierda a derecha |
| 2 | Latitudes | De arriba abajo, franja por franja |
| 3 | Radar | Anillos del centro hacia afuera |
| 4 | Espiral | Zonas en espiral desde el centro |
| 5 | Espectrograma | Cada fila es una frecuencia exacta (arriba agudo, abajo grave) y el brillo es el volumen |
| 6 | Acordes por columna | Columnas de izquierda a derecha, cada una dividida en 4 áreas que suenan juntas |
| 7 | Acordes por latitud | Franjas de abajo hacia arriba, cada una dividida en 4 áreas que suenan juntas |

**Qué representa cada sonido:**

| Modos de notas (1–4) | Modos de acordes (6–7) |
|---|---|
| **Brillo → altura:** más claro = más agudo | **Color cálido/frío → altura:** más cálido = más grave |
| **Saturación → volumen:** colores intensos = más fuerte | **Brillo → volumen:** zonas oscuras casi no suenan |
| **Posición → izquierda/derecha** (opcional) | **Cada área → su propia octava** (Do3 a Do6) |
| **Textura → ritmo** (opcional): zonas con detalle = notas rápidas y percusión; zonas lisas = notas largas | **Textura → ritmo** del acorde completo (opcional) |

### Accesibilidad

El jukebox se puede usar completo **solo con el teclado** e incluye:

- **Guía por voz** (síntesis de voz del navegador) que narra la imagen, el modo y cómo escucharlo.
- **Mensajes para lectores de pantalla** mediante una región `aria-live`.
- **Vista de alto contraste** que oculta los elementos puramente visuales y agranda el texto.
- **Sonidos de interfaz** que confirman cada acción (reproducir, cambiar de imagen, cambiar de vista).

| Tecla | Acción |
|---|---|
| `Espacio` | Reproducir / pausar |
| `←` `→` | Imagen anterior / siguiente |
| `1`–`7` | Elegir modo de reproducción |
| `R` | Siguiente modo |
| `G` | Repetir la guía de cómo escuchar |
| `T` | Activar/desactivar ritmo por textura |
| `E` | Activar/desactivar sonido izquierda/derecha |
| `V` | Activar/desactivar guía por voz |
| `B` | Mostrar/ocultar barras de sonido |
| `M` | Vista normal / alto contraste |

## Imágenes incluidas

La playlist incluye cinco visualizaciones globales de NASA:

1. GEOS-FP Near-Surface Humidity (humedad cerca de la superficie)
2. GEOS-FP Near-Surface Temperature (temperatura cerca de la superficie)
3. Near Surface Ozone (O₃) (ozono cerca de la superficie)
4. GEOS-FP Precipitation and Clouds (precipitación y nubes)
5. Global Sea Surface Currents and Temperature (corrientes y temperatura del mar)

<!-- Agregar aquí el enlace a la fuente original de cada visualización (NASA SVS / Earth Information Center). -->

## Instalación y uso

Requisitos: **Python 3.10 o superior**.

```bash
# 1. Clonar el repositorio
git clone https://github.com/axealbert/The-Earth-Information-Jukebox.git
cd The-Earth-Information-Jukebox

# 2. Crear y activar un entorno virtual
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Instalar dependencias (Flask y Pillow)
pip install -r requirements.txt

# 4. Ejecutar
python app.py
```

Abre **http://127.0.0.1:5000** en el navegador y usa audífonos para una mejor experiencia.

### Agregar imágenes

- **Desde la aplicación:** entra a *Upload image*, llena el formulario y la imagen aparecerá en la playlist.
- **A mano:** copia la imagen a `static/Imagenes/` y agrega su entrada (`id`, `titulo`, `ubicacion`, `descripcion`, `archivo`) en `config/imagenes.json`.

Para mostrar la foto del equipo en *About us*, guárdala como `static/equipo/equipo.jpg` (también acepta `.jpeg`, `.png` o `.webp`).

## Estructura del proyecto

```
The-Earth-Information-Jukebox/
├── app.py                  # Servidor Flask: rutas, carga de imágenes y sonificación
├── requirements.txt        # Dependencias (Flask, Pillow)
├── config/
│   └── imagenes.json       # Título, ubicación, descripción y archivo de cada imagen
├── static/
│   ├── Imagenes/           # Visualizaciones de la playlist
│   ├── Sonidos/            # Sonidos de la interfaz
│   └── js/app.js           # Reproductor: audio (Web Audio API), voz, teclado y visualizador
└── templates/              # Páginas HTML (Jinja2 + Bootstrap 5)
    ├── base.html
    ├── index.html
    ├── Jukebox.html
    ├── cargar_imagen.html
    └── about.html
```

**Tecnologías:** Python · Flask · Pillow · JavaScript · Web Audio API · Web Speech API · Bootstrap 5

## Siguientes pasos: hacer audible el territorio

El impacto crece cuando la sonificación se aterriza en un lugar y un problema concretos, en lugar de quedarse en promedios globales:

- Sonificar variables como **precipitación, humedad del suelo o índices de vegetación** de una cuenca o región agrícola, para que se escuche cómo evolucionó una sequía año con año.
- **Usuarios concretos:** productores, organismos de cuenca, protección civil, escuelas y radios comunitarias.
- **Formatos ligeros:** exportar clips de audio que puedan circular por mensajería o radio en lugares con poca conectividad o sin pantallas grandes.
- **Alertas sonoras de sequía** para zonas agrícolas y **versiones en lenguas indígenas**.

> *“Hacemos que los datos del agua y del clima se escuchen, para que nadie quede fuera de la información que afecta su vida y su sustento.”*

## Principios de diseño

- **Honestidad científica:** cada sonido tiene un significado explícito que la aplicación explica en pantalla y por voz. Nada es un efecto decorativo.
- **Accesibilidad real:** navegación completa con teclado, compatibilidad con lectores de pantalla y una interfaz ligera.
- **Diseñar con las personas, no solo para ellas:** el equipo de *Universe of Sound* subraya que su trabajo se hace en colaboración con la comunidad ciega y de baja visión. Queremos probar el prototipo con personas usuarias e incorporar su retroalimentación.

## Equipo

Salvador Bernal · Santiago Arriaga · Eugenio Ramírez · Alejandro Áviles · Axel Alberto · Petr Skorev

## Referencias

1. Organización Mundial de la Salud (2019). *World report on vision.* https://www.who.int/news/item/08-10-2019-who-launches-first-world-report-on-vision
2. CNDH (2022). *Violencia contra personas con discapacidad* (datos del Censo 2020). https://www.cndh.org.mx/sites/default/files/documentos/2022-02/Violencia_Personas_Discapacidad_1.pdf
3. Milenio. *Ceguera, una condición que discrimina y excluye* (datos INEGI). https://www.milenio.com/ciencia-y-salud/ceguera-una-condicion-que-discrimina-y-excluye
4. Arcand, K. K. et al. (2024). *A Universe of Sound: processing NASA data into sonifications to explore participant response.* Frontiers in Communication. https://www.frontiersin.org/journals/communication/articles/10.3389/fcomm.2024.1288896/text
5. EurekAlert (2024). *A Universe of Sound.* https://www.eurekalert.org/news-releases/1038837

---

*Prototipo desarrollado durante el NASA Space Apps Challenge 2026. No es un producto oficial de NASA. Las visualizaciones utilizadas provienen de NASA.*
