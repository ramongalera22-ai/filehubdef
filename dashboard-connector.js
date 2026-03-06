// Connector para filehub-demo-carlos.web.app
// Sincronización bidireccional con dashboard existente

const DASHBOARD_URL = 'https://filehub-demo-carlos.web.app';
const SYNC_INTERVAL = 5000; // 5 segundos

class DashboardConnector {
  constructor() {
    this.messages = [];
    this.lastSync = Date.now();
    this.connected = false;
  }

  // Simular conexión con dashboard
  async connect() {
    console.log('🔗 Conectando con dashboard:', DASHBOARD_URL);
    
    try {
      // Verificar estado del dashboard
      const response = await fetch(`${DASHBOARD_URL}/api/status`);
      if (response.ok) {
        this.connected = true;
        console.log('✅ Dashboard conectado');
        this.startSync();
      }
    } catch (e) {
      console.log('⚠️ Dashboard no responde, usando modo offline');
      this.connected = false;
    }
  }

  // Sincronización periódica
  startSync() {
    setInterval(() => this.sync(), SYNC_INTERVAL);
  }

  async sync() {
    try {
      // Enviar mensajes pendientes al dashboard
      if (this.messages.length > 0) {
        const newMessages = this.messages.filter(m => m.timestamp > this.lastSync);
        
        for (const msg of newMessages) {
          await this.sendToDashboard(msg);
        }
        
        this.lastSync = Date.now();
      }
    } catch (e) {
      console.error('Sync error:', e.message);
    }
  }

  async sendToDashboard(message) {
    console.log('📤 Enviando a dashboard:', message.body?.substring(0, 50));
    // Aquí iría la llamada real al API del dashboard
  }

  // Recibir mensaje desde WhatsApp/Telegram
  receiveMessage(source, data) {
    const message = {
      id: Date.now().toString(),
      source: source,
      from: data.from,
      body: data.body,
      timestamp: Date.now(),
      type: 'incoming'
    };
    
    this.messages.push(message);
    console.log(`💬 [${source}] ${data.from}: ${data.body?.substring(0, 50)}`);
    
    return message;
  }

  // Enviar mensaje desde dashboard
  async sendMessage(target, body) {
    console.log(`📤 Enviando a ${target}: ${body}`);
    // Aquí iría la lógica para enviar vía WhatsApp/Telegram
  }
}

// Exportar para uso en el dashboard
module.exports = DashboardConnector;

// Si se ejecuta directamente
if (require.main === module) {
  const connector = new DashboardConnector();
  connector.connect();
  
  // Simular mensajes entrantes
  setTimeout(() => {
    connector.receiveMessage('whatsapp', {
      from: '+34679888148',
      body: 'Hola desde el simulador'
    });
  }, 2000);
}
