import smtplib, subprocess, json, requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import EMAIL_FROM, EMAIL_PASSWORD, EMAIL_SMTP, EMAIL_PORT, WHATSAPP_TO, MENSAJE_CASERO
from database import marcar_contactado, log

# ── WhatsApp via OpenClaw (tu bot existente) ──────────────
def enviar_whatsapp(texto):
    """Usa el bot de WhatsApp ya conectado en OpenClaw"""
    try:
        # Método 1: OpenClaw CLI (el que ya funciona)
        r = subprocess.run(
            ["openclaw", "message", "send",
             "--target", WHATSAPP_TO,
             "--message", texto[:4000]],
            capture_output=True, text=True, timeout=20
        )
        if r.returncode == 0:
            log("whatsapp", "✅ WhatsApp enviado via OpenClaw CLI")
            return True
        log("warning", f"CLI falló: {r.stderr[:100]}, intentando API...")

        # Método 2: OpenClaw API local (fallback)
        r2 = requests.post(
            "http://127.0.0.1:18789/api/message/send",
            json={"target": WHATSAPP_TO, "message": texto[:4000]},
            timeout=10
        )
        if r2.status_code == 200:
            log("whatsapp", "✅ WhatsApp enviado via API local")
            return True

        log("error", f"WhatsApp falló: {r2.status_code}")
        return False

    except Exception as e:
        log("error", f"WhatsApp error: {e}")
        return False

# ── Email ─────────────────────────────────────────────────
def enviar_email(dest, asunto, cuerpo):
    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_FROM
        msg["To"]   = dest
        msg["Subject"] = asunto
        msg.attach(MIMEText(cuerpo, "plain", "utf-8"))
        with smtplib.SMTP(EMAIL_SMTP, EMAIL_PORT) as s:
            s.starttls()
            s.login(EMAIL_FROM, EMAIL_PASSWORD)
            s.sendmail(EMAIL_FROM, dest, msg.as_string())
        log("email", f"✅ Email enviado a {dest}")
        return True
    except Exception as e:
        log("error", f"Email: {e}")
        return False

# ── Contactar casero ──────────────────────────────────────
def contactar_casero(piso):
    contacto = piso.get("contacto","")
    titulo   = piso.get("titulo","piso")
    if "@" in contacto:
        ok = enviar_email(contacto, f"Interesados en su vivienda - {titulo}", MENSAJE_CASERO)
        if ok: marcar_contactado(piso["url"])
        return ok
    marcar_contactado(piso["url"])
    return False

# ── Alertas WhatsApp ──────────────────────────────────────
def alerta_pisos(pisos):
    if not pisos: return
    msg = f"🏠 *{len(pisos)} PISOS NUEVOS* Barcelona <1200€\n\n"
    for p in pisos[:6]:
        msg += (f"📍 {p.get('titulo','?')[:35]}\n"
                f"💶 {p.get('precio','?')}€ | {p.get('barrio','?')}\n"
                f"🌐 {p.get('platform','?').upper()}\n"
                f"🔗 {p.get('url','')[:50]}\n\n")
    if len(pisos) > 6:
        msg += f"_...y {len(pisos)-6} más. Ver dashboard._"
    enviar_whatsapp(msg)
    enviar_email(EMAIL_FROM, f"🏠 {len(pisos)} pisos nuevos Barcelona", msg.replace("*",""))

def alerta_trabajos(trabajos):
    if not trabajos: return
    msg = f"💼 *{len(trabajos)} TRABAJOS NUEVOS* Médico Familia BCN\n\n"
    for t in trabajos[:5]:
        msg += (f"🏥 {t.get('titulo','?')[:35]}\n"
                f"🏢 {t.get('empresa','?')}\n"
                f"🔗 {t.get('url','')[:50]}\n\n")
    enviar_whatsapp(msg)
    enviar_email(EMAIL_FROM, f"💼 {len(trabajos)} trabajos médicos nuevos", msg.replace("*",""))
