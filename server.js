require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
const MAX_BODY_BYTES = 30 * 1024 * 1024;
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let tooLarge = false;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('A inspeção excede o limite de envio.'), { statusCode: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('O corpo da solicitação não contém JSON válido.'), { statusCode: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function safeText(value, fallback = 'Não informado') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function createInspectionPdf(inspection) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, autoFirstPage: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageBottom = 760;
    const ensureSpace = (height = 40) => {
      if (doc.y + height > pageBottom) doc.addPage();
    };
    const section = title => {
      ensureSpace(38);
      doc.moveDown(0.7).font('Helvetica-Bold').fontSize(13).fillColor('#234bb8').text(title);
      doc.moveDown(0.35);
      doc.fillColor('#1d2433');
    };
    const line = (label, value) => {
      ensureSpace(24);
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}: `, { continued: true });
      doc.font('Helvetica').text(safeText(value));
    };

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#234bb8').text('Relatório de inspeção');
    doc.moveDown(0.2).font('Helvetica').fontSize(9).fillColor('#687385')
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
    doc.fillColor('#1d2433');

    section('Dados do equipamento');
    line('Veículo', inspection.veiculo);
    line('Equipamento', inspection.equipamento);
    line('Placa', inspection.placa);
    line('Data da inspeção', inspection.dataInspecao);
    line('Responsável', inspection.responsavel);

    section('Resultado');
    line('Aptidão para rodar', inspection.aptidaoSistema);
    line('Ordem de serviço', inspection.ordemServico === 'sim' ? 'Necessária' : 'Não necessária');
    line('Não conformidade observada', inspection.naoConformidade);

    section('Itens não conformes');
    const answers = inspection.respostas || {};
    const items = Array.isArray(inspection.itens) ? inspection.itens : [];
    const labels = new Map(items.map(item => [item.id, item.name]));
    const nonconforming = Object.entries(answers).filter(([, value]) => value === 'nao-conforme');
    if (!nonconforming.length) doc.font('Helvetica').fontSize(10).text('Nenhum item não conforme.');
    nonconforming.forEach(([id]) => {
      ensureSpace(28);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#d92d4d')
        .text(`• ${labels.get(id) || id} — Não conforme`);
      doc.fillColor('#1d2433');
    });

    section('Itens de atenção');
    const attention = Object.entries(answers).filter(([, value]) => value === 'apto-ressalvas');
    if (!attention.length) doc.font('Helvetica').fontSize(10).text('Nenhum item marcado com ressalvas.');
    attention.forEach(([id]) => {
      ensureSpace(28);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#b45309')
        .text(`• ${labels.get(id) || id} — Apto com ressalvas`);
      doc.fillColor('#1d2433');
    });

    section('Checklist');
    const statusNames = {
      conforme: 'Conforme',
      'nao-conforme': 'Não conforme',
      'apto-ressalvas': 'Apto com ressalvas',
      'n-a': 'N/A'
    };
    Object.entries(answers).forEach(([id, value]) => {
      ensureSpace(24);
      doc.font('Helvetica').fontSize(9).text(`${labels.get(id) || id}: ${statusNames[value] || value}`);
    });

    doc.end();
  });
}

function getAdminRecipients(inspection) {
  const admins = Array.isArray(inspection.admins) ? inspection.admins : [];
  return admins.filter(admin => admin && admin.perfil === 'admin').map(admin => ({
    email: String(admin.email || '').trim(),
    phone: String(admin.phone || '').replace(/\D/g, '')
  }));
}

function emailIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.MAIL_FROM);
}

async function sendEmail(pdf, inspection, recipients) {
  const emails = [...new Set(recipients.map(recipient => recipient.email).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
  if (!emailIsConfigured()) return { status: 'não configurado', sent: 0, failed: 0 };
  if (!emails.length) return { status: 'sem destinatários', sent: 0, failed: 0 };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: emails,
      subject: `Inspeção ${safeText(inspection.veiculo, 'de equipamento')} — ${safeText(inspection.aptidaoSistema)}`,
      text: `Segue em anexo o relatório da inspeção de ${safeText(inspection.veiculo, 'equipamento')} realizada por ${safeText(inspection.responsavel)}.`,
      attachments: [{ filename: 'relatorio-inspecao.pdf', content: pdf, contentType: 'application/pdf' }]
    });
    return { status: 'enviado', sent: emails.length, failed: 0 };
  } catch (error) {
    console.error('Falha no envio de e-mail:', error.message);
    return { status: 'falha no envio', sent: 0, failed: emails.length };
  } finally {
    transporter.close();
  }
}

function whatsappIsConfigured() {
  return Boolean(process.env.WHATSAPP_API_VERSION && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function sendWhatsAppDocument(pdf, inspection, recipients) {
  const phones = [...new Set(recipients.map(recipient => recipient.phone).filter(phone => /^\d{10,15}$/.test(phone)))];
  if (!whatsappIsConfigured()) return { status: 'não configurado', sent: 0, failed: 0 };
  if (!phones.length) return { status: 'sem destinatários', sent: 0, failed: 0 };

  const version = process.env.WHATSAPP_API_VERSION.replace(/[^v\d.]/g, '');
  const phoneNumberId = encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const baseUrl = `https://graph.facebook.com/${version}`;
  let mediaId;
  try {
    const form = new FormData();
    form.set('messaging_product', 'whatsapp');
    form.set('type', 'application/pdf');
    form.set('file', new Blob([pdf], { type: 'application/pdf' }), 'relatorio-inspecao.pdf');
    const uploadResponse = await fetch(`${baseUrl}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: form
    });
    const upload = await uploadResponse.json();
    if (!uploadResponse.ok || !upload.id) throw new Error(upload.error?.message || 'Falha ao enviar o PDF para o WhatsApp.');
    mediaId = upload.id;
  } catch (error) {
    console.error('Falha ao preparar PDF para WhatsApp:', error.message);
    return { status: 'falha no envio', sent: 0, failed: phones.length };
  }

  let sent = 0;
  for (const phone of phones) {
    try {
      const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'document',
          document: {
            id: mediaId,
            filename: 'relatorio-inspecao.pdf',
            caption: `Relatório da inspeção de ${safeText(inspection.veiculo, 'equipamento')}`
          }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Falha ao enviar documento.');
      sent += 1;
    } catch (error) {
      console.error(`Falha no envio de WhatsApp para ${phone}:`, error.message);
    }
  }
  return { status: sent === phones.length ? 'enviado' : sent ? 'parcial' : 'falha no envio', sent, failed: phones.length - sent };
}

function serveStatic(request, response, url) {
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || path.basename(filePath).startsWith('.')) {
    sendJson(response, 404, { error: 'Não encontrado.' });
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  if (!mimeTypes[extension]) {
    sendJson(response, 404, { error: 'Não encontrado.' });
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 404, { error: 'Não encontrado.' });
      return;
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[extension], 'Cache-Control': 'no-store' });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/inspections') {
    try {
      const inspection = await readJson(request);
      if (!inspection || typeof inspection !== 'object' || Array.isArray(inspection)) {
        sendJson(response, 400, { error: 'Dados de inspeção inválidos.' });
        return;
      }
      const pdf = await createInspectionPdf(inspection);
      const recipients = getAdminRecipients(inspection);
      const [email, whatsapp] = await Promise.all([
        sendEmail(pdf, inspection, recipients),
        sendWhatsAppDocument(pdf, inspection, recipients)
      ]);
      const safeVehicle = String(inspection.placa || inspection.veiculo || 'inspecao').replace(/[^a-z0-9_-]/gi, '-').slice(0, 50);
      response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${safeVehicle}.pdf"`,
        'Cache-Control': 'no-store',
        'X-Email-Result': `${email.status}; enviados=${email.sent}; falhas=${email.failed}`,
        'X-WhatsApp-Result': `${whatsapp.status}; enviados=${whatsapp.sent}; falhas=${whatsapp.failed}`
      });
      response.end(pdf);
    } catch (error) {
      console.error('Erro ao processar inspeção:', error.message);
      sendJson(response, error.statusCode || 500, { error: error.statusCode ? error.message : 'Não foi possível gerar o relatório.' });
    }
    return;
  }
  if (request.method === 'GET') {
    serveStatic(request, response, url);
    return;
  }
  sendJson(response, 405, { error: 'Método não permitido.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Checklist backend disponível na porta ${PORT}`);
});
