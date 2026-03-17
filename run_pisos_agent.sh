#!/bin/bash
openclaw agent --to +34679888148 --channel whatsapp --deliver --message "Eres un agente automatizado de busqueda de pisos y empleo. Usa el browser perfil openclaw. Ejecuta TODAS las tareas siguientes en orden.

=== TAREA 1: BUSCAR PISOS (minimo 50 entre todas las webs) ===

Criterios de busqueda:
- Ciudad: Barcelona
- Precio maximo: 1200 euros/mes
- Preferiblemente SIN AMUEBLAR
- Preferiblemente contrato LARGA DURACION (pero temporal tambien vale)
- Buena conexion con metro lineas L3 y L5
- Barrios preferidos: Eixample, Sants, Les Corts, Gracia, Sant Gervasi, Horta, Guinardo, Sant Andreu, Nou Barris, Sagrada Familia, Camp de lArpa, El Clot, Navas, Maragall, Diagonal, Fontana, Lesseps, Vall dHebron

Webs a buscar (navega a cada una, toma snapshot, extrae pisos):
1. https://www.fotocasa.es/es/alquiler/viviendas/barcelona-capital/todas-las-zonas/l?maxPrice=1200&sortType=publicationDate
2. https://www.habitaclia.com/alquiler-barcelona.htm?precioMax=1200
3. https://www.pisos.com/alquiler/pisos-barcelona_capital/fechareciente/?precio_max=1200
4. https://www.milanuncios.com/alquiler-de-pisos-en-barcelona-barcelona/?precio-hasta=1200&orden=date
5. https://www.idealista.com/alquiler-viviendas/barcelona-barcelona/con-precio-hasta_1200/

Para CADA web:
- Acepta cookies si aparecen
- Espera 20 segundos entre cada piso (anti-bot)
- Toma snapshot de la pagina de resultados
- Extrae de cada piso: titulo, precio, barrio, URL completa del anuncio
- Haz clic en cada anuncio interesante (menos de 1200 euros, preferiblemente sin amueblar)
- Busca boton de Contactar, Chat, o Email del casero
- Si encuentras forma de contactar, envia EXACTAMENTE este mensaje:

MENSAJE PARA CASEROS:
Buenas tardes, Nos ponemos en contacto con usted tras ver el anuncio de su vivienda. Estamos muy interesados en el inmueble, ya que por nuestras circunstancias profesionales buscamos un hogar tranquilo y bien comunicado. Somos una pareja de medicos con una situacion financiera muy solida: Ella Facultativa en el Hospital Universitario Vall dHebron. El Facultativo especialista (actualmente ejerciendo fuera con traslado proximo a Barcelona). Ingresos conjuntos superan los 5.000 euros netos mensuales, totalmente demostrables mediante nominas y contratos. Somos personas responsables, no fumadores y no tenemos mascotas. Al trabajar ambos en el sector sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda. Tenemos disponibilidad inmediata para realizar una visita y aportar toda la documentacion necesaria para formalizar el alquiler si el perfil les resulta de interes. Mi correo es carlosgalera2roman@gmail.com Un saludo cordial.

=== TAREA 2: RESUMEN PISOS POR WHATSAPP ===
Cuando termines todas las webs, envia por WhatsApp un resumen con:
- Total pisos encontrados
- Lista de los 20 mejores (titulo, precio, barrio, URL, si contactaste o no)
- Cuantos caseros contactaste

=== TAREA 3: GUARDAR DATOS PARA DASHBOARD ===
Guarda todos los resultados en formato JSON en ~/.openclaw/workspace/filehubdef/pisos_bot/data/dashboard.json con esta estructura:
{pisos: [{titulo, precio, barrio, url, platform, contactado, fecha}], stats: {total, contactados}}"
