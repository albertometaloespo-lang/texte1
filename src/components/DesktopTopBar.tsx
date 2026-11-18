import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  Users,
  Building2,
  FileText,
  RefreshCw,
  Monitor,
  Smartphone,
  CheckCircle2,
  Table,
  LayoutGrid,
} from 'lucide-react';
import { ValidacaoDia } from '../types';

interface DesktopTopBarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dayValidation?: ValidacaoDia;
  isDayLocked: boolean;
  totalGeralDia: number;
  totalHorasNormais: number;
  totalHorasExtra: number;
  uniqueColsCount: number;
  totalActiveColsCount: number;
  activeObrasCount: number;
  onOpenExportPdf?: () => void;
  onQuickSync?: () => void;
  isSyncing?: boolean;
  onOpenDesktopAppModal: () => void;
  onToggleLayoutMode: () => void;
  dailyViewMode: 'cartoes' | 'grelha';
  onToggleDailyViewMode: (mode: 'cartoes' | 'grelha') => void;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  selectedDate,
  onSelectDate,
  dayValidation,
  isDayLocked,
  totalGeralDia,
  totalHorasNormais,
  totalHorasExtra,
  uniqueColsCount,
  totalActiveColsCount,
  activeObrasCount,
  onOpenExportPdf,
  onQuickSync,
  isSyncing = false,
  onOpenDesktopAppModal,
  onToggleLayoutMode,
  dailyViewMode,
  onToggleDailyViewMode,
}) => {
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    onSelectDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    onSelectDate(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onSelectDate(new Date().toISOString().split('T')[0]);
  };

  const formattedDateLong = React.useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Lado Esquerdo: Navegação de Data */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={handlePrevDay}
              title="Dia Anterior"
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isToday
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNextDay}
              title="Dia Seguinte"
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Input de Data */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onSelectDate(e.target.value)}
              className="sr-only"
              id="desktop-date-input"
            />
            <label
              htmlFor="desktop-date-input"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors"
            >
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="capitalize">{formattedDateLong}</span>
            </label>
          </div>

          {/* Badge de Estado: Bloqueado vs Em Aberto */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
              isDayLocked
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {isDayLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Dia Validado & Bloqueado</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                <span>Registo Aberto</span>
              </>
            )}
          </div>
        </div>

        {/* Centro / Métricas Rápidas */}
        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-slate-500 font-medium">Total:</span>
            <span className="font-black text-slate-900 tabular-nums text-sm">
              {totalGeralDia} h
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Normais:</span>
            <span className="font-bold text-blue-700 tabular-nums">{totalHorasNormais} h</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500 font-medium">Extra:</span>
            <span className="font-black text-amber-600 tabular-nums">+{totalHorasExtra} h</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500 font-medium">Equipa:</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {uniqueColsCount} / {totalActiveColsCount}
            </span>
          </div>
        </div>

        {/* Lado Direito: Ações Desktop */}
        <div className="flex items-center gap-2">
          {/* Seletor de visualização diária: Cartões vs Grelha Rápida PC */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => onToggleDailyViewMode('grelha')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dailyViewMode === 'grelha'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Folha de Ponto em Grelha (tipo Excel / Teclado Rápido)"
            >
              <Table className="w-3.5 h-3.5 text-amber-600" />
              <span>Grelha PC</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleDailyViewMode('cartoes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dailyViewMode === 'cartoes'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista em Cartões Individuais por Colaborador"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
              <span>Cartões</span>
            </button>
          </div>

          {/* Botão PDF */}
          {onOpenExportPdf && (
            <button
              onClick={onOpenExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              title="Exportar Folha de Ponto Diária em PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">PDF Diário</span>
            </button>
          )}

          {/* Botão Atalho PC */}
          <button
            onClick={onOpenDesktopAppModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
            title="Instalar ou criar atalho para o Ambiente de Trabalho do PC"
          >
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Atalho PC</span>
          </button>
        </div>
      </div>
    </header>
  );
};
