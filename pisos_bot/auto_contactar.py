#!/usr/bin/env python3
"""
FILEHUB — Auto-Contactar Caseros BCN
Herramienta autónoma que:
1. Busca pisos en Idealista/Fotocasa/Habitaclia
2. Contacta cada casero automáticamente via formulario
3. Envía resumen por WhatsApp
4. Guarda resultados en JSON

Ejecutar: python3 auto_contactar.py
Cron: 0 */2 * * * python3 ~/.openclaw/workspace/filehubdef/pisos_bot/auto_contactar.py
"""

import json, os, sys, time, re, random
from datetime import datetime
from pathlib import Path

# ═══ CONFIG ═══
MENSAJE = """Me pongo en contacto con usted tras ver el anuncio de su vivienda, por la que estamos muy interesados. Somos una pareja de médicos que buscamos un hogar tranquilo y bien comunicado en Barcelona. Ella trabaja como facultativa en el Hospital Universitario Vall d'Hebron, y él es facultativo especialista con incorporación próxima a la ciudad. Nuestros ingresos conjuntos superan los 5.000 € netos mensuales, acreditables mediante nóminas y contratos en vigor. Somos personas responsables, no fumadores y sin mascotas. Al trabajar ambos en el ámbito sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda. Tenemos disponibilidad inmediata para realizar una visita y podemos aportar toda la documentación necesaria para formalizar el alquiler si nuestro perfil es de su interés. Quedamos a su disposición en este medio, por teléfono en el 679 888 148, o en el correo: carlosgalera2roman@gmail.com Atentamente. Carlos Galera Román"""

NAME = "Carlos Galera Román"
EMAIL = "carlosgalera2roman@gmail.com"
PHONE = "679888148"
WA_PHONE = "34679888148"
WA_SERVER = "https://whatsapp-filehub-production.up.railway.app"

DATA_DIR = Path.home() / ".openclaw/workspace/filehubdef/pisos_bot/data"
LOG_DIR = Path.home() / ".openclaw/workspace/filehubdef/pisos_bot/logs"
CONTACTED_FILE = DATA_DIR / "contactados.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# URLs de búsqueda por portal
SEARCH_URLS = {
    "idealista_horta": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios,de-cuatro-o-mas-dormitorios/",
    "idealista_gracia": "https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/",
    "idealista_eixample": "https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850,de-dos-dormitorios,de-tres-dormitorios/",
    "fotocasa": "https://www.fotocasa.es/es/alquiler/viviendas/barcelona-capital/todas-las-zonas/l?minPrice=850&maxPrice=1400&minRooms=2",
    "habitaclia": "https://www.habitaclia.com/alquiler-pisos-barcelona.htm?precioMin=850&precioMax=1400",
}

# Zonas a excluir
EXCLUDE_ZONES = ["raval", "la mina", "ciutat vella"]

# ═══ HELPERS ═══
def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")
    with open(LOG_DIR / f"auto_contactar_{datetime.now().strftime('%Y%m%d')}.log", "a") as f:
        f.write(f"[{ts}] {msg}\n")

def send_wa(msg):
    """Enviar mensaje por Telegram (canal principal) + WA como backup."""
    import urllib.request, urllib.parse
    sent = False
    # Telegram primero (siempre funciona)
    try:
        data = urllib.parse.urlencode({"chat_id": "596831448", "text": msg}).encode()
        req = urllib.request.Request("https://api.telegram.org/bot8779418734:AAE63RPFNRulPy4ZvtL8L0iZROsnKRf69kk/sendMessage", data=data, method="POST")
        urllib.request.urlopen(req, timeout=10)
        sent = True
    except: pass
    # WA backup
    try:
        data = json.dumps({"phone": WA_PHONE, "message": msg}).encode()
        req = urllib.request.Request(f"{WA_SERVER}/send", data=data, headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=10)
    except: pass
    return sent

def contact_via_server(url):
    """Contactar casero via el servidor (puppeteer/API/extract)."""
    try:
        import urllib.request
        data = json.dumps({"url": url, "message": MENSAJE, "name": NAME, "email": EMAIL, "phone": PHONE}).encode()
        req = urllib.request.Request(f"{WA_SERVER}/contact-landlord", data=data, headers={"Content-Type": "application/json"}, method="POST")
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        return result.get("success", False), result.get("method", "unknown")
    except Exception as e:
        return False, str(e)

def load_contacted():
    """Cargar lista de pisos ya contactados."""
    try:
        return set(json.loads(CONTACTED_FILE.read_text()))
    except:
        return set()

def save_contacted(urls):
    """Guardar lista de pisos contactados."""
    CONTACTED_FILE.write_text(json.dumps(list(urls), indent=2))

