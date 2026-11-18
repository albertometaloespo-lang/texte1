import React from 'react';
import {
  CalendarDays,
  History,
  HardHat,
  Users,
  Building2,
  BarChart3,
  Cloud,
  RefreshCw,
  Monitor,
  Smartphone,
  ShieldCheck,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ViewTab, UserRole, GoogleSyncConfig } from '../types';

interface DesktopSidebarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  userRole: UserRole;
  onToggleRole: () => void;
  isDriveConnected: boolean;
  isLiveConnected: boolean;
  activeObrasCount: number;
  activeWorkersCount: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenDesktopAppModal: () => void;
  onToggleLayoutMode: () => void;
  onQuickSync?: () => void;
  isSyncing?: boolean;
  onOpenExportPdf?: () => void;
  syncConfig?: GoogleSyncConfig;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onTabChange,
  userRole,
  onToggleRole,
  isDriveConnected,
  isLiveConnected,
  activeObrasCount,
  activeWorkersCount,
  selectedDate,
  onSelectDate,
  onOpenDesktopAppModal,
  onToggleLayoutMode,
  onQuickSync,
  isSyncing = false,
  onOpenExportPdf,
  syncConfig,
}) => {
  const menuItems: {
    id: ViewTab;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
    adminOnly?: boolean;
  }[] = [
    {
      id: 'registo',
      label: 'Registo Diário',
      subLabel: 'Folha de ponto e grelha PC',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'historico',
      label: 'Histórico de Horas',
      subLabel: 'Arquivo, filtros e pesquisa',
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'obras',
      label: 'Obras & Projetos',
      subLabel: 'Gestão de estaleiros',
      icon: <Building2 className="w-5 h-5" />,
      badge: activeObrasCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      adminOnly: true,
    },
    {
      id: 'equipa',
      label: 'Equipa & Pessoal',
      subLabel: 'Colaboradores e PINs',
      icon: <Users className="w-5 h-5" />,
      badge: activeWorkersCount,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      adminOnly: true,
    },
    {
      id: 'relatorios',
      label: 'Relatórios & Análise',
      subLabel: 'Totais, CSV e estatísticas',
      icon: <BarChart3 className="w-5 h-5" />,
      adminOnly: true,
    },
    {
      id: 'drive',
      label: 'Sincronização Central',
      subLabel: 'Google Drive e Base de Dados',
      icon: <Cloud className="w-5 h-5" />,
      badge: isDriveConnected ? 'Ligado' : 'Configurar',
      badgeColor: isDriveConnected
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 text-white select-none z-30 shadow-xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <HardHat className="w-6 h-6 text-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white truncate">
                Metaloespo
              </h1>
              <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                PC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              Gestão de Obra & Horas
            </p>
          </div>
        </div>

        {/* Status em Direto e Estado de Sincronização */}
        <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-300">
              {isLiveConnected ? 'Em Direto (Tempo Real)' : 'A Ligar...'}
            </span>
          </div>
          {onQuickSync && (
            <button
              onClick={onQuickSync}
              disabled={isSyncing}
              title="Sincronizar agora com a folha de cálculo no Google Drive"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          if (item.adminOnly && userRole !== 'administrador') return null;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={isActive ? 'text-slate-950' : 'text-amber-400'}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <span className="text-xs block leading-tight truncate">{item.label}</span>
                  <span
                    className={`text-[10px] block leading-tight truncate ${
                      isActive ? 'text-slate-900/80 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {item.subLabel}
                  </span>
                </div>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-slate-950 text-white font-extrabold'
                      : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Atalhos Rápidos de Ação Desktop */}
        <div className="pt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Ações Rápidas
          </div>
          {onOpenExportPdf && (
            <button
              onClick={onOpenExportPdf}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Exportar PDF Diário</span>
            </button>
          )}
          <button
            onClick={onOpenDesktopAppModal}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Atalho Ambiente Trabalho</span>
          </button>
        </div>
      </nav>

      {/* Footer: Perfil e Alternador de Modo */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        {/* Perfil Administrador */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-750">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate leading-tight">
                Alberto (Admin)
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {userRole === 'administrador' ? 'Acesso Total' : 'Colaborador'}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleRole}
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Trocar
          </button>
        </div>

        {/* Botão para alternar para a Versão Telemóvel */}
        <button
          onClick={onToggleLayoutMode}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          title="Mudar temporariamente para a visualização compacta de telemóvel"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Mudar para Modo Telemóvel</span>
        </button>
      </div>
    </aside>
  );
};
