exports.handler = async (event) => {
  const TG = '8258049036:AAFY9c1FTsT_AqxoqdlJcDWgmX4UP-lioRU';
  const host = event.headers?.host || 'phenomenal-nasturtium-5e1a1d.netlify.app';
  const whUrl = `https://${host}/api/telegram-webhook`;
  const act = event.queryStringParameters?.action || 'set';

  let result;
  if (act === 'delete') {
    const r = await fetch(`https://api.telegram.org/bot${TG}/deleteWebhook`);
    result = await r.json();
  } else {
    const r = await fetch(`https://api.telegram.org/bot${TG}/setWebhook`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({url:whUrl, allowed_updates:['message']})
    });
    result = await r.json();
  }

  const ok = result.ok;
  const color = ok ? '#00e676' : '#ff5252';
  const icon = ok ? '✅' : '❌';
  const msg = act === 'delete' 
    ? (ok ? 'Webhook eliminado' : 'Error: ' + result.description)
    : (ok ? 'Webhook registrado! Bot activo 24/7' : 'Error: ' + result.description);

  return {
    statusCode: 200,
    headers: {'Content-Type':'text/html'},
    body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LifeBot Setup</title></head>
<body style="background:#0d1117;color:#e8ecf4;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="text-align:center;max-width:460px;padding:28px;background:#111b2b;border-radius:16px;border:1px solid rgba(0,229,255,.15)">
<h1 style="color:${color};font-size:1.4rem;margin-bottom:8px">${icon} ${msg}</h1>
<p style="color:#8899b8;font-size:.8rem;margin-bottom:16px">URL: <code style="color:#00e5ff">${whUrl}</code></p>
<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
<a href="/api/setup" style="padding:10px 20px;background:linear-gradient(135deg,#00e5ff,#448aff);color:#000;font-weight:700;border-radius:8px;text-decoration:none;font-size:.85rem">🚀 Registrar</a>
<a href="/api/setup?action=delete" style="padding:10px 20px;background:rgba(255,82,82,.15);color:#ff5252;font-weight:600;border-radius:8px;text-decoration:none;font-size:.85rem">Desactivar</a>
<a href="/dashboard" style="padding:10px 20px;background:rgba(0,229,255,.1);color:#00e5ff;font-weight:600;border-radius:8px;text-decoration:none;font-size:.85rem">📊 Dashboard</a>
</div>
</div></body></html>`
  };
};