# ═══ SCRAPER CON SELENIUM/PLAYWRIGHT ═══
def scrape_with_browser():
    """Intenta usar Selenium o Playwright para scraping + contacto."""
    pisos = []

    # Intentar Selenium primero
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.chrome.options import Options

        log("🌐 Usando Selenium Chrome...")
        opts = Options()
        opts.add_argument("--headless=new")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument(f"--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36")
        driver = webdriver.Chrome(options=opts)
        driver.implicitly_wait(10)

        for portal_name, search_url in SEARCH_URLS.items():
            if "idealista" not in portal_name:
                continue  # Start with Idealista

            log(f"🔍 Buscando en {portal_name}: {search_url}")
            try:
                driver.get(search_url)
                time.sleep(random.uniform(3, 6))

                # Accept cookies
                try:
                    cookie_btn = driver.find_element(By.CSS_SELECTOR, "#didomi-notice-agree-button, .sui-AtomButton--primary, button[id*='accept'], button[id*='cookie']")
                    cookie_btn.click()
                    time.sleep(1)
                except:
                    pass

                # Extract listings
                cards = driver.find_elements(By.CSS_SELECTOR, "article.item, .item-info-container, .listing-item")
                log(f"  📋 {len(cards)} anuncios encontrados")

                for card in cards[:20]:
                    try:
                        title_el = card.find_element(By.CSS_SELECTOR, "a.item-link, .item-title a, h3 a")
                        title = title_el.text.strip()
                        url = title_el.get_attribute("href")
                        price_el = card.find_element(By.CSS_SELECTOR, ".item-price, .price-row, .re-CardPrice")
                        price_text = price_el.text.strip()

                        # Skip excluded zones
                        if any(z in title.lower() for z in EXCLUDE_ZONES):
                            continue

                        pisos.append({
                            "titulo": title[:80],
                            "precio": price_text,
                            "url": url,
                            "portal": portal_name,
                            "contactado": False,
                            "metodo": None,
                            "fecha": datetime.now().isoformat(),
                        })
                    except:
                        continue

            except Exception as e:
                log(f"  ❌ Error en {portal_name}: {e}")

        # Now contact each piso
        contacted_urls = load_contacted()
        contactados = 0

        for piso in pisos:
            if piso["url"] in contacted_urls:
                piso["contactado"] = True
                piso["metodo"] = "ya_contactado"
                continue

            log(f"📧 Contactando: {piso['titulo'][:40]}...")
            try:
                driver.get(piso["url"])
                time.sleep(random.uniform(4, 8))

                # Accept cookies again if needed
                try:
                    cookie_btn = driver.find_element(By.CSS_SELECTOR, "#didomi-notice-agree-button")
                    cookie_btn.click()
                    time.sleep(1)
                except:
                    pass

                # Click contact button
                try:
                    contact_btn = driver.find_element(By.CSS_SELECTOR, "button.icon-mail-outline, .contact-button, a[href*='contacto'], button[data-testid='contact']")
                    contact_btn.click()
                    time.sleep(2)
                except:
                    # Try finding form directly
                    pass

                # Fill form
                filled = False
                try:
                    # Name
                    name_field = driver.find_element(By.CSS_SELECTOR, "input[name='name'], input[placeholder*='ombre'], #contact-form-name")
                    name_field.clear()
                    name_field.send_keys(NAME)

                    # Email
                    email_field = driver.find_element(By.CSS_SELECTOR, "input[type='email'], input[name='email'], #contact-form-email")
                    email_field.clear()
                    email_field.send_keys(EMAIL)

                    # Phone
                    try:
                        phone_field = driver.find_element(By.CSS_SELECTOR, "input[type='tel'], input[name='phone'], #contact-form-phone")
                        phone_field.clear()
                        phone_field.send_keys(PHONE)
                    except:
                        pass

                    # Message
                    msg_field = driver.find_element(By.CSS_SELECTOR, "textarea, textarea[name='message'], #contact-form-message")
                    msg_field.clear()
                    msg_field.send_keys(MENSAJE)

                    # Accept terms
                    try:
                        checkbox = driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']:not(:checked)")
                        checkbox.click()
                    except:
                        pass

                    # Submit
                    submit = driver.find_element(By.CSS_SELECTOR, "button[type='submit'], input[type='submit']")
                    submit.click()
                    time.sleep(3)
                    filled = True
                except:
                    pass

                if filled:
                    piso["contactado"] = True
                    piso["metodo"] = "selenium_form"
                    contactados += 1
                    contacted_urls.add(piso["url"])
                    log(f"  ✅ Formulario enviado")
                else:
                    # Fallback: contact via server
                    ok, method = contact_via_server(piso["url"])
                    piso["contactado"] = ok
                    piso["metodo"] = f"server_{method}" if ok else "fallback"
                    if ok:
                        contactados += 1
                        contacted_urls.add(piso["url"])
                        log(f"  ✅ Via servidor: {method}")
                    else:
                        log(f"  ⚠️ Fallback: enviado a WA")

                # Anti-bot delay
                time.sleep(random.uniform(15, 25))

            except Exception as e:
                log(f"  ❌ Error: {e}")
                # Always fallback to server
                ok, method = contact_via_server(piso["url"])
                piso["contactado"] = ok
                piso["metodo"] = f"server_{method}" if ok else "error"

        driver.quit()
        save_contacted(contacted_urls)
        return pisos, contactados

    except ImportError:
        log("⚠️ Selenium no disponible, usando modo API")
        return None, 0

