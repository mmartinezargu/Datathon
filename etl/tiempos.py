"""Minutos en coche (OSRM, sin tráfico) al hospital y entre los pueblos del reto.

Uso (desde etl/):  uv run tiempos.py              (pregunta a OSRM; lo ya preguntado sale de la caché)
                   uv run tiempos.py --simulacro  (sin red: minutos inventados con la línea recta, para probar)

- Hospital: minutos desde el núcleo de cada municipio (el mismo que usa preparar.py) hasta el
  hospital general público de la Comunidad al que se llega antes. Puede no ser el más cercano
  en línea recta.
- Vecinos: minutos desde el núcleo de cada pueblo del reto hasta el de cada otro pueblo del reto.
  Solo se guardan los de 60 minutos o menos. Van de origen a destino (la ida puede no durar
  lo mismo que la vuelta).

Usa la API /table del servidor público de OSRM (datos de OpenStreetMap, ODbL), troceando las
peticiones y con una pausa entre ellas. Cada respuesta se guarda en data/raw/osrm_cache (no se
sube a git), así que volver a ejecutarlo no vuelve a preguntar. Escribe data/raw/tiempos_osrm.json,
que lee preparar.py. Al final compara los minutos con los km en línea recta.
"""
import argparse
import datetime
import hashlib
import json
import math
import time

import geopandas as gpd
import numpy as np
import requests

from comun import ANIO_BASE, LIMITE_HABITANTES, RAW, WEB_DATOS, leer_poblacion
from preparar import hospitales, nucleos, terminos_municipales

SERVIDOR = "https://router.project-osrm.org"
CACHE = RAW / "osrm_cache"
VECINOS_MAX_MIN = 60
# El servidor público acepta tablas de hasta 100 puntos (orígenes + destinos)
BLOQUE = 50
PAUSA_S = 1.1
# Mismas reglas que web/src/motor.ts
HOSPITAL_LEJOS_KM = 25
HOSPITAL_LEJOS_MIN = 30
# Simulacro: la línea recta, un 30 % más larga por las curvas, a 60 km/h
SIMULACRO_RODEO = 1.3
SIMULACRO_KMH = 60


def a_lonlat(x: np.ndarray, y: np.ndarray) -> list[tuple[float, float]]:
    """De metros UTM 30N (ETRS89) a (longitud, latitud)."""
    p = gpd.GeoSeries(gpd.points_from_xy(x, y), crs=25830).to_crs(4326)
    return [(round(q.x, 6), round(q.y, 6)) for q in p]


def pedir(url: str) -> dict:
    """GET a OSRM con caché en disco y reintentos."""
    archivo = CACHE / f"{hashlib.sha1(url.encode()).hexdigest()[:20]}.json"
    if archivo.exists():
        return json.loads(archivo.read_text(encoding="utf-8"))
    for intento in range(4):
        r = requests.get(url, timeout=60, headers={"User-Agent": "CABIDA (II Datathon LoDCOREMadrid)"})
        time.sleep(PAUSA_S)
        if r.status_code == 200 and r.json().get("code") == "Ok":
            CACHE.mkdir(parents=True, exist_ok=True)
            archivo.write_text(r.text, encoding="utf-8")
            return r.json()
        print(f"  OSRM respondió {r.status_code}; reintento {intento + 1}")
        time.sleep(5 * (intento + 1))
    raise SystemExit(f"OSRM no responde: {url[:120]}…")


def tabla(origenes: list[tuple[float, float]], destinos: list[tuple[float, float]],
          simulacro: bool) -> np.ndarray:
    """Minutos de cada origen a cada destino (NaN si no hay ruta), en bloques."""
    m = np.full((len(origenes), len(destinos)), np.nan)
    paso_o = BLOQUE * 2 - min(len(destinos), BLOQUE)  # si hay pocos destinos, más orígenes por petición
    for i in range(0, len(origenes), paso_o):
        for j in range(0, len(destinos), BLOQUE):
            o, d = origenes[i:i + paso_o], destinos[j:j + BLOQUE]
            if simulacro:
                m[i:i + len(o), j:j + len(d)] = [[recta_km(a, b) * SIMULACRO_RODEO / SIMULACRO_KMH * 60 for b in d] for a in o]
                continue
            puntos = ";".join(f"{lon},{lat}" for lon, lat in o + d)
            url = (f"{SERVIDOR}/table/v1/driving/{puntos}?annotations=duration"
                   f"&sources={';'.join(map(str, range(len(o))))}"
                   f"&destinations={';'.join(map(str, range(len(o), len(o) + len(d))))}")
            segundos = pedir(url)["durations"]
            m[i:i + len(o), j:j + len(d)] = [[np.nan if s is None else s / 60 for s in fila] for fila in segundos]
    return m


