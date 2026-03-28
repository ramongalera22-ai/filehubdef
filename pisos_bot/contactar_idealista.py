#!/usr/bin/env python3
"""
Script para contactar caseros en Idealista automaticamente.
Usa Playwright para abrir cada anuncio, rellenar el formulario y enviar.

Requisitos:
  pip install playwright
  playwright install chromium

Uso:
  python3 contactar_idealista.py

El script se conecta al Chrome que ya tengas abierto via CDP (puerto 9222).
Para lanzar Chrome con CDP:
  google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile

O si prefieres que lance su propio navegador, cambia USE_CDP = False
"""

import json
import time
import logging
from datetime import datetime
from playwright.sync_api import sync_playwright

# --- CONFIGURACION ---
USE_CDP = False  # True = conectar a Chrome existente, False = lanzar nuevo
CDP_URL = "http://127.0.0.1:9222"
HEADLESS = True  # True = sin ventana (WSL2/servidor sin GUI)
DELAY_SECONDS = 20
LOG_FILE = "contactar_log.json"

# Datos de contacto
NOMBRE = "Carlos Galera Roman"
EMAIL = "carlosgalera2roman@gmail.com"
TELEFONO = "679888148"

MENSAJE = (
    "Me pongo en contacto con usted tras ver el anuncio de su vivienda "
    "por la que estamos muy interesados. Somos una pareja de medicos que "
    "buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella "
    "trabaja como facultativa en el Hospital Universitario Vall dHebron "
    "y el es facultativo especialista con incorporacion proxima a la "
    "ciudad. Nuestros ingresos conjuntos superan los 5000 euros netos "
    "mensuales acreditables mediante nominas y contratos en vigor. Somos "
    "personas responsables no fumadores y sin mascotas. Tenemos "
    "disponibilidad inmediata para realizar una visita. Quedamos a su "
    "disposicion en el 679888148 o en carlosgalera2roman@gmail.com. "
    "Atentamente Carlos Galera Roman."
)

