import React, { useState, useEffect, useMemo } from 'react';
import {
  Colaborador,
  Obra,
  RegistoHoras,
  ValidacaoDia,
  UserRole,
} from '../types';
import {
  Save,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Lock,
  Unlock,
  RotateCcw,
  Building2,
  Users,
  FileText,
  Search,
  Filter,
} from 'lucide-react';

interface DesktopQuickGridProps {
  selectedDate: string;
  colaboradores: Colaborador[];
  obras: Obra[];
  registos: RegistoHoras[];
  isLocked: boolean;
  dayValidation?: ValidacaoDia;
  userRole: UserRole;
  onSaveBatch: (
    obraId: string,
    allocations: {
      colaboradorId: string;
      horasNormais: number;
      horasExtra: number;
      descricao: string;
    }[]
  ) => void;
  onValidateAndLockDay: () => void;
  onUnlockDay: () => void;
  onExportPdf: () => void;
  onClearDayRegistos: () => void;
}

interface CellValue {
  horasNormais: number;
  horasExtra: number;
  descricao: string;
}

export const DesktopQuickGrid: React.FC<DesktopQuickGridProps> = ({
  selectedDate,
  colaboradores,
  obras,
  registos,
  isLocked,
  dayValidation,
  userRole,
  onSaveBatch,
  onValidateAndLockDay,
  onUnlockDay,
  onExportPdf,
  onClearDayRegistos,
}) => {
  const activeObras = useMemo(
    () => obras.filter((o) => o.estado === 'em_curso'),
    [obras]
  );

  // Colaboradores visíveis: ativos ou com registos neste dia
  const dayRegistos = useMemo(
    () => registos.filter((r) => r.data === selectedDate),
    [registos, selectedDate]
  );

  const workerIdsWithRecords = useMemo(
    () => new Set(dayRegistos.map((r) => r.colaboradorId)),
    [dayRegistos]
  );

  const displayWorkers = useMemo(
    () => colaboradores.filter((c) => c.ativo || workerIdsWithRecords.has(c.id)),
    [colaboradores, workerIdsWithRecords]
  );

  // Estado local da grelha: matrix[colaboradorId][obraId] = { horasNormais, horasExtra, descricao }
  const [gridData, setGridData] = useState<Record<string, Record<string, CellValue>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQuickObraId, setSelectedQuickObraId] = useState<string>(
    () => activeObras[0]?.id || ''
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Inicializar estado local quando muda a data ou registos externos
  useEffect(() => {
    const initial: Record<string, Record<string, CellValue>> = {};
    displayWorkers.forEach((w) => {
      initial[w.id] = {};
      activeObras.forEach((o) => {
        initial[w.id][o.id] = { horasNormais: 0, horasExtra: 0, descricao: '' };
      });
    });

    dayRegistos.forEach((r) => {
      if (!initial[r.colaboradorId]) {
        initial[r.colaboradorId] = {};
      }
      initial[r.colaboradorId][r.obraId] = {
        horasNormais: r.horasNormais || 0,
        horasExtra: r.horasExtra || 0,
        descricao: r.descricao || '',
      };
    });

    setGridData(initial);
    setHasUnsavedChanges(false);
  }, [selectedDate, displayWorkers, activeObras, dayRegistos]);

  // Atualizar célula individual
  const handleCellChange = (
    workerId: string,
    obraId: string,
    field: 'horasNormais' | 'horasExtra',
    value: number
  ) => {
    if (isLocked) return;
    const cleanVal = Math.max(0, Math.min(24, Math.round(value * 2) / 2));
    setGridData((prev) => {
      const currentWorker = prev[workerId] || {};
      const currentCell = currentWorker[obraId] || {
        horasNormais: 0,
        horasExtra: 0,
        descricao: '',
      };
      return {
        ...prev,
        [workerId]: {
          ...currentWorker,
          [obraId]: {
            ...currentCell,
            [field]: cleanVal,
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  // Preencher 8h normal padrão para todos os colaboradores ativos numa obra selecionada
  const handleAutoFill8h = () => {
    if (isLocked || !selectedQuickObraId) return;

    setGridData((prev) => {
      const updated = { ...prev };
      displayWorkers.forEach((w) => {
        if (!w.ativo) return;
        const currentWorker = updated[w.id] || {};
        // Se ainda não tiver horas nessa obra, preenche 8h normais
        const currentTotal = Object.values(currentWorker).reduce(
          (acc, c) => acc + (c.horasNormais || 0) + (c.horasExtra || 0),
          0
        );
        if (currentTotal === 0) {
          updated[w.id] = {
            ...currentWorker,
            [selectedQuickObraId]: {
              horasNormais: 8,
              horasExtra: 0,
              descricao: 'Trabalho normal de oficina/obra',
            },
          };
        }
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Guardar todas as alterações da grelha de uma só vez
  const handleSaveAll = () => {
    if (isLocked) return;

    // Guardar para cada obra ativa
    activeObras.forEach((obra) => {
      const allocationsForThisObra: {
        colaboradorId: string;
        horasNormais: number;
        horasExtra: number;
        descricao: string;
      }[] = [];

      displayWorkers.forEach((w) => {
        const cell = gridData[w.id]?.[obra.id];
        if (cell && (cell.horasNormais > 0 || cell.horasExtra > 0)) {
          allocationsForThisObra.push({
            colaboradorId: w.id,
            horasNormais: cell.horasNormais,
            horasExtra: cell.horasExtra,
            descricao: cell.descricao,
          });
        }
      });

      onSaveBatch(obra.id, allocationsForThisObra);
    });

    setHasUnsavedChanges(false);
    setSaveSuccessMsg('Grelha de horas gravada com sucesso em todas as aplicações!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Filtrar colaboradores por texto de pesquisa
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return displayWorkers;
    const q = searchQuery.toLowerCase();
    return displayWorkers.filter(
      (w) =>
        w.nome.toLowerCase().includes(q) ||
        w.funcao.toLowerCase().includes(q) ||
        w.pin.includes(q)
    );
  }, [displayWorkers, searchQuery]);

  // Totais por Colaborador
  const getWorkerTotals = (workerId: string) => {
    const cells = gridData[workerId] || {};
    let norm = 0;
    let ext = 0;
    Object.values(cells).forEach((c) => {
      norm += c.horasNormais || 0;
      ext += c.horasExtra || 0;
    });
    return { norm, ext, total: norm + ext };
  };

  // Totais por Obra
  const getObraTotals = (obraId: string) => {
    let norm = 0;
    let ext = 0;
    displayWorkers.forEach((w) => {
      const cell = gridData[w.id]?.[obraId];
      if (cell) {
        norm += cell.horasNormais || 0;
        ext += cell.horasExtra || 0;
      }
    });
    return { norm, ext, total: norm + ext };
  };

  // Totais Gerais
  const grandTotals = useMemo(() => {
    let norm = 0;
    let ext = 0;
    displayWorkers.forEach((w) => {
      const cells = gridData[w.id] || {};
      Object.values(cells).forEach((c) => {
        norm += c.horasNormais || 0;
        ext += c.horasExtra || 0;
      });
    });
    return { norm, ext, total: norm + ext };
  }, [displayWorkers, gridData]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Barra de Controlo Superior da Grelha */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold leading-tight">
              Folha de Ponto Rápida (Grelha PC)
            </h2>
            <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
              Teclado / Matriz
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Lançamento rápido e direto de horas para todos os colaboradores nas obras em curso
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preencher 8h padrão */}
          {!isLocked && activeObras.length > 0 && (
            <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
              <select
                value={selectedQuickObraId}
                onChange={(e) => setSelectedQuickObraId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold px-2 py-1 outline-none cursor-pointer max-w-[140px] truncate"
              >
                {activeObras.map((o) => (
                  <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                    {o.codigo} - {o.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAutoFill8h}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                title="Atribuir 8h a todos os colaboradores sem registo nesta obra"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Preencher 8h</span>
              </button>
            </div>
          )}

          {/* Botão Guardar Alterações */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isLocked || !hasUnsavedChanges}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/40 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{hasUnsavedChanges ? 'Gravar Alterações' : 'Gravado'}</span>
          </button>

          {/* Validar e Bloquear */}
          {userRole === 'administrador' && (
            <button
              type="button"
              onClick={isLocked ? onUnlockDay : onValidateAndLockDay}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Validar e Bloquear</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Banner de Mensagem de Sucesso */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Barra de Filtro e Pesquisa */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar colaborador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <span>{filteredWorkers.length} colaboradores</span>
          <span>·</span>
          <span>{activeObras.length} obras ativas</span>
          {hasUnsavedChanges && (
            <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[11px] animate-pulse">
              ● Alterações por gravar
            </span>
          )}
        </div>
      </div>

      {/* Tabela Grelha Desktop (Widescreen Matrix) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold border-b border-slate-200">
              <th className="py-3 px-4 w-60 sticky left-0 bg-slate-100 z-10">
                Colaborador
              </th>
              {activeObras.map((obra) => (
                <th key={obra.id} className="py-3 px-3 text-center border-l border-slate-200/80">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[11px] font-black text-slate-900">
                      {obra.codigo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]" title={obra.nome}>
                      {obra.nome}
                    </span>
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-center border-l border-slate-200 w-36 bg-slate-100/90">
                Total Dia
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredWorkers.map((worker) => {
              const totals = getWorkerTotals(worker.id);
              const is8h = totals.total === 8;
              const isOver8h = totals.total > 8;
              const hasHours = totals.total > 0;

              return (
                <tr
                  key={worker.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !worker.ativo ? 'bg-slate-50/50 text-slate-500' : ''
                  }`}
                >
                  {/* Coluna 1: Dados do Colaborador (Sticky na rolagem horizontal) */}
                  <td className="py-2.5 px-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
                        style={{ backgroundColor: worker.cor }}
                      >
                        {worker.nome
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {worker.nome}
                          </span>
                          {!worker.ativo && (
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1 py-0.2 rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {worker.funcao} · PIN: {worker.pin}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Colunas das Obras: Células com inputs de Normais (N) e Extra (E) */}
                  {activeObras.map((obra) => {
                    const cell = gridData[worker.id]?.[obra.id] || {
                      horasNormais: 0,
                      horasExtra: 0,
                      descricao: '',
                    };
                    const cellHasHours = cell.horasNormais > 0 || cell.horasExtra > 0;

                    return (
                      <td
                        key={obra.id}
                        className={`py-2 px-2 text-center border-l border-slate-100 ${
                          cellHasHours ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Horas Normais */}
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">N</span>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              disabled={isLocked}
                              value={cell.horasNormais === 0 ? '' : cell.horasNormais}
                              placeholder="0"
                              onChange={(e) =>
                                handleCellChange(
                                  worker.id,
                                  obra.id,
                                  'horasNormais',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className={`w-12 h-8 text-center text-xs font-bold rounded-lg border transition-colors outline-none ${
                                cell.horasNormais > 0
                                  ? 'bg-white border-blue-500 text-blue-700 shadow-2xs'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-600 focus:bg-white focus:border-amber-400'
                              }`}
                            />
                          </div>

                          {/* Horas Extra */}
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-amber-700 uppercase">E</span>
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              disabled={isLocked}
                              value={cell.horasExtra === 0 ? '' : cell.horasExtra}
                              placeholder="0"
                              onChange={(e) =>
                                handleCellChange(
                                  worker.id,
                                  obra.id,
                                  'horasExtra',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className={`w-12 h-8 text-center text-xs font-bold rounded-lg border transition-colors outline-none ${
                                cell.horasExtra > 0
                                  ? 'bg-amber-50 border-amber-500 text-amber-700 font-black shadow-2xs'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-400 focus:bg-white focus:border-amber-400'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Coluna Final: Total Horas do Colaborador no Dia */}
                  <td className="py-2 px-4 text-center border-l border-slate-200 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-sm font-black tabular-nums ${
                          isOver8h
                            ? 'text-amber-600'
                            : is8h
                            ? 'text-emerald-600'
                            : hasHours
                            ? 'text-blue-600'
                            : 'text-slate-300'
                        }`}
                      >
                        {totals.total.toFixed(1)} h
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          isOver8h
                            ? 'bg-amber-100 text-amber-900'
                            : is8h
                            ? 'bg-emerald-100 text-emerald-900'
                            : hasHours
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {isOver8h
                          ? `+${totals.ext}h extra`
                          : is8h
                          ? '8h Completo'
                          : hasHours
                          ? `${totals.norm}h base`
                          : 'Sem horas'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Rodapé: Totais por Obra e Total Geral */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-amber-500">
              <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>TOTAIS DO DIA</span>
                </div>
              </td>
              {activeObras.map((obra) => {
                const totals = getObraTotals(obra.id);
                return (
                  <td key={obra.id} className="py-3 px-3 text-center border-l border-slate-800">
                    <span className="text-sm font-black text-amber-400 tabular-nums block">
                      {totals.total.toFixed(1)} h
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block">
                      {totals.norm}h N · {totals.ext}h E
                    </span>
                  </td>
                );
              })}
              <td className="py-3 px-4 text-center border-l border-slate-800 bg-amber-500 text-slate-950">
                <span className="text-base font-black tabular-nums block leading-tight">
                  {grandTotals.total.toFixed(1)} h
                </span>
                <span className="text-[10px] font-bold block uppercase tracking-wider">
                  Total Geral
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dica de Teclado no Rodapé */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Dica PC:</span>
          <span>Utilize a tecla <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[11px] text-slate-800 shadow-2xs">Tab</kbd> para navegar rapidamente entre as células da tabela.</span>
        </div>
        {hasUnsavedChanges && (
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Gravar Todas as Horas</span>
          </button>
        )}
      </div>
    </div>
  );
};
