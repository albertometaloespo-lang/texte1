import { RegistoHoras, Colaborador, Obra, ValidacaoDia } from '../types';

export interface RealtimePayload {
  type:
    | 'CONNECTED'
    | 'REGISTOS_UPDATED'
    | 'REGISTOS_DELETED'
    | 'DAY_CLEARED'
    | 'OBRA_DELETED'
    | 'COLABORADOR_DELETED'
    | 'FULL_SYNC'
    | 'REGISTOS_CLEARED'
    | 'EVERYTHING_WIPED'
    | 'VALIDACOES_UPDATED';
  sourceClient?: string;
  registos?: RegistoHoras[];
  colaboradores?: Colaborador[];
  obras?: Obra[];
  validacoes?: Record<string, ValidacaoDia>;
  deletedIds?: string[];
  obraId?: string;
  colaboradorId?: string;
  date?: string;
  message?: string;
  timestamp: string;
}

// Identificador único deste separador / dispositivo
const CLIENT_ID =
  typeof window !== 'undefined'
    ? 'client-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
    : 'server-client';

let eventSource: EventSource | null = null;
let reconnectTimer: any = null;
let isConnected = false;

export const RealtimeSyncService = {
  getClientId(): string {
    return CLIENT_ID;
  },

  isLiveConnected(): boolean {
    return isConnected;
  },

  /**
   * Liga ao canal de eventos em tempo real (SSE)
   */
  connect(
    onPayload: (payload: RealtimePayload) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const setupConnection = () => {
      try {
        if (eventSource) {
          eventSource.close();
        }

        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          isConnected = true;
          if (onStatusChange) onStatusChange(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data: RealtimePayload = JSON.parse(event.data);
            if (data && data.type) {
              onPayload(data);
            }
          } catch (e) {
            console.warn('Erro ao processar mensagem SSE:', e);
          }
        };

        eventSource.onerror = () => {
          isConnected = false;
          if (onStatusChange) onStatusChange(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Reconectar após 3 segundos
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(setupConnection, 3000);
        };
      } catch (err) {
        console.warn('Falha ao inicializar EventSource:', err);
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(setupConnection, 5000);
      }
    };

    setupConnection();

    // Quando o telemóvel for desbloqueado ou o separador voltar a ter foco
    const handleFocusOrOnline = () => {
      if (!isConnected || !eventSource || eventSource.readyState === EventSource.CLOSED) {
        setupConnection();
      }
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      isConnected = false;
    };
  },

  /**
   * Procura o estado mais recente da base de dados central no servidor
   */
  async fetchServerData(): Promise<{
    colaboradores: Colaborador[];
    obras: Obra[];
    registos: RegistoHoras[];
    validacoes: Record<string, ValidacaoDia>;
  } | null> {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (e) {
      console.warn('Aviso ao carregar dados do servidor:', e);
      return null;
    }
  },

  /**
   * Envia novos registos de horas ou alterações com difusão imediata para todos os dispositivos
   */
  async broadcastRegistos(
    registos: RegistoHoras[],
    workerName?: string,
    obraNome?: string
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/registos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registos,
          sourceClient: CLIENT_ID,
          workerName,
          obraNome,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao difundir registos em tempo real:', e);
      return false;
    }
  },

  /**
   * Elimina um registo específico de horas e propaga para todas as aplicações
   */
  async broadcastDeleteRegisto(registoId: string, reason?: string): Promise<boolean> {
    try {
      const res = await fetch('/api/registos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registoId,
          sourceClient: CLIENT_ID,
          reason,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao propagar eliminação de registo:', e);
      return false;
    }
  },

  /**
   * Elimina múltiplos registos específicos de horas e propaga para todas as aplicações
   */
  async broadcastDeleteMultipleRegistos(registoIds: string[], reason?: string): Promise<boolean> {
    try {
      const res = await fetch('/api/registos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registoIds,
          sourceClient: CLIENT_ID,
          reason,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao propagar eliminação de registos:', e);
      return false;
    }
  },

  /**
   * Elimina todos os registos de um dia específico e propaga para todas as aplicações
   */
  async broadcastDeleteDayRegistos(date: string): Promise<boolean> {
    try {
      const res = await fetch('/api/registos/clear-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          sourceClient: CLIENT_ID,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao propagar eliminação do dia:', e);
      return false;
    }
  },

  /**
   * Elimina uma obra e propaga para todas as aplicações
   */
  async broadcastDeleteObra(obraId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/obras/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraId,
          sourceClient: CLIENT_ID,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao propagar eliminação de obra:', e);
      return false;
    }
  },

  /**
   * Elimina um colaborador e propaga para todas as aplicações
   */
  async broadcastDeleteColaborador(colaboradorId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/colaboradores/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colaboradorId,
          sourceClient: CLIENT_ID,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao propagar eliminação de colaborador:', e);
      return false;
    }
  },

  /**
   * Sincronização autoritária de todas as tabelas (substituição no servidor para manter eliminações)
   */
  async broadcastAuthoritativeSync(
    registos: RegistoHoras[],
    colaboradores: Colaborador[],
    obras: Obra[],
    validacoes: Record<string, ValidacaoDia>
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registos,
          colaboradores,
          obras,
          validacoes,
          sourceClient: CLIENT_ID,
          replace: true,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao sincronizar autoritariamente:', e);
      return false;
    }
  },

  /**
   * Sincronização padrão (merge)
   */
  async broadcastFullSync(
    registos: RegistoHoras[],
    colaboradores: Colaborador[],
    obras: Obra[],
    validacoes: Record<string, ValidacaoDia>
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registos,
          colaboradores,
          obras,
          validacoes,
          sourceClient: CLIENT_ID,
          replace: false,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao sincronizar tudo com o servidor:', e);
      return false;
    }
  },

  /**
   * Bloquear ou desbloquear dia
   */
  async broadcastValidacao(validacao?: ValidacaoDia, removeDate?: string): Promise<boolean> {
    try {
      const res = await fetch('/api/validacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validacao,
          removeDate,
          sourceClient: CLIENT_ID,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao atualizar validação no servidor:', e);
      return false;
    }
  },

  /**
   * Limpar TUDO (Registos, Colaboradores e Obras)
   */
  async broadcastWipeEverything(): Promise<boolean> {
    try {
      const res = await fetch('/api/wipe-everything', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceClient: CLIENT_ID }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao limpar tudo no servidor:', e);
      return false;
    }
  },

  /**
   * Limpar todos os registos
   */
  async broadcastClearAll(): Promise<boolean> {
    try {
      const res = await fetch('/api/clear-registos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch (e) {
      console.warn('Erro ao limpar registos no servidor:', e);
      return false;
    }
  },
};
