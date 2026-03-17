"""
USO:
  python3 main.py pisos    → buscar pisos + contactar
  python3 main.py trabajo  → buscar trabajo
  python3 main.py todo     → todo + resumen Kimi
  python3 main.py api      → API para dashboard
"""
import sys, json, time, random
from pathlib import Path
from datetime import datetime
from database   import init_db, exportar, log
from scraper_pisos   import buscar_pisos
from scraper_trabajo import buscar_trabajos
from notifier   import (contactar_casero, alerta_pisos,
                         alerta_trabajos, 
                         )
from kimi       import filtrar_piso, resumen_dia
from config     import MAX_PISOS_DIA, PAUSA_ENTRE_PISOS

JSON_FILE = Path(__file__).parent / "data" / "dashboard.json"

def exportar_json():
    JSON_FILE.parent.mkdir(exist_ok=True)
    with open(JSON_FILE,"w",encoding="utf-8") as f:
        json.dump(exportar(), f, ensure_ascii=False, indent=2)
    log("info", f"Dashboard JSON → {JSON_FILE}")

def run_pisos():
    log("info", "═"*45)
    log("info", "🏠 BÚSQUEDA DE PISOS")
    pisos_nuevos = buscar_pisos()
    validos = []
    for p in pisos_nuevos:
        p = filtrar_piso(p)
        if p.get("amueblado"): continue
        validos.append(p)
        time.sleep(1)
    log("info", f"Válidos tras filtro Kimi: {len(validos)}")
    contactados = 0
    for p in validos[:MAX_PISOS_DIA]:
        contactar_casero(p)
        contactados += 1
        time.sleep(PAUSA_ENTRE_PISOS + random.uniform(0,5))
    if validos:
        alerta_pisos(validos)
        )
    log("info", f"✅ {len(validos)} válidos, {contactados} contactados")
    return validos

def run_trabajo():
    log("info", "═"*45)
    log("info", "💼 BÚSQUEDA DE TRABAJO")
    trabajos = buscar_trabajos()
    if trabajos:
        alerta_trabajos(trabajos)
        )
    return trabajos

def run_todo():
    pisos    = run_pisos()
    trabajos = run_trabajo()
    resumen  = resumen_dia(pisos, trabajos)
    if resumen:
        log("info", f"\n📊 RESUMEN:\n{resumen}")
        enviar_whatsapp(f"📊 *Resumen diario*\n\n{resumen}")
    exportar_json()

if __name__ == "__main__":
    init_db()
    modo = sys.argv[1] if len(sys.argv) > 1 else "todo"
    if   modo == "pisos":   run_pisos()
    elif modo == "trabajo": run_trabajo()
    elif modo == "api":
        import api; api.app.run(host="0.0.0.0", port=5001)
    elif modo == "export":  exportar_json()
    else: run_todo()
    exportar_json()
