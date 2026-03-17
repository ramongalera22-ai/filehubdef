import time, random, requests
from bs4 import BeautifulSoup
from database import existe, guardar_trabajo, log

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36"

def get(url):
    try:
        r = requests.get(url, headers={"User-Agent":UA,"Accept-Language":"es-ES,es;q=0.9"}, timeout=15)
        if r.status_code == 200: return BeautifulSoup(r.text,"html.parser")
    except: pass
    return None

def tiene_guardias(txt): return any(p in txt.lower() for p in ["guardia","urgencia","nocturno","noche"])
def es_medico(txt): return any(p in txt.lower() for p in ["médico familia","metge família","atenció primària","atención primaria","mfyc","cap "])

def scrape_ics():
    out = []
    urls = ["https://icsjobs.gencat.cat/oferta-de-feina",
            "https://icsjobs.gencat.cat/oferta-de-feina?especialitat=medicina-familiar"]
    for url in urls:
        s = get(url)
        if not s: continue
        for lnk in s.select("a")[:30]:
            href = lnk.get("href","")
            if not href.startswith("http"): href = "https://icsjobs.gencat.cat" + href
            t = lnk.get_text(strip=True)
            if len(t) < 8 or existe("trabajos", href): continue
            if tiene_guardias(t): continue
            out.append({"platform":"ICS","url":href,"titulo":t,"empresa":"Institut Català de la Salut","contrato":"ICS","guardias":0,"descripcion":t})
        time.sleep(random.uniform(8,15))
    log("info", f"ICS: {len(out)}"); return out

def scrape_camfyc():
    out = []
    for url in ["https://www.camfyc.org/borsa-de-treball/","https://www.camfyc.org/formacio/borsa-de-treball/"]:
        s = get(url)
        if not s: continue
        for lnk in s.select("a[href*='ofert'],a[href*='treball'],a[href*='feina'],a[href*='borsa']")[:20]:
            href = lnk.get("href","")
            if not href.startswith("http"): href = "https://www.camfyc.org" + href
            t = lnk.get_text(strip=True)
            if len(t) < 8 or existe("trabajos", href): continue
            if tiene_guardias(t): continue
            out.append({"platform":"CAMFYC","url":href,"titulo":t,"empresa":"CAMFYC","contrato":"Ver oferta","guardias":0,"descripcion":t})
        time.sleep(random.uniform(8,15))
    log("info", f"CAMFYC: {len(out)}"); return out

def scrape_infojobs():
    out = []
    urls = [
        "https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=medico+familia+barcelona&contractType=",
        "https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=medicina+familiar+barcelona",
    ]
    for url in urls:
        s = get(url)
        if not s: continue
        for o in s.select("li.ij-OfferList-itemWrapper,div.offer-item")[:15]:
            lnk = o.select_one("a.ij-OfferList-item-titleLink,a.job-title")
            if not lnk: continue
            href = lnk.get("href","")
            if not href.startswith("http"): href = "https://www.infojobs.net" + href
            t = lnk.get_text(strip=True); d = o.get_text()[:300]
            emp = (o.select_one(".ij-OfferList-item-company,.company") or {}).get_text("",strip=True) if hasattr(o.select_one(".ij-OfferList-item-company,.company"),"get_text") else ""
            if existe("trabajos", href) or tiene_guardias(t+d): continue
            if not es_medico(t+d): continue
            out.append({"platform":"Infojobs","url":href,"titulo":t,"empresa":emp,"contrato":"Ver","guardias":0,"descripcion":d})
        time.sleep(random.uniform(10,20))
    log("info", f"Infojobs: {len(out)}"); return out

def scrape_medtech():
    out = []
    sources = [
        ("Mediktor","https://mediktor.com/es/trabaja-con-nosotros"),
        ("Atrys Health","https://atryshealth.com/trabaja-con-nosotros"),
        ("Advance Medical","https://www.advancemedical.net/trabaja-con-nosotros"),
        ("DKV","https://www.dkvseguros.com/es/trabaja-con-nosotros"),
    ]
    for empresa, url in sources:
        s = get(url)
        if not s: continue
        for el in s.find_all(string=lambda t: t and any(w in t.lower() for w in ["médico","doctor","clínico","physician"]))[:5]:
            parent = el.parent
            href = parent.get("href", url) if parent.name == "a" else url
            t = el.strip()[:150]
            if len(t) < 5 or existe("trabajos", href): continue
            out.append({"platform":empresa,"url":href,"titulo":t,"empresa":empresa,"contrato":"Empresa MedTech","guardias":0,"descripcion":t})
        time.sleep(random.uniform(8,15))
    log("info", f"MedTech: {len(out)}"); return out

def buscar_trabajos():
    log("info", "💼 Buscando trabajo médico de familia")
    todos = []
    for nombre, fn in [("ICS",scrape_ics),("CAMFYC",scrape_camfyc),
                       ("Infojobs",scrape_infojobs),("MedTech",scrape_medtech)]:
        try:
            for t in fn():
                if guardar_trabajo(t) > 0: todos.append(t)
            time.sleep(random.uniform(15,30))
        except Exception as e: log("error", f"{nombre}: {e}")
    log("info", f"Total trabajos nuevos: {len(todos)}")
    return todos
