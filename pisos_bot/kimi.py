import json, requests
from config import OPENROUTER_API_KEY, KIMI_MODEL, MENSAJE_CASERO
from database import log

URL = "https://openrouter.ai/api/v1/chat/completions"

def call(prompt, system=""):
    try:
        msgs = []
        if system: msgs.append({"role":"system","content":system})
        msgs.append({"role":"user","content":prompt})
        r = requests.post(URL, headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ramongalera22-ai.github.io/FILEHUB-IA/"
        }, json={"model":KIMI_MODEL,"messages":msgs,"max_tokens":800,"temperature":0.3}, timeout=30)
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"]
        log("error", f"Kimi {r.status_code}: {r.text[:100]}")
    except Exception as e:
        log("error", f"Kimi: {e}")
    return ""

def filtrar_piso(piso):
    resp = call(
        "Analiza este anuncio de piso en Barcelona. Responde SOLO JSON sin backticks:\n"
        f"Titulo: {piso.get('titulo','')}\n"
        f"Precio: {piso.get('precio','')}euros\n"
        f"Barrio: {piso.get('barrio','')}\n"
        f"Descripcion: {piso.get('descripcion','')}\n"
        '{"amueblado":true,"conexion_l3_l5":"buena","puntuacion":8,"resumen":"1 linea"}'
    )
    try:
        d = json.loads(resp.strip().strip("```json").strip("```"))
        piso["kimi"] = d
        if d.get("amueblado"):
            piso["amueblado"] = 1
    except:
        pass
    return piso

def personalizar_mensaje(piso):
    resp = call(
        f"Añade UNA frase al inicio (despues de Buenas tardes,) referenciando el piso en "
        f"{piso.get('barrio','Barcelona')} a {piso.get('precio','')} euros/mes "
        f"visto en {piso.get('platform','')}. "
        f"No cambies el resto. Devuelve el mensaje completo:\n\n{MENSAJE_CASERO}"
    )
    return resp if resp else MENSAJE_CASERO

def resumen_dia(pisos, trabajos):
    lineas_pisos = "\n".join(
        f"- {p.get('titulo','')} {p.get('precio','')}€ {p.get('barrio','')}"
        for p in pisos[:8]
    )
    lineas_trabajos = "\n".join(
        f"- {t.get('titulo','')} {t.get('empresa','')}"
        for t in trabajos[:5]
    )
    prompt = (
        f"Resume en 4-5 lineas los mejores resultados del dia:\n"
        f"PISOS ({len(pisos)}):\n{lineas_pisos}\n"
        f"TRABAJOS ({len(trabajos)}):\n{lineas_trabajos}"
    )
    return call(prompt, system="Eres asistente de busqueda de vivienda y empleo en Barcelona.")
