import re, time, random
from bs4 import BeautifulSoup
from brave_driver import crear_driver, pausa, pausa_pagina, ir_a, aceptar_cookies
from config import PRECIO_MAXIMO, PALABRAS_EXCLUIR
from database import existe, guardar_piso, log

def soup(d): return BeautifulSoup(d.page_source, "html.parser")

def precio(txt):
    for n in re.findall(r'\d[\d\.]*', (txt or "").replace(',','.')):
        try:
            p = int(float(n.replace('.','')))
            if 300 < p < 5000: return p
        except: pass
    return 0

def amueblado(txt):
    return any(p in txt.lower() for p in PALABRAS_EXCLUIR)

def txt(el): return el.get_text(" ", strip=True) if el else ""

# ── Idealista ─────────────────────────────────────────────
def idealista(driver, pages=4):
    out = []
    base = f"https://www.idealista.com/alquiler-viviendas/barcelona-barcelona/lista.htm?precio-hasta={PRECIO_MAXIMO}&ordenado-por=fecha-publicacion-desc"
    for p in range(1, pages+1):
        url = base if p==1 else base.replace("lista.htm", f"pagina-{p}.htm")
        if not ir_a(driver, url, "article.item"): break
        aceptar_cookies(driver)
        for a in soup(driver).select("article.item"):
            try:
                lnk = a.select_one("a.item-link")
                if not lnk: continue
                href = "https://www.idealista.com" + lnk.get("href","")
                if existe("pisos", href): continue
                t = lnk.get("title",""); pr = precio(txt(a.select_one(".item-price")))
                b = txt(a.select_one(".item-detail-char .txt-highlight"))
                d = txt(a.select_one(".item-description"))
                if pr > PRECIO_MAXIMO or pr == 0: continue
                if amueblado(t+d): continue
                out.append({"platform":"idealista","url":href,"titulo":t,"precio":pr,"barrio":b,"descripcion":d[:400]})
                pausa()
            except: pass
        pausa_pagina()
    log("info", f"Idealista: {len(out)} nuevos"); return out

# ── Fotocasa ──────────────────────────────────────────────
def fotocasa(driver, pages=4):
    out = []
    for p in range(1, pages+1):
        url = f"https://www.fotocasa.es/es/alquiler/viviendas/barcelona-capital/todas-las-zonas/l/?maxPrice={PRECIO_MAXIMO}&sortType=publicationDate&page={p}"
        if not ir_a(driver, url, "article"): break
        aceptar_cookies(driver)
        for a in soup(driver).select("article"):
            try:
                lnk = a.select_one("a[href*='/es/alquiler/']")
                if not lnk: continue
                href = "https://www.fotocasa.es" + lnk.get("href","")
                if existe("pisos", href): continue
                t  = txt(a.select_one("span.re-CardTitle,h3"))
                pr = precio(txt(a.select_one("span.re-CardPrice,.price")))
                b  = txt(a.select_one("span.re-CardLocation,.location"))
                d  = txt(a.select_one("p.re-CardDescription"))
                if pr > PRECIO_MAXIMO or pr == 0: continue
                if amueblado(t+d): continue
                out.append({"platform":"fotocasa","url":href,"titulo":t,"precio":pr,"barrio":b,"descripcion":d[:400]})
                pausa()
            except: pass
        pausa_pagina()
    log("info", f"Fotocasa: {len(out)} nuevos"); return out

# ── Habitaclia ────────────────────────────────────────────
def habitaclia(driver, pages=3):
    out = []
    for p in range(1, pages+1):
        url = f"https://www.habitaclia.com/alquiler-en-barcelona.htm?precio={PRECIO_MAXIMO}&or=3&pg={p}"
        if not ir_a(driver, url): break
        aceptar_cookies(driver)
        for a in soup(driver).select("article,div.anuncio,li.anuncio"):
            try:
                lnk = a.select_one("a[href*='alquiler']")
                if not lnk: continue
                href = lnk.get("href","")
                if not href.startswith("http"): href = "https://www.habitaclia.com" + href
                if existe("pisos", href): continue
                t  = txt(a.select_one("h2,h3,.title"))
                pr = precio(txt(a.select_one(".precio,.price")))
                b  = txt(a.select_one(".zona,.location"))
                if pr > PRECIO_MAXIMO or pr == 0: continue
                if amueblado(t): continue
                out.append({"platform":"habitaclia","url":href,"titulo":t,"precio":pr,"barrio":b,"descripcion":""})
                pausa()
            except: pass
        pausa_pagina()
    log("info", f"Habitaclia: {len(out)} nuevos"); return out

