import { Colaborador, Obra, RegistoHoras, GoogleSyncConfig, ValidacaoDia, AppLayoutMode } from '../types';

const STORAGE_KEYS = {
  COLABORADORES: 'obratempo_colaboradores_v1',
  OBRAS: 'obratempo_obras_v1',
  REGISTOS: 'obratempo_registos_v2',
  SYNC_CONFIG: 'obratempo_sync_config_v1',
  VALIDACOES: 'obratempo_validacoes_v2',
  ADMIN_PIN: 'obratempo_admin_pin_v1',
  ADMIN_MODE: 'obratempo_admin_mode_v1',
  CURRENT_WORKER_ID: 'obratempo_current_worker_id_v1',
  CLEANUP_FLAG: 'obratempo_registos_wiped_v3',
  LAYOUT_MODE: 'obratempo_layout_mode_v1',
};

const CLEANUP_OBRAS_COLS_FLAG = 'obratempo_cleared_cols_obras_v5';

// Limpeza de colaboradores e obras predefinidos solicitada pelo utilizador
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!localStorage.getItem(CLEANUP_OBRAS_COLS_FLAG)) {
      localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify({}));
      localStorage.setItem(CLEANUP_OBRAS_COLS_FLAG, 'true');
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLEANUP_FLAG)) {
      localStorage.removeItem('obratempo_registos_v1');
      localStorage.removeItem('obratempo_validacoes_v1');
      localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.CLEANUP_FLAG, 'true');
    }
  }
} catch (e) {
  console.warn('Storage cleanup notice:', e);
}

export const StorageService = {
  getColaboradores(): Colaborador[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COLABORADORES);
    if (!raw) {
      this.saveColaboradores([]);
      return [];
    }
    try {
      const parsed: Colaborador[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Assegurar que todos os colaboradores têm PIN definido
      let updated = false;
      const verified = parsed.map((c, idx) => {
        if (!c.pin || c.pin.trim() === '') {
          updated = true;
          return { ...c, pin: String(1001 + idx) };
        }
        return c;
      });
      if (updated) {
        this.saveColaboradores(verified);
      }
      return verified;
    } catch {
      return [];
    }
  },

  saveColaboradores(colaboradores: Colaborador[]): void {
    localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(colaboradores));
  },

  getCurrentWorkerId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_WORKER_ID) || null;
  },

  setCurrentWorkerId(id: string | null): void {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_WORKER_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKER_ID);
    }
  },

  getObras(): Obra[] {
    const raw = localStorage.getItem(STORAGE_KEYS.OBRAS);
    if (!raw) {
      this.saveObras([]);
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveObras(obras: Obra[]): void {
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obras));
  },

  getRegistos(): RegistoHoras[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTOS);
    if (!raw) {
      this.saveRegistos([]);
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveRegistos(registos: RegistoHoras[]): void {
    localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify(registos));
  },

  clearAllRegistos(): void {
    localStorage.removeItem('obratempo_registos_v1');
    localStorage.removeItem('obratempo_validacoes_v1');
    localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify({}));
  },

  wipeEverything(): void {
    localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify({}));
  },

  getSyncConfig(): GoogleSyncConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    if (!raw) {
      const def: GoogleSyncConfig = {
        spreadsheetId: null,
        spreadsheetName: null,
        spreadsheetUrl: null,
        lastSyncTime: null,
        autoSync: true,
      };
      this.saveSyncConfig(def);
      return def;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        spreadsheetId: null,
        spreadsheetName: null,
        spreadsheetUrl: null,
        lastSyncTime: null,
        autoSync: true,
      };
    }
  },

  saveSyncConfig(cfg: GoogleSyncConfig): void {
    localStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(cfg));
  },

  getValidacoes(): Record<string, ValidacaoDia> {
    const raw = localStorage.getItem(STORAGE_KEYS.VALIDACOES);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveValidacao(validacao: ValidacaoDia): void {
    const current = this.getValidacoes();
    current[validacao.data] = validacao;
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify(current));
  },

  saveAllValidacoes(validacoes: Record<string, ValidacaoDia>): void {
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify(validacoes));
  },

  removeValidacao(dateStr: string): void {
    const current = this.getValidacoes();
    delete current[dateStr];
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify(current));
  },

  getAdminPin(): string {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || '1234';
  },

  setAdminPin(pin: string): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
  },

  isAdminMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_MODE) === 'true';
  },

  setAdminMode(mode: boolean): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_MODE, mode ? 'true' : 'false');
  },

  getLayoutMode(): AppLayoutMode {
    const saved = localStorage.getItem(STORAGE_KEYS.LAYOUT_MODE);
    if (saved === 'pc' || saved === 'mobile') return saved;
    // Detetar automaticamente se estiver em ecrã largo de computador (>= 1024px)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return 'pc';
    }
    return 'mobile';
  },

  setLayoutMode(mode: AppLayoutMode): void {
    localStorage.setItem(STORAGE_KEYS.LAYOUT_MODE, mode);
  },

  resetAllData(): void {
    localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REGISTOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.VALIDACOES, JSON.stringify({}));
  },
};