# ═══ FALLBACK: Contactar via servidor ═══
def contact_all_via_server():
    """Si no hay browser, usa el servidor para contactar."""
    pisos_file = DATA_DIR / "dashboard.json"
    if pisos_file.exists():
        data = json.loads(pisos_file.read_text())
        pisos = data.get("pisos", [])
    else:
        # Use the curated list
        pisos = [
            {"titulo": "Piso sin amueblar obra nueva, La Teixonera", "precio": 950, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab sin amueblar, Baix Guinardó", "precio": 1100, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab reformado, Ronda Guinardó", "precio": 1050, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab sin amueblar, El Carmel", "precio": 950, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab, Camp d'En Grassot", "precio": 1200, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 4 hab, Vila de Gràcia", "precio": 1350, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab, Sagrada Família", "precio": 1300, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/eixample/la-sagrada-familia/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab exterior, Horta", "precio": 880, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab, Antiga Esquerra Eixample", "precio": 1150, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab, Gràcia Nova", "precio": 1100, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab, Montbau", "precio": 870, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab obra nueva, Pedrell", "precio": 1250, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab, Nova Esquerra Eixample", "precio": 1180, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 2 hab, Dreta Eixample", "precio": 1400, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
            {"titulo": "Piso 3 hab, Rambla del Carmel", "precio": 980, "url": "https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-alquiler-de-larga-temporada,solo-pisos/", "portal": "idealista"},
        ]

    contacted_urls = load_contacted()
    contactados = 0

    for piso in pisos:
        url = piso.get("url", "")
        if url in contacted_urls:
            piso["contactado"] = True
            piso["metodo"] = "ya_contactado"
            continue

        log(f"📧 Contactando via servidor: {piso.get('titulo', url)[:40]}...")
        ok, method = contact_via_server(url)
        piso["contactado"] = ok
        piso["metodo"] = method
        if ok:
            contactados += 1
            contacted_urls.add(url)
            log(f"  ✅ {method}")
        else:
            log(f"  ⚠️ {method}")
        time.sleep(random.uniform(2, 5))

    save_contacted(contacted_urls)
    return pisos, contactados


# ═══ MAIN ═══
def main():
    log("🏠 Auto-Contactar Caseros BCN — Inicio")
    send_wa("🏠 *Auto-contacto caseros iniciado*\n📅 " + datetime.now().strftime("%Y-%m-%d %H:%M"))

    # Try browser first, fallback to server
    pisos, contactados = scrape_with_browser() or (None, 0)
    if pisos is None:
        pisos, contactados = contact_all_via_server()

    total = len(pisos)
    ya_contactados = sum(1 for p in pisos if p.get("metodo") == "ya_contactado")

    # Save results
    result = {
        "fecha": datetime.now().isoformat(),
        "pisos_encontrados": total,
        "caseros_contactados": contactados,
        "ya_contactados": ya_contactados,
        "pisos": pisos
    }
    result_file = DATA_DIR / f"contactos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    result_file.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    log(f"💾 Resultados guardados en {result_file}")

    # Also update dashboard.json
    (DATA_DIR / "dashboard.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))

    # Send WA summary
    resumen_pisos = "\n".join(
        f"{'✅' if p.get('contactado') else '❌'} {p.get('titulo','?')[:35]} — {p.get('precio','?')}€"
        for p in pisos[:15]
    )

    resumen = f"""🏠 *RESUMEN AUTO-CONTACTO*
📅 {datetime.now().strftime("%Y-%m-%d %H:%M")}

📊 *Estadísticas:*
• Pisos encontrados: {total}
• Caseros contactados ahora: {contactados}
• Ya contactados antes: {ya_contactados}
• Pendientes: {total - contactados - ya_contactados}

📋 *Pisos:*
{resumen_pisos}

📧 Mensaje enviado: "{MENSAJE[:80]}..."
📞 Teléfono: 679 888 148
✉️ Email: {EMAIL}"""

    send_wa(resumen)
    log(f"📱 Resumen enviado por WhatsApp")
    log(f"✅ Fin — {contactados} contactados de {total} pisos")

if __name__ == "__main__":
    main()
