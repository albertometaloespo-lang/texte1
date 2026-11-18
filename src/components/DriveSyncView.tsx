import React, { useState } from 'react';
import {
  Cloud,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Plus,
  FolderOpen,
  LogOut,
  AlertCircle,
  Database,
  RotateCcw,
  Trash2,
  Smartphone,
  Download,
  Upload,
  Share2,
  Link as LinkIcon,
  Layers,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSyncConfig, GoogleDriveSpreadsheet, Colaborador, Obra, RegistoHoras, ValidacaoDia } from '../types';
import { GoogleSheetsService } from '../services/googleSheets';
import { hasActiveGoogleToken } from '../services/googleAuth';

interface DriveSyncViewProps {
  user: User | null;
  syncConfig: GoogleSyncConfig;
  colaboradores: Colaborador[];
  obras: Obra[];
  registos: RegistoHoras[];
  validacoes?: Record<string, ValidacaoDia>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateSyncConfig: (cfg: GoogleSyncConfig) => void;
  onSyncNow: () => Promise<void>;
  onPullFromDrive?: () => Promise<void>;
  onPushToDrive?: () => Promise<void>;
  onResetData: () => void;
  onClearAllRegistos?: () => void;
  onOpenMobileModal?: () => void;
  onOpenShareDatabaseModal?: () => void;
  onExportJson?: () => void;
  onImportJson?: (data: any) => void;
  onWipeEverything?: () => void;
  isLiveConnected?: boolean;
}

