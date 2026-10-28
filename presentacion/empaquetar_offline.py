"""Copia sin internet de las diapositivas: un solo HTML con las tipografías (woff2) y las imágenes dentro.

Uso (desde la raíz, con red solo para bajar las tipografías una vez):
    python3 presentacion/empaquetar_offline.py
Escribe entrega/offline/CABIDA_diapositivas.html, que se abre con doble clic sin red.
"""

import base64
import re
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "presentacion" / "diapositivas.html"
SALIDA = RAIZ / "entrega" / "offline" / "CABIDA_diapositivas.html"
# Con un navegador moderno, Google Fonts sirve woff2
NAVEGADOR = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}


def bajar(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=NAVEGADOR), timeout=30) as r:
        return r.read()


def fuentes_dentro(css: str) -> str:
    """Cambia cada url(...) de las tipografías por su woff2 en base64."""
    def a_base64(m: re.Match) -> str:
        datos = base64.b64encode(bajar(m.group(1))).decode()
        return f"url(data:font/woff2;base64,{datos})"
    return re.sub(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", a_base64, css)


def main() -> None:
    html = ENTRADA.read_text(encoding="utf-8")
    # Tipografías: el <link> de Google Fonts pasa a un <style> con las fuentes dentro; fuera los preconnect
    enlace = re.search(r'<link href="(https://fonts\.googleapis\.com/css2[^"]+)" rel="stylesheet" />', html)
    css = fuentes_dentro(bajar(enlace.group(1).replace("&amp;", "&")).decode())
    html = html.replace(enlace.group(0), f"<style>\n{css}</style>")
    html = re.sub(r'<link rel="preconnect"[^>]*>\n?', "", html)
    # Imágenes locales (los SVG del mapa) dentro, como data URI
    def imagen(m: re.Match) -> str:
        ruta = ENTRADA.parent / m.group(1)
        tipo = "image/svg+xml" if ruta.suffix == ".svg" else f"image/{ruta.suffix[1:]}"
        return f'src="data:{tipo};base64,{base64.b64encode(ruta.read_bytes()).decode()}"'
    html = re.sub(r'src="(?!data:|https?:)([^"]+)"', imagen, html)
    assert "fonts.g" not in html and not re.search(r'src="(?!data:)', html), "queda algo que pide red"
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(html, encoding="utf-8")
    print(f"{SALIDA.relative_to(RAIZ)}: {SALIDA.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
