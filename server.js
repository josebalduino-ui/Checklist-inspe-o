require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

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

    section('Leituras do equipamento');
    line('Horímetro', inspection.horimetroDesabilitado ? 'Anotação desabilitada' : inspection.horimetro ? `${inspection.horimetro} h` : 'Não informado');
    line('Quilometragem', inspection.quilometragemDesabilitada ? 'Anotação desabilitada' : inspection.quilometragem ? `${inspection.quilometragem} km` : 'Não informado');

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
  if (request.method === 'GET' && url.pathname === '/api/config') {
    sendJson(response, 200, {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/inspections/pdf') {
    try {
      const inspection = await readJson(request);
      if (!inspection || typeof inspection !== 'object' || Array.isArray(inspection)) {
        sendJson(response, 400, { error: 'Dados de inspeção inválidos.' });
        return;
      }
      const pdf = await createInspectionPdf(inspection);
      const safeVehicle = String(inspection.placa || inspection.veiculo || 'inspecao').replace(/[^a-z0-9_-]/gi, '-').slice(0, 50);
      response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${safeVehicle}.pdf"`,
        'Cache-Control': 'no-store'
      });
      response.end(pdf);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error.message);
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
