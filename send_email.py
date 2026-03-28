import urllib.request, json, base64, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

KEY = 'tI9PZqIP37D-yDtYeHm8hS5PiJyXQBSy7dORUzh9fu02ODd3VJFgEuQZu6FUR1Ybe8otja4BBcDWajMFrJOmf9Z4ikjx_YgspXcb6ZZMSA'

with open('/home/carlos/.openclaw/workspace/filehubdef/ofertas.html', 'r', encoding='utf-8') as f:
    html = f.read()

msg = MIMEMultipart()
msg['To'] = 'ramongalera22@gmail.com'
msg['Subject'] = f'Ofertas Medico Familia + Consultor - {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")}'
msg.attach(MIMEText(html, 'html'))

raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
data = json.dumps({'raw': raw}).encode()
req = urllib.request.Request(
    'https://gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send',
    data=data, method='POST'
)
req.add_header('Authorization', f'Bearer {KEY}')
req.add_header('Content-Type', 'application/json')

try:
    resp = urllib.request.urlopen(req, timeout=30)
    print('Email sent OK:', resp.read().decode())
except Exception as e:
    print('Error:', e)