# ── Milanuncios ───────────────────────────────────────────
def milanuncios(driver, pages=3):
    out = []
    for p in range(1, pages+1):
        url = f"https://www.milanuncios.com/pisos-en-alquiler-en-barcelona/?pricemin=0&pricemax={PRECIO_MAXIMO}&pagina={p}"
        if not ir_a(driver, url, "article.ma-AdCard"): break
        aceptar_cookies(driver)
        for a in soup(driver).select("article.ma-AdCard"):
            try:
                lnk = a.select_one("a.ma-AdCard-titleLink")
                if not lnk: continue
                href = "https://www.milanuncios.com" + lnk.get("href","")
                if existe("pisos", href): continue
                t  = lnk.get_text(strip=True)
                pr = precio(txt(a.select_one("span.ma-AdPrice-value")))
                b  = txt(a.select_one("span.ma-AdLocation-text"))
                d  = txt(a.select_one("p.ma-AdCard-description"))
                if pr > PRECIO_MAXIMO or pr == 0: continue
                if amueblado(t+d): continue
                out.append({"platform":"milanuncios","url":href,"titulo":t,"precio":pr,"barrio":b,"descripcion":d[:400]})
                pausa()
            except: pass
        pausa_pagina()
    log("info", f"Milanuncios: {len(out)} nuevos"); return out

# ── Pisos.com ─────────────────────────────────────────────
def pisoscom(driver, pages=3):
    out = []
    for p in range(1, pages+1):
        url = f"https://www.pisos.com/alquiler/pisos-barcelona/?precio=0_{PRECIO_MAXIMO}&pg={p}"
        if not ir_a(driver, url): break
        aceptar_cookies(driver)
        for a in soup(driver).select("div.ad-preview,article.property"):
            try:
                lnk = a.select_one("a.ad-preview__title,a.property-title,h2 a")
                if not lnk: continue
                href = lnk.get("href","")
                if not href.startswith("http"): href = "https://www.pisos.com" + href
                if existe("pisos", href): continue
                t  = lnk.get_text(strip=True)
                pr = precio(txt(a.select_one(".ad-preview__price,.price")))
                b  = txt(a.select_one(".ad-preview__location,.location"))
                if pr > PRECIO_MAXIMO or pr == 0: continue
                if amueblado(t): continue
                out.append({"platform":"pisoscom","url":href,"titulo":t,"precio":pr,"barrio":b,"descripcion":""})
                pausa()
            except: pass
        pausa_pagina()
    log("info", f"Pisos.com: {len(out)} nuevos"); return out

# ── PRINCIPAL ─────────────────────────────────────────────
def buscar_pisos():
    log("info", "🦁 Brave iniciado — buscando pisos")
    driver = crear_driver(headless=True)
    todos  = []
    for nombre, fn in [("Idealista",idealista),("Fotocasa",fotocasa),
                       ("Habitaclia",habitaclia),("Milanuncios",milanuncios),("Pisos.com",pisoscom)]:
        try:
            log("info", f"── {nombre}")
            for p in fn(driver):
                if guardar_piso(p) > 0: todos.append(p)
            time.sleep(random.uniform(20,40))
        except Exception as e: log("error", f"{nombre}: {e}")
    driver.quit()
    log("info", f"Total pisos nuevos: {len(todos)}")
    return todos

# ── Reemplazar función idealista con versión requests ────
from scraper_idealista import scrape_idealista as idealista_requests

def buscar_pisos():
    log("info", "Iniciando búsqueda de pisos")
    from brave_driver import crear_driver
    driver = crear_driver(headless=True)
    todos  = []

    # Idealista con requests (anti-Cloudflare)
    try:
        log("info", "── Idealista (requests)")
        for p in idealista_requests():
            if guardar_piso(p) > 0: todos.append(p)
        import time, random
        time.sleep(random.uniform(15, 25))
    except Exception as e:
        log("error", f"Idealista: {e}")

    # Resto con Chrome
    for nombre, fn in [("Fotocasa",fotocasa),("Habitaclia",habitaclia),
                       ("Milanuncios",milanuncios),("Pisos.com",pisoscom)]:
        try:
            log("info", f"── {nombre}")
            import time, random
            for p in fn(driver):
                if guardar_piso(p) > 0: todos.append(p)
            time.sleep(random.uniform(20, 35))
        except Exception as e:
            log("error", f"{nombre}: {e}")

    driver.quit()
    log("info", f"Total pisos nuevos: {len(todos)}")
    return todos
