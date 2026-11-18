import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Building2,
  Users,
  Clock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Colaborador, Obra, RegistoHoras, UserRole, ValidacaoDia } from '../types';

interface HistoryViewProps {
  colaboradores: Colaborador[];
  obras: Obra[];
  registos: RegistoHoras[];
  validacoes?: Record<string, ValidacaoDia>;
  userRole: UserRole;
  currentWorkerId: string | null;
  onNavigateToDate: (date: string) => void;
  onEditRegisto?: (registo: RegistoHoras) => void;
  onDeleteRegisto?: (registo: RegistoHoras) => void;
  onOpenExportPdf?: () => void;
}

type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'ultimos_30' | 'todos' | 'personalizado';

export const HistoryView: React.FC<HistoryViewProps> = ({
  colaboradores,
  obras,
  registos,
  validacoes = {},
  userRole,
  currentWorkerId,
  onNavigateToDate,
  onEditRegisto,
  onDeleteRegisto,
  onOpenExportPdf,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<string>(
    userRole === 'colaborador' && currentWorkerId ? currentWorkerId : 'todos'
  );
  const [selectedObra, setSelectedObra] = useState<string>('todos');
  const [selectedEstado, setSelectedEstado] = useState<'todos' | 'validados' | 'abertos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'data' | 'obra' | 'colaborador'>('data');

  // Mapas para resolução rápida de nomes e metadados
  const colMap = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);
  const obrMap = useMemo(() => new Map(obras.map((o) => [o.id, o])), [obras]);

  // Se o utilizador for colaborador, bloqueia o filtro ao seu próprio utilizador
  const activeWorkerId = userRole === 'colaborador' ? currentWorkerId : selectedColaborador;
  const currentWorker = currentWorkerId ? colMap.get(currentWorkerId) : null;

  // Filtragem dos registos
  const filteredRegistos = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return registos.filter((r) => {
      // 1. Filtro de Colaborador
      if (userRole === 'colaborador') {
        if (currentWorkerId && r.colaboradorId !== currentWorkerId) return false;
      } else if (selectedColaborador !== 'todos' && r.colaboradorId !== selectedColaborador) {
        return false;
      }

      // 2. Filtro de Obra
      if (selectedObra !== 'todos' && r.obraId !== selectedObra) {
        return false;
      }

      // 3. Filtro de Estado (Validação)
      const isValidado = Boolean(r.validado || r.bloqueado || validacoes[r.data]?.bloqueado);
      if (selectedEstado === 'validados' && !isValidado) return false;
      if (selectedEstado === 'abertos' && isValidado) return false;

      // 4. Filtro de Período Temporal
      if (periodo === 'hoje') {
        if (r.data !== todayStr) return false;
      } else if (periodo === 'semana') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekStr = weekAgo.toISOString().split('T')[0];
        if (r.data < weekStr || r.data > todayStr) return false;
      } else if (periodo === 'mes') {
        const monthPrefix = today.toISOString().slice(0, 7);
        if (!r.data.startsWith(monthPrefix)) return false;
      } else if (periodo === 'mes_anterior') {
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthPrefix = prevMonth.toISOString().slice(0, 7);
        if (!r.data.startsWith(prevMonthPrefix)) return false;
      } else if (periodo === 'ultimos_30') {
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        if (r.data < monthAgoStr || r.data > todayStr) return false;
      } else if (periodo === 'personalizado') {
        if (dataInicio && r.data < dataInicio) return false;
        if (dataFim && r.data > dataFim) return false;
      }

      // 5. Pesquisa Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const col = colMap.get(r.colaboradorId);
        const obr = obrMap.get(r.obraId);
        const matchCol = col?.nome?.toLowerCase().includes(term);
        const matchObrNome = obr?.nome?.toLowerCase().includes(term);
        const matchObrCod = obr?.codigo?.toLowerCase().includes(term);
        const matchDesc = r.descricao?.toLowerCase().includes(term);
        const matchData = r.data.includes(term);
        if (!matchCol && !matchObrNome && !matchObrCod && !matchDesc && !matchData) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [
    registos,
    userRole,
    currentWorkerId,
    selectedColaborador,
    selectedObra,
    selectedEstado,
    periodo,
    dataInicio,
    dataFim,
    searchTerm,
    validacoes,
    colMap,
    obrMap,
  ]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    let horasNormais = 0;
    let horasExtra = 0;
    const diasSet = new Set<string>();
    const obrasSet = new Set<string>();
    const colsSet = new Set<string>();

    filteredRegistos.forEach((r) => {
      horasNormais += r.horasNormais || 0;
      horasExtra += r.horasExtra || 0;
      diasSet.add(r.data);
      obrasSet.add(r.obraId);
      colsSet.add(r.colaboradorId);
    });

    const totalHoras = horasNormais + horasExtra;

    return {
      totalHoras: Number(totalHoras.toFixed(2)),
      horasNormais: Number(horasNormais.toFixed(2)),
      horasExtra: Number(horasExtra.toFixed(2)),
      diasTrabalhados: diasSet.size,
      totalObras: obrasSet.size,
      totalColaboradores: colsSet.size,
    };
  }, [filteredRegistos]);

  // Exportar dados filtrados para CSV
  const handleExportCsv = () => {
    if (filteredRegistos.length === 0) return;

    const headers = [
      'Data',
      'Colaborador',
      'Função',
      'Código Obra',
      'Nome da Obra',
      'Cliente',
      'Horas Normais',
      'Horas Extra',
      'Total Horas',
      'Descrição',
      'Estado',
    ];

    const rows = filteredRegistos.map((r) => {
      const col = colMap.get(r.colaboradorId);
      const obr = obrMap.get(r.obraId);
      const isValid = Boolean(r.validado || r.bloqueado || validacoes[r.data]?.bloqueado);
      return [
        r.data,
        `"${col?.nome || 'Desconhecido'}"`,
        `"${col?.funcao || ''}"`,
        `"${obr?.codigo || ''}"`,
        `"${obr?.nome || 'Obra Removida'}"`,
        `"${obr?.cliente || ''}"`,
        r.horasNormais,
        r.horasExtra,
        Number((r.horasNormais + r.horasExtra).toFixed(2)),
        `"${(r.descricao || '').replace(/"/g, '""')}"`,
        isValid ? 'Validado' : 'Em Aberto',
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_horas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Agrupamento de registos por Data
  const groupedByDate = useMemo(() => {
    const map = new Map<string, RegistoHoras[]>();
    filteredRegistos.forEach((r) => {
      if (!map.has(r.data)) map.set(r.data, []);
      map.get(r.data)!.push(r);
    });
    return Array.from(map.entries());
  }, [filteredRegistos]);

  // Formatar data em português
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-6xl mx-auto">
      {/* Cabeçalho do Histórico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {userRole === 'colaborador' && currentWorker
                  ? `Histórico de ${currentWorker.nome}`
                  : 'Histórico Completo de Horas'}
              </h2>
              <p className="text-xs text-slate-500">
                {userRole === 'colaborador'
                  ? 'Consulte todos os seus registos de trabalho por obra e por dia'
                  : 'Arquivo cronológico com pesquisa e filtros de todos os registos da empresa'}
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2">
          {onOpenExportPdf && (
            <button
              onClick={onOpenExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar PDF</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            disabled={filteredRegistos.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer min-h-[38px]"
            title="Descarregar ficheiro CSV compatível com Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Horas</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {stats.totalHoras.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">horas</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {stats.diasTrabalhados} dia(s) com registo
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Horas Normais</span>
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
              {stats.horasNormais.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">h</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Base regular diária</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Horas Extra</span>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
              {stats.horasExtra.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">h</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Trabalho suplementar</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Obras Registadas</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              {stats.totalObras}
            </span>
            <span className="text-xs font-semibold text-slate-500">obras</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {userRole === 'administrador'
              ? `${stats.totalColaboradores} colaborador(es)`
              : 'estaleiros diferentes'}
          </p>
        </div>
      </div>

      {/* Caixa de Filtros */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-amber-600" />
            <span>Filtros do Histórico</span>
          </div>

          {(searchTerm ||
            selectedObra !== 'todos' ||
            selectedEstado !== 'todos' ||
            periodo !== 'mes' ||
            (userRole === 'administrador' && selectedColaborador !== 'todos')) && (
            <button
              onClick={() => {
                setPeriodo('mes');
                setSelectedObra('todos');
                setSelectedEstado('todos');
                setSelectedColaborador('todos');
                setSearchTerm('');
                setDataInicio('');
                setDataFim('');
              }}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por obra, colaborador, tarefa ou data (Ex: OBR-24, Maia, Carlos, 2024-05)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>

        {/* Seleção de Período Rápido */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Período:</span>
          {(
            [
              { id: 'hoje', label: 'Hoje' },
              { id: 'semana', label: 'Últimos 7 Dias' },
              { id: 'mes', label: 'Este Mês' },
              { id: 'mes_anterior', label: 'Mês Anterior' },
              { id: 'ultimos_30', label: 'Últimos 30 Dias' },
              { id: 'todos', label: 'Todo o Histórico' },
              { id: 'personalizado', label: 'Personalizado' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                periodo === p.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Inputs de Data Personalizada */}
        {periodo === 'personalizado' && (
          <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-700">Intervalo de Datas:</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Dropdowns de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Filtro de Colaborador (apenas para Admin) */}
          {userRole === 'administrador' ? (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Colaborador:
              </label>
              <select
                value={selectedColaborador}
                onChange={(e) => setSelectedColaborador(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
              >
                <option value="todos">Todos os Colaboradores ({colaboradores.length})</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.funcao ? `(${c.funcao})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Colaborador Ativo:
              </label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentWorker?.cor || '#f59e0b' }}
                />
                <span>{currentWorker?.nome || 'Acesso Pessoal'}</span>
              </div>
            </div>
          )}

          {/* Filtro de Obra */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Obra / Estaleiro:
            </label>
            <select
              value={selectedObra}
              onChange={(e) => setSelectedObra(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="todos">Todas as Obras ({obras.length})</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo} - {o.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Estado de Validação */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Estado do Registo:
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            >
              <option value="todos">Todos os Estados</option>
              <option value="validados">Validados / Bloqueados</option>
              <option value="abertos">Em Aberto / Editáveis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Registos Históricos */}
      <div className="space-y-3">
        {filteredRegistos.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Nenhum registo histórico encontrado</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Não existem horas registadas que correspondam aos filtros selecionados. Experimente
              alargar o período ou limpar a pesquisa.
            </p>
          </div>
        ) : (
          groupedByDate.map(([dateStr, items]) => {
            const dayValid = validacoes[dateStr]?.bloqueado;
            const dayTotalHoras = items.reduce(
              (acc, curr) => acc + (curr.horasNormais || 0) + (curr.horasExtra || 0),
              0
            );

            return (
              <div
                key={dateStr}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
              >
                {/* Cabeçalho do Dia */}
                <div className="p-3 sm:px-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {dateStr.slice(8, 10)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {formatFriendlyDate(dateStr)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">({dateStr})</span>
                        {dayValid && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Validado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {items.length} registo(s) neste dia
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Total Dia
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {dayTotalHoras.toFixed(1)} h
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigateToDate(dateStr)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-transform active:scale-98 cursor-pointer shadow-2xs shrink-0"
                      title="Abrir a folha de registo deste dia"
                    >
                      <span>Ver Dia</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Itens do Dia */}
                <div className="divide-y divide-slate-100">
                  {items.map((reg) => {
                    const col = colMap.get(reg.colaboradorId);
                    const obr = obrMap.get(reg.obraId);
                    const totalRegHoras = (reg.horasNormais || 0) + (reg.horasExtra || 0);
                    const isLocked = Boolean(reg.validado || reg.bloqueado || dayValid);

                    return (
                      <div
                        key={reg.id}
                        className="p-3 sm:px-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {/* Avatar do Colaborador */}
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs mt-0.5 sm:mt-0"
                            style={{ backgroundColor: col?.cor || '#f59e0b' }}
                          >
                            {col?.nome
                              ? col.nome
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                              : 'C'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {col?.nome || 'Colaborador'}
                              </span>

                              {obr && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0 shadow-2xs"
                                  style={{ backgroundColor: obr.cor || '#059669' }}
                                >
                                  {obr.codigo} - {obr.nome}
                                </span>
                              )}
                            </div>

                            {reg.descricao && (
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1 italic">
                                "{reg.descricao}"
                              </p>
                            )}

                            {obr?.cliente && (
                              <p className="text-[10px] text-slate-400">
                                Cliente: {obr.cliente} {obr.localizacao ? `• ${obr.localizacao}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Breakdown de Horas e Ações */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="flex items-center gap-3 text-right">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-slate-400 block">Normais / Extra</span>
                              <span className="text-xs font-semibold text-slate-700">
                                <span className="font-bold text-blue-600">{reg.horasNormais}h</span>
                                {reg.horasExtra > 0 && (
                                  <span className="text-amber-600 ml-1">+{reg.horasExtra}h</span>
                                )}
                              </span>
                            </div>

                            <div className="text-right min-w-[55px]">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Total
                              </span>
                              <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                                {totalRegHoras.toFixed(1)} h
                              </span>
                            </div>
                          </div>

                          {/* Ações Administrador */}
                          {userRole === 'administrador' && (
                            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                              {onEditRegisto && !isLocked && (
                                <button
                                  onClick={() => onEditRegisto(reg)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar este registo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteRegisto && !isLocked && (
                                <button
                                  onClick={() => onDeleteRegisto(reg)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar este registo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