export const DriveSyncView: React.FC<DriveSyncViewProps> = ({
  user,
  syncConfig,
  colaboradores,
  obras,
  registos,
  validacoes = {},
  onSignIn,
  onSignOut,
  onUpdateSyncConfig,
  onSyncNow,
  onPullFromDrive,
  onPushToDrive,
  onResetData,
  onClearAllRegistos,
  onOpenMobileModal,
  onOpenShareDatabaseModal,
  onExportJson,
  onImportJson,
  onWipeEverything,
  isLiveConnected = true,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<GoogleDriveSpreadsheet[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isConnectingManual, setIsConnectingManual] = useState(false);
  const [showManualSection, setShowManualSection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Criar nova base central formatada no Google Drive
  const handleCreateSheet = async () => {
    setIsCreating(true);
    setStatusMessage(null);
    try {
      if (!hasActiveGoogleToken()) {
        await onSignIn();
      }
      const result = await GoogleSheetsService.createTimesheetSpreadsheet(
        `Metaloespo - Base de Dados Central`
      );

      // Sincronizar dados iniciais
      await GoogleSheetsService.syncAllToSpreadsheet(
        result.id,
        colaboradores,
        obras,
        registos,
        validacoes
      );

      onUpdateSyncConfig({
        ...syncConfig,
        spreadsheetId: result.id,
        spreadsheetName: result.name,
        spreadsheetUrl: result.url,
        lastSyncTime: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      });

      setStatusMessage({
        text: `Base de Dados Central "${result.name}" criada com sucesso no seu Google Drive!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: err.message || 'Erro ao criar folha de cálculo no Google Drive.',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Carregar lista de folhas existentes no Drive
  const handleListSheets = async () => {
    setIsListing(true);
    setStatusMessage(null);
    try {
      if (!hasActiveGoogleToken()) {
        await onSignIn();
      }
      const files = await GoogleSheetsService.listSpreadsheets();
      setAvailableSheets(files);
      setShowFilePicker(true);
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Erro ao procurar ficheiros no Drive.',
        type: 'error',
      });
    } finally {
      setIsListing(false);
    }
  };

  // Selecionar uma folha existente
  const handleSelectSheet = (sheet: GoogleDriveSpreadsheet) => {
    onUpdateSyncConfig({
      ...syncConfig,
      spreadsheetId: sheet.id,
      spreadsheetName: sheet.name,
      spreadsheetUrl: sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}`,
      lastSyncTime: null,
    });
    setShowFilePicker(false);
    setStatusMessage({
      text: `Ligado à tabela "${sheet.name}". Clique em "Sincronizar Agora" para enviar os registos.`,
      type: 'success',
    });
  };

  // Ligar manualmente através de um Link ou ID do Google Sheets
  const handleConnectManual = async () => {
    if (!manualInput.trim()) {
      setStatusMessage({
        text: 'Por favor, insira o link ou ID da folha de cálculo do Google Sheets.',
        type: 'error',
      });
      return;
    }

    const extractedId = GoogleSheetsService.extractSpreadsheetId(manualInput.trim());
    if (!extractedId) {
      setStatusMessage({
        text: 'Não foi possível detetar um ID de folha de cálculo válido. Verifique o link introduzido.',
        type: 'error',
      });
      return;
    }

    setIsConnectingManual(true);
    setStatusMessage(null);
    try {
      let sheetName = 'Base de Dados Partilhada';
      let sheetUrl = `https://docs.google.com/spreadsheets/d/${extractedId}`;

      // Tentar obter o nome real da folha se o utilizador estiver autenticado
      if (user) {
        try {
          const info = await GoogleSheetsService.getSpreadsheetInfo(extractedId);
          sheetName = info.name;
          sheetUrl = info.url;
        } catch {
          // Continua mesmo se não conseguir obter metadados (ex: folha partilhada publicamente)
        }
      }

      const updatedConfig: GoogleSyncConfig = {
        ...syncConfig,
        spreadsheetId: extractedId,
        spreadsheetName: sheetName,
        spreadsheetUrl: sheetUrl,
        lastSyncTime: null,
      };

      onUpdateSyncConfig(updatedConfig);
      setManualInput('');
      setShowManualSection(false);

      setStatusMessage({
        text: `Ligado com sucesso à base de dados ID: ${extractedId}! Clique em "Sincronizar Agora" ou "Descarregar" para carregar os registos.`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Erro ao ligar à folha de cálculo indicada.',
        type: 'error',
      });
    } finally {
      setIsConnectingManual(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      if (!hasActiveGoogleToken()) {
        await onSignIn();
      }
      await onSyncNow();
      setStatusMessage({
        text: 'Dados sincronizados com sucesso na folha do Google Drive!',
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Erro ao sincronizar com o Google Drive.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 leading-tight">Base de Dados Central no Google Drive</h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          A folha de cálculo no Google Drive funciona como o servidor central e fonte única de verdade para todos os telemóveis, computadores e aplicações da Metaloespo.
        </p>
      </div>

      {/* Alertas de Estado */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* NOVO BANNER: PARTILHA MULTI-APLICAÇÃO */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 text-white shadow-sm border border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Partilhar a Mesma Base em Várias Aplicações</h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                  Multi-App
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ligue múltiplos telemóveis, outros navegadores, Microsoft Excel, Power BI ou APIs à mesma folha central.
              </p>
            </div>
          </div>

          {onOpenShareDatabaseModal && (
            <button
              onClick={onOpenShareDatabaseModal}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-98 shrink-0 cursor-pointer min-h-[40px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Ver Opções de Partilha</span>
            </button>
          )}
        </div>

        {/* Badges de Sistemas Compatíveis */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-300">
          <span className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-amber-400" /> Outros Telemóveis
          </span>
          <span className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" /> Excel & Power BI (Live CSV)
          </span>
          <span className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-400" /> AppSheet & No-Code
          </span>
          <span className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Google Sheets (IMPORTRANGE)
          </span>
        </div>

        {/* Estado da Rede em Tempo Real */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/30 border border-white/10 text-xs">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <div>
            <span className="font-bold text-white block">
              {isLiveConnected
                ? 'Sincronização em Tempo Real Ativa (SSE)'
                : 'A restabelecer ligação em direto...'}
            </span>
            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
              {isLiveConnected
                ? 'Qualquer hora gravada num telemóvel surge instantaneamente em todos os outros telemóveis e computadores ligados à aplicação.'
                : 'A tentar reconectar ao servidor de transmissão em tempo real.'}
            </p>
          </div>
        </div>

        {onOpenShareDatabaseModal && (
          <div className="pt-1 sm:hidden">
            <button
              onClick={onOpenShareDatabaseModal}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-98 cursor-pointer min-h-[42px]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Ver Opções de Partilha e Conexão</span>
            </button>
          </div>
        )}
      </div>

      {/* CARD 1: ESTADO DA AUTENTICAÇÃO */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Conta Google Administradora
        </h3>

        {user ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utilizador'}
                    className="w-10 h-10 rounded-full border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {user.displayName?.[0] || user.email?.[0] || 'G'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {user.displayName || 'Utilizador Google'}
                  </p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer min-h-[38px]"
                title="Desconectar conta Google e esquecer credenciais deste dispositivo"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            {/* Indicador de Credenciais e Acesso ao Google Drive */}
            {hasActiveGoogleToken() ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Acesso ao Google Drive Ativo:</strong> pode criar, selecionar e sincronizar folhas de cálculo em tempo real.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Acesso ao Google Drive pendente ou expirado:</strong> clique no botão abaixo para autorizar e restabelecer a sincronização com o Google Drive.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-2xs transition-transform active:scale-98 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Autorizar / Renovar Acesso ao Google Drive</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Inicie sessão com a sua conta Google para ligar a aplicação ao seu Google Drive. <strong>Apenas necessita de entrar a 1ª vez</strong>; as credenciais ficarão guardadas permanentemente neste dispositivo.
            </p>

            {/* Botão Oficial Sign in with Google */}
            <button
              onClick={onSignIn}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl shadow-2xs hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer min-h-[48px]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="text-sm font-semibold text-slate-700">Iniciar Sessão com o Google (apenas 1ª vez)</span>
            </button>
          </div>
        )}
      </div>

      {/* CARD 2: TABELA LIGADA NO GOOGLE DRIVE */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Base de Dados Central no Drive
          </h3>
          {syncConfig.spreadsheetId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Servidor Central Ativo
            </span>
          )}
        </div>

        {syncConfig.spreadsheetId ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {syncConfig.spreadsheetName || 'Metaloespo - Base de Dados Central'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ID Central: <span className="font-mono">{syncConfig.spreadsheetId.slice(0, 18)}...</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onOpenShareDatabaseModal && (
                  <button
                    onClick={onOpenShareDatabaseModal}
                    title="Partilhar com outras aplicações"
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-300 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Partilhar</span>
                  </button>
                )}

                {syncConfig.spreadsheetUrl && (
                  <a
                    href={syncConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5"
                  >
                    <span>Abrir Folha</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Estatísticas da Base de Dados Central */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-1">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registos</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{registos.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Colaboradores</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{colaboradores.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Obras em Curso</span>
                <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                  {obras.filter((o) => o.estado === 'em_curso').length}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Validações</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{Object.keys(validacoes).length}</span>
              </div>
            </div>

            {syncConfig.lastSyncTime && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <ClockIcon className="w-3 h-3 text-emerald-600" />
                <span>Última sincronização com o Drive: hoje às {syncConfig.lastSyncTime}</span>
              </div>
            )}

            {/* Botões de Ação na Base Central */}
            <div className="pt-1 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-transform active:scale-[0.98] min-h-[44px] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'A sincronizar com o Drive...' : 'Sincronizar Agora (Bidirecional)'}</span>
                </button>
                <button
                  onClick={handleListSheets}
                  disabled={isListing}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                >
                  Alterar Ficheiro
                </button>
              </div>

              {/* Sub-ações Pull / Push explícitas */}
              <div className="flex items-center gap-2 pt-1">
                {onPullFromDrive && (
                  <button
                    onClick={onPullFromDrive}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                    title="Descarregar a versão mais recente diretamente do Google Drive"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Descarregar do Drive</span>
                  </button>
                )}
                {onPushToDrive && (
                  <button
                    onClick={onPushToDrive}
                    disabled={isSyncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                    title="Enviar todos os registos e configurações locais para o Google Drive"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Forçar Envio para o Drive</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Todos os registos inseridos pelos colaboradores em qualquer telemóvel são consolidados nesta folha de cálculo única no Google Drive.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Pode criar automaticamente a Base de Dados Central no seu Google Drive, escolher um ficheiro existente ou ligar diretamente pelo link/ID de outra aplicação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleCreateSheet}
                disabled={isCreating}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-2xs transition-transform active:scale-98 min-h-[48px] cursor-pointer"
              >
                {isCreating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Criar Base Central no Drive</span>
              </button>

              <button
                onClick={handleListSheets}
                disabled={isListing}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors min-h-[48px] cursor-pointer"
              >
                {isListing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
                <span>Escolher do Google Drive</span>
              </button>
            </div>
          </div>
        )}

        {/* LIGAÇÃO MANUAL POR LINK OU ID (CRUCIAL PARA LIGAR ENTRE VÁRIAS APLICAÇÕES) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Ligar a uma Base de Dados já existente (Link ou ID)</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Ligue esta app à folha central de outra aplicação colando o URL ou ID do Google Sheets
              </p>
            </div>
            <button
              onClick={() => setShowManualSection(!showManualSection)}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-2 py-1 cursor-pointer"
            >
              {showManualSection ? 'Ocultar' : 'Inserir Link/ID'}
            </button>
          </div>

          {showManualSection && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
              <label className="text-[11px] font-bold text-slate-700 block">
                URL da Folha de Cálculo ou Spreadsheet ID:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/... ou ID"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  onClick={handleConnectManual}
                  disabled={isConnectingManual}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[38px] shrink-0"
                >
                  {isConnectingManual ? 'A ligar...' : 'Ligar e Sincronizar'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Dica: Pode copiar o URL completo diretamente da barra de endereço do seu navegador.
              </p>
            </div>
          )}
        </div>

        {/* Sincronização Automática */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Sincronização Automática Contínua</p>
            <p className="text-[11px] text-slate-500">
              Atualizar a base de dados do Drive em segundo plano e ao gravar registos
            </p>
          </div>
          <input
            type="checkbox"
            checked={syncConfig.autoSync}
            onChange={(e) =>
              onUpdateSyncConfig({ ...syncConfig, autoSync: e.target.checked })
            }
            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* CARD 3: ESTRUTURA DA TABELA DE EXCEL / SHEETS */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Estrutura da Base de Dados no Google Drive
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          O ficheiro central no Google Drive contém 4 separadores padronizados que qualquer aplicação externa pode consultar:
        </p>
        <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside">
          <li>
            <strong className="text-slate-900">Registos_Horas:</strong> Registo diário de horas normais e suplementares por colaborador e por obra, descrição da tarefa e estado de validação.
          </li>
          <li>
            <strong className="text-slate-900">Colaboradores:</strong> Identificação da equipa, função, contacto, horas base e PIN pessoal.
          </li>
          <li>
            <strong className="text-slate-900">Obras:</strong> Código da obra, denominação, cliente, localização e estado (apenas obras em curso surgem nos registos diários).
          </li>
          <li>
            <strong className="text-slate-900">Validacoes_Dias:</strong> Registo das datas validadas e bloqueadas pelo Administrador contra alterações.
          </li>
        </ul>
      </div>

      {/* CARD: ACESSO NO TELEMÓVEL */}
      {onOpenMobileModal && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Testar e Utilizar no Telemóvel</h4>
              <p className="text-[11px] text-slate-300">
                Gere um Código QR para abrir a aplicação e registar horas diretamente na obra
              </p>
            </div>
          </div>
          <button
            onClick={onOpenMobileModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-98 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
          >
            <Smartphone className="w-4 h-4" />
            <span>Ver Código QR</span>
          </button>
        </div>
      )}

      {/* CARD 4: GESTÃO DE DADOS (BACKUP JSON, LIMPEZA E REPOSIÇÃO) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Cópia de Segurança e Gestão de Dados
        </h3>

        {/* Export / Import JSON */}
        {(onExportJson || onImportJson) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Transferência Offline (JSON)</h4>
              <p className="text-[11px] text-slate-500">
                Exportar cópia de segurança completa ou importar de outra aplicação
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onExportJson && (
                <button
                  onClick={onExportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar JSON</span>
                </button>
              )}
              {onOpenShareDatabaseModal && (
                <button
                  onClick={onOpenShareDatabaseModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Opções Multi-App</span>
                </button>
              )}
            </div>
          </div>
        )}

        {onClearAllRegistos && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-red-700">Limpar Registos de Horas</h4>
              <p className="text-[11px] text-slate-500">
                Apagar permanentemente todos os registos de horas diárias da aplicação
              </p>
            </div>
            <button
              onClick={onClearAllRegistos}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer min-h-[40px] shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Limpar Todos os Registos ({registos.length})</span>
            </button>
          </div>
        )}

        {onWipeEverything && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-red-700">Limpar Tudo (Registos, Colaboradores e Obras)</h4>
              <p className="text-[11px] text-slate-500">
                Apagar permanentemente todos os registos, colaboradores e obras em todas as aplicações
              </p>
            </div>
            <button
              onClick={onWipeEverything}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer min-h-[40px] shrink-0 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              <span>Limpar Tudo (Zerar Base)</span>
            </button>
          </div>
        )}

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Dados de Demonstração</h4>
            <p className="text-[11px] text-slate-500">Repor os dados de exemplo de obras e colaboradores</p>
          </div>
          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repor</span>
          </button>
        </div>
      </div>

      {/* MODAL: SELETOR DE FOLHAS DO GOOGLE DRIVE */}
      {showFilePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Escolha a Folha no seu Drive</h3>
              <button
                onClick={() => setShowFilePicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {availableSheets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhuma folha de cálculo encontrada no seu Drive.
                </div>
              ) : (
                availableSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    onClick={() => handleSelectSheet(sheet)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{sheet.name}</p>
                        <p className="text-[10px] text-slate-400">
                          Modificado: {sheet.modifiedTime?.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 shrink-0">Selecionar</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowFilePicker(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
