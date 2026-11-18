import React from 'react';
import {
  HardHat,
  Cloud,
  CloudCheck,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
  Smartphone,
  Share2,
  Monitor,
} from 'lucide-react';
import { GoogleSyncConfig, UserRole, Colaborador, AppLayoutMode } from '../types';

interface HeaderProps {
  syncConfig: GoogleSyncConfig;
  isSyncing: boolean;
  userRole: UserRole;
  currentWorker?: Colaborador | null;
  onOpenWorkerLogin: () => void;
  onQuickSync?: () => void;
  onOpenDriveTab: () => void;
  onToggleRole: () => void;
  onOpenMobileModal: () => void;
  onOpenShareDatabase?: () => void;
  onToggleLayoutMode?: () => void;
  onOpenDesktopAppModal?: () => void;
  appLayoutMode?: AppLayoutMode;
  isLiveConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  syncConfig,
  isSyncing,
  userRole,
  currentWorker,
  onOpenWorkerLogin,
  onQuickSync,
  onOpenDriveTab,
  onToggleRole,
  onOpenMobileModal,
  onOpenShareDatabase,
  onToggleLayoutMode,
  onOpenDesktopAppModal,
  appLayoutMode = 'mobile',
  isLiveConnected = true,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 h-11 sm:h-14 flex items-center justify-between gap-2">
        {/* Brand Zone */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-sm shrink-0">
            <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
              Metaloespo
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-400 font-medium">Registo de Horas</p>
          </div>
        </div>

        {/* Right Zone: Estado em Direto + Telemóvel + Role Pill + Google Drive */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Indicador de Ligação em Tempo Real entre Todas as Aplicações */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isLiveConnected
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            }`}
            title={
              isLiveConnected
                ? 'Ligação ativa em direto: todos os registos aparecem instantaneamente em todos os telemóveis e computadores'
                : 'A restabelecer ligação em direto...'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isLiveConnected ? 'Em Direto' : 'A Ligar'}
            </span>
          </div>
          {/* Botão Versão PC / Secretária */}
          {onToggleLayoutMode && (
            <button
              onClick={onToggleLayoutMode}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
              title="Mudar para a Versão PC / Secretária com ecrã largo e grelha rápida"
            >
              <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="text-[10px] sm:text-[11px] font-bold">Modo PC</span>
            </button>
          )}

          {/* Botão Testar no Telemóvel */}
          <button
            onClick={onOpenMobileModal}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700/80 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
            title="Abrir código QR para testar no telemóvel"
          >
            <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[10px] sm:text-[11px] font-bold">Móvel</span>
          </button>

          {/* Botão Partilhar Base de Dados em Várias Aplicações */}
          {userRole === 'administrador' && onOpenShareDatabase && (
            <button
              onClick={onOpenShareDatabase}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
              title="Partilhar base de dados com outras aplicações, telemóveis ou Excel"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold">Partilhar BD</span>
            </button>
          )}

          {/* Modo Administrador ou Perfil do Colaborador com PIN */}
          {userRole === 'administrador' ? (
            <button
              onClick={onToggleRole}
              className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-xs transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
              title="Modo Administrador ativo. Toque para mudar para modo colaborador."
            >
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-950" />
              <span className="text-[10px] sm:text-[11px] font-bold">Admin</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {currentWorker ? (
                <button
                  onClick={onOpenWorkerLogin}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400 text-xs font-semibold transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
                  title={`Sessão iniciada como ${currentWorker.nome} (PIN: ${currentWorker.pin}). Toque para trocar de colaborador.`}
                >
                  <span
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shadow-xs"
                    style={{ backgroundColor: currentWorker.cor }}
                  >
                    {currentWorker.nome.charAt(0)}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold max-w-[65px] sm:max-w-[120px] truncate">
                    {currentWorker.nome.split(' ')[0]}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onOpenWorkerLogin}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 text-xs font-semibold transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
                >
                  <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-bold">Entrar</span>
                </button>
              )}

              <button
                onClick={onToggleRole}
                className="p-1 sm:p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors min-h-[32px] sm:min-h-[36px] min-w-[32px] sm:min-w-[36px] flex items-center justify-center"
                title="Aceder à Administração"
              >
                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          )}

          {/* Botão de Sincronização com a Base de Dados Central no Google Drive */}
          {syncConfig.spreadsheetId ? (
            <button
              onClick={onQuickSync || onOpenDriveTab}
              disabled={isSyncing}
              title={`Base de Dados Central no Google Drive: ${syncConfig.spreadsheetName || 'Folha Central'}. Toque para sincronizar.`}
              className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-800 hover:bg-slate-700/90 border border-emerald-500/40 text-xs text-white transition-all cursor-pointer min-h-[32px] sm:min-h-[36px] shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
              <span className="text-[10px] sm:text-[11px] font-bold">
                {isSyncing ? 'A sincronizar...' : 'Drive'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenDriveTab}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors cursor-pointer min-h-[32px] sm:min-h-[36px]"
              title="Ligar à Base de Dados Central no Google Drive"
            >
              <Cloud className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-[11px]">Drive</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
