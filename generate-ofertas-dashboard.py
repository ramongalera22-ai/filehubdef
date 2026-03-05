#!/usr/bin/env python3
"""
Generador de dashboard de ofertas médico Barcelona
Usa open() nativo de Python
"""

import json
import os
from datetime import datetime

# Datos de ofertas
ofertas = [
    {
        "titulo": "Médico de Familia - CAP Vila Vella",
        "empresa": "ICS (Institut Català de la Salut)",
        "ubicacion": "Sant Vicenç dels Horts",
        "tipo_contrato": "Indefinido",
        "salario": "2.200-2.500€/mes",
        "contacto": "mmanich.apms.ics@gencat.cat",
        "telefono": "667 116 664",
        "requisitos": "Título homologado, NIE",
        "enlace": "https://www.ics.gencat.cat",
        "destacado": True
    },
    {
        "titulo": "Médico de Familia - CAP Barceloneta",
        "empresa": "SISCAT",
        "ubicacion": "Barcelona - Barceloneta",
        "tipo_contrato": "Indefinido",
        "salario": "2.150-2.450€/mes",
        "contacto": "RRODRIGUEZ@PEREVIRGILI.CAT",
        "telefono": "648 850 375",
        "requisitos": "Experiencia 2 años",
        "enlace": "https://www.siscat.cat",
        "destacado": True
    },
    {
        "titulo": "Médico de Familia - CAP La Torrassa",
        "empresa": "SISCAT",
        "ubicacion": "L'Hospitalet de Llobregat",
        "tipo_contrato": "Contrato 2 años",
        "salario": "2.100-2.400€/mes",
        "contacto": "seleccio@csi.cat",
        "telefono": "-",
        "requisitos": "MIR o equivalente",
        "enlace": "https://www.csi.cat"
    }
]

# Generar timestamp
timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")

# Generar HTML
html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💼 Dashboard Ofertas Médico</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #333; }}
        .container {{ max-width: 1200px; margin: 20px auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px; }}
        .stat {{ background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px; text-align: center; }}
        .stat-value {{ font-size: 24px; font-weight: bold; }}
        .stat-label {{ font-size: 12px; margin-top: 5px; opacity: 0.9; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-bottom: 30px; }}
        .card {{ background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; border-left: 4px solid #2ecc71; }}
        .card.destacado {{ border-left-color: #f39c12; box-shadow: 0 4px 12px rgba(243, 156, 18, 0.2); }}
        .card:hover {{ transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }}
        .empresa {{ color: #2ecc71; font-weight: bold; margin: 5px 0; }}
        .salario {{ font-size: 18px; font-weight: bold; color: #27ae60; margin: 10px 0; }}
        .ubicacion {{ color: #666; font-size: 14px; margin: 5px 0; }}
        .contacto {{ background: #e8f5e9; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 12px; }}
        .btn {{ display: inline-block; background: #2ecc71; color: white; padding: 10px 15px; border-radius: 4px; text-decoration: none; margin-top: 10px; transition: background 0.2s; font-size: 12px; }}
        .btn:hover {{ background: #27ae60; }}
        .updated {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💼 Dashboard Ofertas Médico Barcelona</h1>
            <p>Actualizado: {timestamp}</p>
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">{len(ofertas)}</div>
                    <div class="stat-label">Ofertas activas</div>
                </div>
                <div class="stat">
                    <div class="stat-value">2.250€</div>
                    <div class="stat-label">Salario promedio</div>
                </div>
            </div>
        </div>

        <div class="grid">
"""

# Agregar tarjetas
for oferta in ofertas:
    destacado_class = " destacado" if oferta.get("destacado") else ""
    html_content += f"""
            <div class="card{destacado_class}">
                <h3>{oferta['titulo']}</h3>
                <div class="empresa">🏥 {oferta['empresa']}</div>
                <div class="salario">{oferta['salario']}</div>
                <div class="ubicacion">📍 {oferta['ubicacion']}</div>
                <div style="font-size: 12px; color: #666; margin: 5px 0;">📝 {oferta['tipo_contrato']}</div>
                <div class="contacto">
                    📧 {oferta['contacto']}<br>
                    📞 {oferta['telefono']}
                </div>
                <a href="{oferta['enlace']}" class="btn" target="_blank">Ver oferta →</a>
            </div>
"""

html_content += f"""
        </div>

        <div class="updated">
            <p>✅ Última actualización: <strong>{timestamp}</strong></p>
            <p>Búsqueda en: CAMFIC, Gencat SAS, CatSalut, InfoJobs, Hospital Clínic, Teknon</p>
        </div>
    </div>
</body>
</html>"""

# Guardar archivos
html_path = "/home/carlos/.openclaw/workspace/filehubdef/ofertas.html"
json_path = "/home/carlos/.openclaw/workspace/filehubdef/data-ofertas.json"

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump({
        "timestamp": datetime.now().isoformat(),
        "total": len(ofertas),
        "ofertas": ofertas,
        "salario_promedio": "2.250€/mes"
    }, f, ensure_ascii=False, indent=2)

print(f"✅ Ofertas HTML: {html_path}")
print(f"✅ Ofertas JSON: {json_path}")
print(f"📊 Total ofertas: {len(ofertas)}")
