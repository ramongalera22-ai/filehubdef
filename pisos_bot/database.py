import sqlite3, json
from datetime import datetime
from pathlib import Path

DB = Path(__file__).parent / "data" / "bot.db"

def init_db():
    DB.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.execute("""CREATE TABLE IF NOT EXISTS pisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT, url TEXT UNIQUE, titulo TEXT,
        precio INTEGER, barrio TEXT, descripcion TEXT,
        contacto TEXT, amueblado INTEGER DEFAULT 0,
        contactado INTEGER DEFAULT 0,
        fecha TEXT, fecha_contacto TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS trabajos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT, url TEXT UNIQUE, titulo TEXT,
        empresa TEXT, contrato TEXT, guardias INTEGER DEFAULT 0,
        descripcion TEXT, aplicado INTEGER DEFAULT 0, fecha TEXT)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT, msg TEXT, fecha TEXT)""")
    conn.commit(); conn.close()

def existe(tabla, url):
    conn = sqlite3.connect(DB)
    r = conn.execute(f"SELECT id FROM {tabla} WHERE url=?", (url,)).fetchone()
    conn.close(); return r is not None

def guardar_piso(d):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO pisos
            (platform,url,titulo,precio,barrio,descripcion,contacto,amueblado,fecha)
            VALUES (?,?,?,?,?,?,?,?,?)""",
            (d.get("platform"),d.get("url"),d.get("titulo"),d.get("precio"),
             d.get("barrio"),d.get("descripcion","")[:400],d.get("contacto",""),
             d.get("amueblado",0),datetime.now().isoformat()))
        conn.commit()
        return cur.lastrowid
    except sqlite3.IntegrityError:
        return -1
    finally:
        conn.close()

def marcar_contactado(url):
    conn = sqlite3.connect(DB)
    conn.execute("UPDATE pisos SET contactado=1, fecha_contacto=? WHERE url=?",
                 (datetime.now().isoformat(), url))
    conn.commit(); conn.close()

def guardar_trabajo(d):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO trabajos
            (platform,url,titulo,empresa,contrato,guardias,descripcion,fecha)
            VALUES (?,?,?,?,?,?,?,?)""",
            (d.get("platform"),d.get("url"),d.get("titulo"),d.get("empresa",""),
             d.get("contrato",""),d.get("guardias",0),
             d.get("descripcion","")[:400],datetime.now().isoformat()))
        conn.commit()
        return cur.lastrowid
    except sqlite3.IntegrityError:
        return -1
    finally:
        conn.close()

def log(tipo, msg):
    conn = sqlite3.connect(DB)
    conn.execute("INSERT INTO log (tipo,msg,fecha) VALUES (?,?,?)",
                 (tipo, msg, datetime.now().isoformat()))
    conn.commit(); conn.close()
    print(f"[{datetime.now().strftime('%H:%M:%S')}][{tipo.upper()}] {msg}")

def exportar():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    pisos    = [dict(r) for r in conn.execute("SELECT * FROM pisos ORDER BY fecha DESC LIMIT 200")]
    trabajos = [dict(r) for r in conn.execute("SELECT * FROM trabajos ORDER BY fecha DESC LIMIT 100")]
    logs     = [dict(r) for r in conn.execute("SELECT * FROM log ORDER BY fecha DESC LIMIT 100")]
    conn.close()
    return {
        "pisos": pisos, "trabajos": trabajos, "logs": logs,
        "stats": {
            "pisos_total": len(pisos),
            "pisos_contactados": sum(1 for p in pisos if p["contactado"]),
            "trabajos_total": len(trabajos),
            "ultima_actualizacion": datetime.now().isoformat()
        }
    }
