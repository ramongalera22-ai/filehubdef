import re, time, random, requests
from bs4 import BeautifulSoup
from database import existe, guardar_piso, log

HEADERS_LIST = [
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    },
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9",
        "Connection": "keep-alive",
    }
]

def precio(txt):
    for n in re.findall(r'\d[\d\.]*', (txt or "").replace(',','.')):
        try:
            p = int(float(n.replace('.','')))
            if 300 < p < 5000: return p
        except: pass
    return 0

def amueblado(txt):
    return any(p in txt.lower() for p in ["amueblado","furnished","moblat","mobilat"])

def get_session():
    s = requests.Session()
    h = random.choice(HEADERS_LIST)
    s.headers.update(h)
    # Visitar home primero para obtener cookies
    try:
        s.get("https://www.idealista.com/", timeout=10)
        time.sleep(random.uniform(2, 4))
    except: pass
    return s

def scrape_idealista(max_paginas=5):
    out = []
    session = get_session()
    base = f"https://www.idealista.com/alquiler-viviendas/barcelona-barcelona/lista.htm?precio-hasta=1200&ordenado-por=fecha-publicacion-desc"

    for pagina in range(1, max_paginas + 1):
        url = base if pagina == 1 else base.replace("lista.htm", f"pagina-{pagina}.htm")
        log("scraping", f"Idealista (requests) pág {pagina}")
        try:
            r = session.get(url, timeout=15)
            if r.status_code != 200:
                log("warning", f"Idealista HTTP {r.status_code}")
                break
            soup = BeautifulSoup(r.text, "html.parser")
            # Comprobar si es página de bloqueo
            if "captcha" in r.text.lower() or len(soup.select("article")) == 0:
                log("warning", "Idealista bloqueó — intentando con RSS")
                out += scrape_idealista_rss()
                break

            for a in soup.select("article.item"):
                try:
                    lnk = a.select_one("a.item-link")
                    if not lnk: continue
                    href = "https://www.idealista.com" + lnk.get("href","")
                    if existe("pisos", href): continue
                    t  = lnk.get("title","").strip()
                    pr = precio((a.select_one(".item-price") or {}).get_text(""))
                    b  = (a.select_one(".item-detail-char .txt-highlight") or {}).get_text("").strip()
                    d  = (a.select_one(".item-description") or {}).get_text("").strip()
                    if pr > 1200 or pr == 0: continue
                    if amueblado(t+d): continue
                    out.append({"platform":"idealista","url":href,"titulo":t,
                                "precio":pr,"barrio":b,"descripcion":d[:400]})
                    time.sleep(random.uniform(18, 25))
                except: pass

        except Exception as e:
            log("error", f"Idealista requests: {e}")
            break

        time.sleep(random.uniform(8, 15))

    log("info", f"Idealista: {len(out)} nuevos")
    return out

def scrape_idealista_rss():
    """Fallback: RSS feed de Idealista"""
    out = []
    url = "https://www.idealista.com/rss/alquiler-viviendas/barcelona-barcelona/?precio-hasta=1200"
    try:
        r = requests.get(url, headers=random.choice(HEADERS_LIST), timeout=10)
        soup = BeautifulSoup(r.text, "xml")
        for item in soup.select("item")[:30]:
            try:
                href  = item.find("link").text if item.find("link") else ""
                titulo = item.find("title").text if item.find("title") else ""
                desc  = item.find("description").text if item.find("description") else ""
                pr    = precio(desc)
                if not href or existe("pisos", href): continue
                if amueblado(titulo+desc): continue
                out.append({"platform":"idealista_rss","url":href,"titulo":titulo,
                            "precio":pr,"barrio":"Barcelona","descripcion":desc[:400]})
            except: pass
    except Exception as e:
        log("error", f"Idealista RSS: {e}")
    log("info", f"Idealista RSS: {len(out)} nuevos")
    return out