def recta_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Distancia en línea recta entre dos (longitud, latitud), en km (solo para el simulacro)."""
    lat = math.radians((a[1] + b[1]) / 2)
    return math.hypot((a[0] - b[0]) * 111.32 * math.cos(lat), (a[1] - b[1]) * 110.57)


def comparar(datos: dict) -> None:
    """Minutos frente a km: correlación y pueblos que cambian de lado (hospital lejos en una medida y no en la otra)."""
    municipios = json.loads((WEB_DATOS / "municipios.json").read_text(encoding="utf-8"))
    universo = [m for m in municipios if m["universo"] and m["capacidad"]]
    por_ine = {m["ine"]: m for m in universo}
    km = np.array([m["hospital_km"] for m in universo])
    minutos = np.array([datos["hospital"][m["ine"]]["min"] for m in universo])

    print("\nMinutos en coche frente a km en línea recta (los 155 del reto)")
    print(f"  Hospital: correlación {np.corrcoef(km, minutos)[0, 1]:.3f}; "
          f"mediana {np.median(minutos):.0f} min y {np.median(km):.1f} km; "
          f"{np.median(minutos / np.maximum(km, 0.1)):.2f} min por km (mediana)".replace(".", ","))
    pares = [(math.hypot(por_ine[o]["nucleo_x"] - por_ine[d]["nucleo_x"], por_ine[o]["nucleo_y"] - por_ine[d]["nucleo_y"]), v)
             for o, ds in datos["vecinos"].items() if o in por_ine for d, v in ds.items() if d in por_ine]
    pk, pm = np.array(pares).T
    print(f"  Entre pueblos: {len(pares)} parejas a {VECINOS_MAX_MIN} min o menos; correlación {np.corrcoef(pk, pm)[0, 1]:.3f}"
          .replace(".", ","))
    a25 = sum(1 for k, _ in pares if k <= 25)
    print(f"  Parejas a 25 km o menos en línea recta: {a25}; de ellas, a 30 min o menos: "
          f"{sum(1 for k, v in pares if k <= 25 and v <= 30)}")

    lejos_km = {m["ine"] for m in universo if m["hospital_km"] > HOSPITAL_LEJOS_KM}
    lejos_min = {m["ine"] for m in universo if datos["hospital"][m["ine"]]["min"] > HOSPITAL_LEJOS_MIN}
    print(f"  Hospital lejos: {len(lejos_km)} a más de {HOSPITAL_LEJOS_KM} km; {len(lejos_min)} a más de {HOSPITAL_LEJOS_MIN} min")

    def linea(ine: str) -> str:
        h = datos["hospital"][ine]
        nombre = next((m["nombre"] for m in municipios if m["ine"] == h["ine"]), h["ine"])
        return (f"    {por_ine[ine]['nombre']}: {por_ine[ine]['hospital_km']:.1f} km ({por_ine[ine]['hospital_municipio']}), "
                f"{h['min']:.0f} min ({nombre})").replace(".", ",")
    for titulo, lista in (("Lejos en km pero no en minutos", lejos_km - lejos_min),
                          ("Lejos en minutos pero no en km", lejos_min - lejos_km)):
        print(f"  {titulo}: {len(lista)}")
        for ine in sorted(lista, key=lambda i: por_ine[i]["nombre"]):
            print(linea(ine))
    # Las oportunidades condicionadas salen del motor de la web (tipo × hospital lejos): las comprueba web/tests/motor.test.ts


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    args.add_argument("--simulacro", action="store_true", help="sin red: minutos inventados con la línea recta, para probar")
    simulacro = args.parse_args().simulacro

    mun = terminos_municipales()
    hosp = hospitales(mun)
    nucleo = nucleos(mun)
    pob = leer_poblacion()
    del_reto = set(pob.loc[pob[ANIO_BASE] < LIMITE_HABITANTES, "ine"])
    todos = list(nucleo.index)
    reto = [i for i in todos if i in del_reto]

    puntos = dict(zip(todos, a_lonlat(nucleo["x"].to_numpy(), nucleo["y"].to_numpy())))
    puntos_hosp = a_lonlat(hosp.geometry.x.to_numpy(), hosp.geometry.y.to_numpy())
    print(f"{'Simulacro (sin red)' if simulacro else 'OSRM'}: {len(todos)} municipios → {len(hosp)} hospitales; "
          f"{len(reto)} × {len(reto)} pueblos del reto")

    a_hosp = tabla([puntos[i] for i in todos], puntos_hosp, simulacro)
    if np.isnan(a_hosp).all(axis=1).any():
        raise SystemExit("Hay municipios sin ruta a ningún hospital")
    cual = np.nanargmin(a_hosp, axis=1)
    hospital = {i: {"min": round(float(a_hosp[k, cual[k]]), 1), "registro": str(hosp["registro"].iloc[cual[k]]),
                    "ine": str(hosp["ine"].iloc[cual[k]])}
                for k, i in enumerate(todos)}

    entre = tabla([puntos[i] for i in reto], [puntos[i] for i in reto], simulacro)
    vecinos = {}
    for a, o in enumerate(reto):
        cerca = [(round(float(entre[a, b]), 1), d) for b, d in enumerate(reto)
                 if d != o and not np.isnan(entre[a, b]) and entre[a, b] <= VECINOS_MAX_MIN]
        vecinos[o] = {d: v for v, d in sorted(cerca)}

    datos = {
        "fuente": "OSRM, perfil de coche, sin tráfico (router.project-osrm.org); datos © colaboradores de OpenStreetMap (ODbL)",
        "fecha": datetime.date.today().isoformat(),
        "simulacro": simulacro,
        "hospital": hospital,
        "vecinos": vecinos,
    }
    salida = RAW / ("tiempos_osrm_simulacro.json" if simulacro else "tiempos_osrm.json")
    salida.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    print(f"Escrito {salida.relative_to(RAW.parent.parent)} ({salida.stat().st_size / 1e3:.0f} KB)")
    comparar(datos)


if __name__ == "__main__":
    main()