# URLs de anuncios - BATCH 1-30
ANUNCIOS = [
    # Horta-Guinardo
    {"id": 1, "titulo": "Piso Siguenza 70 El Carmel", "url": "https://www.idealista.com/inmueble/111024200/"},
    {"id": 2, "titulo": "Piso Castillejos Baix Guinardo", "url": "https://www.idealista.com/inmueble/111019701/"},
    {"id": 3, "titulo": "Piso Telegraf El Guinardo", "url": "https://www.idealista.com/inmueble/111005547/"},
    {"id": 4, "titulo": "Estudio Gran Vista El Carmel", "url": "https://www.idealista.com/inmueble/110807532/"},
    {"id": 5, "titulo": "Piso Sant Dalmir La Teixonera", "url": "https://www.idealista.com/inmueble/102092763/"},
    {"id": 6, "titulo": "Piso Canigo Horta", "url": "https://www.idealista.com/inmueble/109762172/"},
    {"id": 7, "titulo": "Atico Conca de Tremp El Carmel", "url": "https://www.idealista.com/inmueble/97013179/"},
    {"id": 8, "titulo": "Piso Encarnacio Baix Guinardo", "url": "https://www.idealista.com/inmueble/110745601/"},
    {"id": 9, "titulo": "Piso Sales i Ferre El Guinardo", "url": "https://www.idealista.com/inmueble/109644970/"},
    {"id": 10, "titulo": "Piso Rosalia de Castro Baix Guinardo", "url": "https://www.idealista.com/inmueble/110035915/"},
    # Gracia
    {"id": 11, "titulo": "Piso Torrent de les Flors Vila Gracia", "url": "https://www.idealista.com/inmueble/103242985/"},
    {"id": 12, "titulo": "Piso Camp dEn Grassot Gracia Nova", "url": "https://www.idealista.com/inmueble/975271/"},
    {"id": 13, "titulo": "Piso Alba Vila de Gracia", "url": "https://www.idealista.com/inmueble/111028538/"},
    {"id": 14, "titulo": "Estudio Corsega Vila Gracia", "url": "https://www.idealista.com/inmueble/111014973/"},
    {"id": 15, "titulo": "Piso Marti Camp dEn Grassot", "url": "https://www.idealista.com/inmueble/110856801/"},
    {"id": 16, "titulo": "Piso Baro de la Barre Vallcarca", "url": "https://www.idealista.com/inmueble/107682071/"},
    {"id": 17, "titulo": "Piso Travesia Sant Antoni Vila Gracia", "url": "https://www.idealista.com/inmueble/110965469/"},
    {"id": 18, "titulo": "Atico Mila Fontanals Vila Gracia", "url": "https://www.idealista.com/inmueble/110244872/"},
    {"id": 19, "titulo": "Atico Vallfogona Vila Gracia", "url": "https://www.idealista.com/inmueble/104919757/"},
    {"id": 20, "titulo": "Piso Ventallo Camp dEn Grassot", "url": "https://www.idealista.com/inmueble/108616562/"},
    # Eixample
    {"id": 21, "titulo": "Piso Paseo Sant Joan Dreta Eixample", "url": "https://www.idealista.com/inmueble/111028345/"},
    {"id": 22, "titulo": "Estudio Tamarit Sant Antoni", "url": "https://www.idealista.com/inmueble/39983410/"},
    {"id": 23, "titulo": "Piso Valencia 54 Nova Esquerra", "url": "https://www.idealista.com/inmueble/104166268/"},
    {"id": 24, "titulo": "Piso Londres Nova Esquerra", "url": "https://www.idealista.com/inmueble/111030635/"},
    {"id": 25, "titulo": "Estudio Sicilia Fort Pienc", "url": "https://www.idealista.com/inmueble/111026753/"},
    {"id": 26, "titulo": "Piso Valencia Nova Esquerra", "url": "https://www.idealista.com/inmueble/111024220/"},
    {"id": 27, "titulo": "Piso Comte Borrell Nova Esquerra", "url": "https://www.idealista.com/inmueble/111020076/"},
    {"id": 28, "titulo": "Piso Casanova Antiga Esquerra", "url": "https://www.idealista.com/inmueble/38321216/"},
    {"id": 29, "titulo": "Piso Consell de Cent Nova Esquerra", "url": "https://www.idealista.com/inmueble/106812019/"},
    {"id": 30, "titulo": "Duplex Fort Pienc", "url": "https://www.idealista.com/inmueble/99284349/"},
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

def load_log():
    try:
        with open(LOG_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_log(data):
    with open(LOG_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def contactar(page, anuncio):
    url = anuncio["url"]
    titulo = anuncio["titulo"]
    logging.info(f"--- Anuncio {anuncio['id']}: {titulo} ---")
    logging.info(f"Navegando a {url}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)

        # Verificar si el anuncio sigue activo
        if page.locator("text=ya no está publicado").count() > 0:
            logging.warning(f"Anuncio {anuncio['id']} ya no esta publicado. Saltando.")
            return {"id": anuncio["id"], "titulo": titulo, "url": url,
                    "status": "skipped", "reason": "anuncio_no_publicado",
                    "timestamp": datetime.now().isoformat()}

        # Buscar textarea del mensaje
        textarea = page.locator("textarea[placeholder*='mensaje'], textarea[name*='message'], textarea.contact-form-textarea, section.contact-form textarea")
        if textarea.count() == 0:
            # Intentar con el boton Contactar primero
            contactar_btn = page.locator("button:has-text('Contactar'), a:has-text('Contactar')")
            if contactar_btn.count() > 0:
                contactar_btn.first.click()
                page.wait_for_timeout(2000)
                textarea = page.locator("textarea")

        if textarea.count() > 0:
            textarea.first.clear()
            textarea.first.fill(MENSAJE)
            logging.info("Mensaje rellenado")
        else:
            logging.warning("No se encontro textarea. Intentando enviar por chat directamente.")

        # Buscar boton "Contactar por chat"
        chat_btn = page.locator("button:has-text('Contactar por chat'), button:has-text('Contactar'), button:has-text('Enviar')")
        if chat_btn.count() > 0:
            chat_btn.first.click()
            logging.info("Boton de contacto pulsado")
            page.wait_for_timeout(3000)

            # Verificar confirmacion
            if page.locator("text=mensaje enviado, text=Mensaje enviado, text=contacto realizado").count() > 0:
                logging.info(f"EXITO: Mensaje enviado para anuncio {anuncio['id']}")
                return {"id": anuncio["id"], "titulo": titulo, "url": url,
                        "status": "OK", "timestamp": datetime.now().isoformat()}
            else:
                logging.info(f"Boton pulsado pero no se confirmo envio para anuncio {anuncio['id']}")
                return {"id": anuncio["id"], "titulo": titulo, "url": url,
                        "status": "sent_unconfirmed", "timestamp": datetime.now().isoformat()}
        else:
            logging.error(f"No se encontro boton de contacto para anuncio {anuncio['id']}")
            return {"id": anuncio["id"], "titulo": titulo, "url": url,
                    "status": "error", "reason": "boton_no_encontrado",
                    "timestamp": datetime.now().isoformat()}

    except Exception as e:
        logging.error(f"Error en anuncio {anuncio['id']}: {e}")
        return {"id": anuncio["id"], "titulo": titulo, "url": url,
                "status": "error", "reason": str(e),
                "timestamp": datetime.now().isoformat()}

def main():
    log_data = load_log()
    already_done = {item["url"] for item in log_data if item.get("status") in ("OK", "sent_unconfirmed")}
    pending = [a for a in ANUNCIOS if a["url"] not in already_done]

    if not pending:
        logging.info("Todos los anuncios ya fueron procesados.")
        print("Todos los anuncios ya fueron procesados. Ver contactar_log.json")
        return

    logging.info(f"Procesando {len(pending)} anuncios pendientes de {len(ANUNCIOS)} totales")

    with sync_playwright() as p:
        if USE_CDP:
            logging.info(f"Conectando a Chrome via CDP: {CDP_URL}")
            browser = p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0] if browser.contexts else browser.new_context()
        else:
            logging.info("Lanzando navegador Chromium")
            browser = p.chromium.launch(headless=HEADLESS)
            context = browser.new_context()

        page = context.new_page()

        ok = 0
        err = 0
        skip = 0

        for i, anuncio in enumerate(pending):
            result = contactar(page, anuncio)
            log_data.append(result)
            save_log(log_data)

            if result["status"] == "OK" or result["status"] == "sent_unconfirmed":
                ok += 1
            elif result["status"] == "skipped":
                skip += 1
            else:
                err += 1

            if i < len(pending) - 1:
                logging.info(f"Esperando {DELAY_SECONDS}s antes del siguiente...")
                time.sleep(DELAY_SECONDS)

        browser.close()

    print(f"\n=== RESUMEN ===")
    print(f"Total procesados: {ok + err + skip}")
    print(f"OK/Enviados: {ok}")
    print(f"Saltados: {skip}")
    print(f"Errores: {err}")
    print(f"Log guardado en: {LOG_FILE}")

if __name__ == "__main__":
    main()
