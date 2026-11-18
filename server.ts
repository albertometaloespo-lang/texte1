import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Dados iniciais predefinidos limpos
const INITIAL_DATA = {
  colaboradores: [] as any[],
  obras: [] as any[],
  registos: [] as any[],
  validacoes: {} as Record<string, any>,
  lastUpdated: new Date().toISOString(),
};

// Carregar ou inicializar a base de dados central
function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        colaboradores: Array.isArray(parsed.colaboradores) ? parsed.colaboradores : [],
        obras: Array.isArray(parsed.obras) ? parsed.obras : [],
        registos: Array.isArray(parsed.registos) ? parsed.registos : [],
        validacoes: parsed.validacoes || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return { ...INITIAL_DATA };
    }
  } catch (err) {
    console.warn('Erro ao carregar ficheiro da base de dados, a usar dados predefinidos:', err);
    return { ...INITIAL_DATA };
  }
}

let db = loadDatabase();

function persistDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao gravar base de dados central:', err);
  }
}

// Lista de clientes ligados em Server-Sent Events (SSE) para broadcast em tempo real
const sseClients = new Set<Response>();

function broadcastRealtimeUpdate(payload: {
  type: string;
  sourceClient?: string;
  registos?: any[];
  colaboradores?: any[];
  obras?: any[];
  validacoes?: Record<string, any>;
  deletedIds?: string[];
  obraId?: string;
  colaboradorId?: string;
  date?: string;
  message?: string;
  timestamp: string;
}) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // CORS headers para compatibilidade total
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // 1. Endpoint SSE para streaming em direto de todos os registos
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Enviar confirmação inicial de ligação
    res.write(
      `data: ${JSON.stringify({
        type: 'CONNECTED',
        timestamp: new Date().toISOString(),
        clientsCount: sseClients.size + 1,
      })}\n\n`
    );

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 2. Obter estado completo da base de dados central
  app.get('/api/data', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: db,
      activeClients: sseClients.size,
    });
  });

  // 3. Gravar ou atualizar registos de horas (com difusão em tempo real)
  app.post('/api/registos', (req: Request, res: Response) => {
    const { registos: incomingRegistos, sourceClient, workerName, obraNome, action } = req.body;

    if (!Array.isArray(incomingRegistos)) {
      res.status(400).json({ error: 'registos deve ser um array' });
      return;
    }

    const incomingMap = new Map<string, any>();
    for (const r of incomingRegistos) {
      if (r && r.id) incomingMap.set(r.id, r);
    }

    // Atualizar registos existentes ou adicionar novos
    const updatedRegistos = db.registos.map((existing: any) => {
      if (incomingMap.has(existing.id)) {
        const replacement = incomingMap.get(existing.id);
        incomingMap.delete(existing.id);
        return replacement;
      }
      return existing;
    });

    // Inserir os que sobraram (eram novos)
    for (const newItem of incomingMap.values()) {
      updatedRegistos.push(newItem);
    }

    db.registos = updatedRegistos;
    persistDatabase();

    // Notificar imediatamente todos os outros telemóveis e computadores ligados
    broadcastRealtimeUpdate({
      type: 'REGISTOS_UPDATED',
      sourceClient,
      registos: db.registos,
      message:
        workerName && obraNome
          ? `${workerName} registou horas em ${obraNome}`
          : 'Novos registos de horas atualizados em direto',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      syncedCount: incomingRegistos.length,
      totalCount: db.registos.length,
      lastUpdated: db.lastUpdated,
    });
  });

    // 4. Sincronização e merge bidirecional
  app.post('/api/sync', (req: Request, res: Response) => {
    const {
      registos: clientRegistos = [],
      colaboradores: clientColaboradores = [],
      obras: clientObras = [],
      validacoes: clientValidacoes = {},
      sourceClient,
      replace = false,
    } = req.body;

    if (replace) {
      // Substituição autoritária (usada após eliminações pelo administrador)
      if (Array.isArray(clientRegistos)) db.registos = clientRegistos;
      if (Array.isArray(clientColaboradores)) db.colaboradores = clientColaboradores;
      if (Array.isArray(clientObras)) db.obras = clientObras;
      if (clientValidacoes) db.validacoes = clientValidacoes;
    } else {
      // Merge de Registos
      const regMap = new Map<string, any>();
      for (const r of db.registos) {
        if (r && r.id) regMap.set(r.id, r);
      }
      for (const cr of clientRegistos) {
        if (!cr || !cr.id) continue;
        const existing = regMap.get(cr.id);
        if (!existing) {
          regMap.set(cr.id, cr);
        } else {
          // Preserva o mais recente
          const existingTime = new Date(existing.atualizadoEm || existing.criadoEm || 0).getTime();
          const clientTime = new Date(cr.atualizadoEm || cr.criadoEm || 0).getTime();
          if (clientTime >= existingTime) {
            regMap.set(cr.id, cr);
          }
        }
      }
      db.registos = Array.from(regMap.values());

      // Merge de Colaboradores
      if (Array.isArray(clientColaboradores) && clientColaboradores.length > 0) {
        const colMap = new Map<string, any>();
        for (const c of db.colaboradores) colMap.set(c.id, c);
        for (const cc of clientColaboradores) colMap.set(cc.id, cc);
        db.colaboradores = Array.from(colMap.values());
      }

      // Merge de Obras
      if (Array.isArray(clientObras) && clientObras.length > 0) {
        const obrMap = new Map<string, any>();
        for (const o of db.obras) obrMap.set(o.id, o);
        for (const co of clientObras) obrMap.set(co.id, co);
        db.obras = Array.from(obrMap.values());
      }

      // Merge de Validações
      db.validacoes = { ...db.validacoes, ...(clientValidacoes || {}) };
    }

    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'FULL_SYNC',
      sourceClient,
      registos: db.registos,
      colaboradores: db.colaboradores,
      obras: db.obras,
      validacoes: db.validacoes,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: db,
    });
  });

  // 5. Eliminar registo(s) específico(s) pelo Administrador
  app.post('/api/registos/delete', (req: Request, res: Response) => {
    const { registoId, registoIds, sourceClient, reason } = req.body;
    const idsToDelete = new Set<string>();
    if (registoId) idsToDelete.add(registoId);
    if (Array.isArray(registoIds)) {
      registoIds.forEach((id: string) => idsToDelete.add(id));
    }

    if (idsToDelete.size === 0) {
      res.status(400).json({ error: 'Nenhum ID de registo fornecido para eliminação' });
      return;
    }

    const initialCount = db.registos.length;
    db.registos = db.registos.filter((r: any) => !idsToDelete.has(r.id));
    const deletedCount = initialCount - db.registos.length;
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'REGISTOS_DELETED',
      sourceClient,
      deletedIds: Array.from(idsToDelete),
      registos: db.registos,
      message: reason || `${deletedCount} registo(s) eliminado(s) pelo administrador`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      deletedCount,
      totalCount: db.registos.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // 6. Eliminar todos os registos de um dia específico pelo Administrador
  app.post('/api/registos/clear-day', (req: Request, res: Response) => {
    const { date, sourceClient } = req.body;
    if (!date) {
      res.status(400).json({ error: 'Data não fornecida' });
      return;
    }

    const initialCount = db.registos.length;
    db.registos = db.registos.filter((r: any) => r.data !== date);
    delete db.validacoes[date];
    const deletedCount = initialCount - db.registos.length;
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'DAY_CLEARED',
      sourceClient,
      date,
      registos: db.registos,
      validacoes: db.validacoes,
      message: `Todos os registos do dia ${date} foram eliminados pelo administrador`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      date,
      deletedCount,
      totalCount: db.registos.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // 7. Eliminar Obra pelo Administrador
  app.post('/api/obras/delete', (req: Request, res: Response) => {
    const { obraId, sourceClient } = req.body;
    if (!obraId) {
      res.status(400).json({ error: 'obraId não fornecido' });
      return;
    }

    const obraToRemove = db.obras.find((o: any) => o.id === obraId);
    db.obras = db.obras.filter((o: any) => o.id !== obraId);
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'OBRA_DELETED',
      sourceClient,
      obraId,
      obras: db.obras,
      message: `Obra ${obraToRemove?.nome || obraId} eliminada pelo administrador`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      obraId,
      totalObras: db.obras.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // 8. Eliminar Colaborador pelo Administrador
  app.post('/api/colaboradores/delete', (req: Request, res: Response) => {
    const { colaboradorId, sourceClient } = req.body;
    if (!colaboradorId) {
      res.status(400).json({ error: 'colaboradorId não fornecido' });
      return;
    }

    const colToRemove = db.colaboradores.find((c: any) => c.id === colaboradorId);
    db.colaboradores = db.colaboradores.filter((c: any) => c.id !== colaboradorId);
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'COLABORADOR_DELETED',
      sourceClient,
      colaboradorId,
      colaboradores: db.colaboradores,
      message: `Colaborador ${colToRemove?.nome || colaboradorId} eliminado pelo administrador`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      colaboradorId,
      totalColaboradores: db.colaboradores.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // 9. Limpar todos os registos (Comando de Administrador)
  app.post('/api/clear-registos', (_req: Request, res: Response) => {
    db.registos = [];
    db.validacoes = {};
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'REGISTOS_CLEARED',
      registos: [],
      validacoes: {},
      message: 'Todos os registos foram limpos pelo administrador',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Registos limpos com sucesso' });
  });

  // 10. Limpar TUDO (Registos, Colaboradores e Obras) pelo Administrador
  app.post('/api/wipe-everything', (req: Request, res: Response) => {
    const { sourceClient } = req.body;
    db.registos = [];
    db.colaboradores = [];
    db.obras = [];
    db.validacoes = {};
    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'EVERYTHING_WIPED',
      sourceClient,
      registos: [],
      colaboradores: [],
      obras: [],
      validacoes: {},
      message: 'Todos os registos, colaboradores e obras foram limpos pelo administrador',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Tudo limpo com sucesso' });
  });

  // 6. Atualização de validação de dia (bloquear/desbloquear)
  app.post('/api/validacoes', (req: Request, res: Response) => {
    const { validacao, removeDate, sourceClient } = req.body;

    if (removeDate) {
      delete db.validacoes[removeDate];
      db.registos = db.registos.map((r: any) =>
        r.data === removeDate ? { ...r, bloqueado: false } : r
      );
    } else if (validacao && validacao.data) {
      db.validacoes[validacao.data] = validacao;
      db.registos = db.registos.map((r: any) =>
        r.data === validacao.data
          ? {
              ...r,
              validado: true,
              bloqueado: true,
              validadoPor: validacao.validadoPor,
              validadoEm: validacao.validadoEm,
            }
          : r
      );
    }

    persistDatabase();

    broadcastRealtimeUpdate({
      type: 'VALIDACOES_UPDATED',
      sourceClient,
      validacoes: db.validacoes,
      registos: db.registos,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, validacoes: db.validacoes });
  });

  // Montar Vite middlewares em ambiente de desenvolvimento ou servir estáticos em produção
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Metaloespo] Servidor central em tempo real ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor Metaloespo:', err);
  process.exit(1);
});
