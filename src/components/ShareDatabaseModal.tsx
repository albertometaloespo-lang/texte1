import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Share2,
  FileSpreadsheet,
  Layers,
  Smartphone,
  Laptop,
  Code,
  ShieldCheck,
  AlertCircle,
  Download,
  Upload,
  Database,
  Sparkles,
  Link as LinkIcon,
  Table,
  Cpu,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { GoogleSyncConfig, Colaborador, Obra, RegistoHoras, ValidacaoDia } from '../types';

interface ShareDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: GoogleSyncConfig;
  colaboradores: Colaborador[];
  obras: Obra[];
  registos: RegistoHoras[];
  validacoes?: Record<string, ValidacaoDia>;
  onExportJson?: () => void;
  onImportJson?: (jsonData: any) => void;
}

type TabType = 'apps' | 'excel' | 'api' | 'permissoes' | 'backup';

export const ShareDatabaseModal: React.FC<ShareDatabaseModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  colaboradores,
  obras,
  registos,
  validacoes = {},
  onExportJson,
  onImportJson,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  const spreadsheetId = syncConfig.spreadsheetId || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentBaseUrl = `${origin}${pathname}`;

  // Link universal para outra app ObraTempo conectar à mesma base de dados
  const universalConnectionUrl = spreadsheetId
    ? `${currentBaseUrl}#sheetId=${encodeURIComponent(spreadsheetId)}`
    : currentBaseUrl;

  // URLs diretos de CSV em tempo real para Excel / Power BI
  const csvRegistosUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Registos_Horas`
    : '';
  const csvObrasUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Obras`
    : '';
  const csvColaboradoresUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Colaboradores`
    : '';

  const importRangeFormula = spreadsheetId
    ? `=IMPORTRANGE("${spreadsheetId}"; "Registos_Horas!A:K")`
    : '';

  // Gerar QR Code para o link universal
  useEffect(() => {
    if (!isOpen || !spreadsheetId) return;

    QRCode.toDataURL(universalConnectionUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Erro ao gerar código QR:', err));
  }, [isOpen, universalConnectionUrl, spreadsheetId]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.warn('Erro ao copiar:', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (!parsed.registos && !parsed.colaboradores && !parsed.obras)) {
          throw new Error('O ficheiro JSON não contém a estrutura esperada da base de dados ObraTempo.');
        }

        if (onImportJson) {
          onImportJson(parsed);
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 4000);
        }
      } catch (err: any) {
        setImportError(err.message || 'Erro ao ler ficheiro JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const appsScriptCode = `/**
 * Google Apps Script - API Webhook JSON para a Base de Dados ObraTempo
 * Permite a qualquer aplicação ler e gravar registos sem configurações complexas de OAuth.
 * Cole em: Extensões > Apps Script na sua Folha de Cálculo do Google.
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = e.parameter.sheet || 'Registos_Horas';
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Folha não encontrada' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h] = row[idx];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', count: result.length, data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in p-0 sm:p-4">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Mobile handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Share2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Partilhar Base de Dados em Várias Aplicações</h2>
              <p className="text-xs text-slate-300">
                Ligue múltiplos telemóveis, computadores, Excel, Power BI ou APIs à mesma folha central
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-4 pt-2 border-b border-slate-200 bg-slate-50 gap-1 overflow-x-auto text-xs shrink-0">
          <button
            onClick={() => setActiveTab('apps')}
            className={`py-2.5 px-3 font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'apps'
                ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-500" />
            <span>Outras Apps / Telemóveis</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            className={`py-2.5 px-3 font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'excel'
                ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel & Power BI</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-2.5 px-3 font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>APIs & Outros Sistemas</span>
          </button>

          <button
            onClick={() => setActiveTab('permissoes')}
            className={`py-2.5 px-3 font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'permissoes'
                ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Permissões Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-3 font-semibold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-amber-500 text-slate-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-slate-700" />
            <span>Backup JSON</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!spreadsheetId && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Ainda não tem uma folha do Google Drive ligada nesta aplicação.</strong>
                <p className="mt-0.5 text-amber-800">
                  Crie ou ligue a Base de Dados Central no separador &quot;Drive Central&quot; para poder partilhar o link e os dados com outras aplicações em tempo real.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: OUTRAS INSTÂNCIAS DA APP */}
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Como funciona a partilha entre aplicações ObraTempo:</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Qualquer outra pessoa, encarregado, telemóvel ou computador que abra o link com o parâmetro{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono text-slate-900">
                    #sheetId=...
                  </code>{' '}
                  ficará <strong>imediatamente sincronizado com a mesma base de dados central</strong>. Qualquer hora ou obra inserida surge em todas as aplicações.
                </p>
              </div>

              {/* QR Code and Quick Link */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Conexão à mesma Base de Dados"
                      className="w-36 h-36 rounded-lg"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                      A carregar QR...
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Link Universal de Conexão à Mesma Base de Dados:
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Abra este link em qualquer navegador ou envie aos seus colegas/encarregados
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={universalConnectionUrl}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-hidden"
                    />
                    <button
                      onClick={() => copyToClipboard(universalConnectionUrl, 'universalUrl')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        copiedKey === 'universalUrl'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                      }`}
                    >
                      {copiedKey === 'universalUrl' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>ID da Folha Central:</span>
                      <button
                        onClick={() => copyToClipboard(spreadsheetId, 'sheetIdOnly')}
                        className="text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'sheetIdOnly' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'sheetIdOnly' ? 'Copiado' : 'Copiar só o ID'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-xs text-slate-700 bg-slate-100 p-2 rounded-lg truncate mt-1">
                      {spreadsheetId || 'Nenhuma folha ligada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps for setup on other devices */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Passos para ligar noutro telemóvel ou computador:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
                  <li>
                    Aponte a câmara do telemóvel para o <strong>Código QR</strong> ou envie o <strong>Link Universal</strong> por WhatsApp / email.
                  </li>
                  <li>
                    A aplicação abrirá no navegador e detetará automaticamente o <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">sheetId</code>.
                  </li>
                  <li>
                    No telemóvel, toque em <strong>&quot;Adicionar ao Ecrã Principal&quot;</strong> para instalar como aplicação nativa.
                  </li>
                  <li>
                    Todos os registos de obras inseridos por qualquer pessoa ficam instantaneamente partilhados!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: EXCEL & POWER BI */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Ligação Direta e Automática para Excel e Power BI</span>
                </p>
                <p className="mt-1 text-emerald-800 leading-relaxed">
                  Não precisa de exportar ficheiros manualmente todos os dias! O Excel e o Power BI podem ler a folha de cálculo no Google Drive através de um <strong>Feed Web CSV em tempo real</strong>. Quando abrir o Excel, os dados atualizam-se sozinhos.
                </p>
              </div>

              {/* Live Feeds Links */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Feeds CSV Dinâmicos (Para Microsoft Excel, Power BI ou Google Data Studio):
                </h4>

                {/* Feed Registos */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tabela de Registos de Horas (Registos_Horas)</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(csvRegistosUrl, 'csvRegistos')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'csvRegistos' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'csvRegistos' ? 'Copiado!' : 'Copiar URL CSV'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={csvRegistosUrl}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600"
                  />
                </div>

                {/* Feed Obras */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tabela de Obras (Obras)</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(csvObrasUrl, 'csvObras')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'csvObras' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'csvObras' ? 'Copiado!' : 'Copiar URL CSV'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={csvObrasUrl}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600"
                  />
                </div>

                {/* Feed Colaboradores */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tabela de Colaboradores (Colaboradores)</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(csvColaboradoresUrl, 'csvColabs')}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'csvColabs' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'csvColabs' ? 'Copiado!' : 'Copiar URL CSV'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={csvColaboradoresUrl}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-600"
                  />
                </div>
              </div>

              {/* Instructions for Excel & Power BI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <h5 className="font-bold text-slate-900">Como ligar no Microsoft Excel:</h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Abra o Microsoft Excel e clique no menu <strong>Dados</strong>.</li>
                  <li>Selecione <strong>Obter Dados &gt; Da Web</strong> (ou <em>De outras fontes &gt; Da Web</em>).</li>
                  <li>Cole o URL CSV copiado acima e clique em <strong>OK</strong>.</li>
                  <li>Clique em <strong>Carregar</strong>. A tabela sincronizará automaticamente sempre que abrir o ficheiro!</li>
                </ol>
              </div>

              {/* IMPORTRANGE for another Google Sheet */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Fórmula IMPORTRANGE (Para outro Google Sheets):</span>
                  <button
                    onClick={() => copyToClipboard(importRangeFormula, 'formula')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'formula' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'formula' ? 'Copiado!' : 'Copiar Fórmula'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cole esta fórmula em qualquer célula A1 de outra folha de cálculo no Google Drive para espelhar todas as horas em tempo real:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 text-amber-400 font-mono text-xs overflow-x-auto select-all">
                  {importRangeFormula || '=IMPORTRANGE(...) - ligue uma folha primeiro'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APIS E OUTROS SISTEMAS */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950">
                <p className="font-bold flex items-center gap-1.5 text-blue-900">
                  <Cpu className="w-4 h-4 text-blue-700" />
                  <span>Conectar a Aplicações Externas, ERP, Faturação ou No-Code</span>
                </p>
                <p className="mt-1 text-blue-800 leading-relaxed">
                  Pode ligar plataformas no-code (AppSheet, Glide, Retool, Zapier, Make) ou programas personalizados (Python, Node.js, C#, PHP) diretamente a esta base de dados.
                </p>
              </div>

              {/* No-Code: AppSheet & Glide */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>1. AppSheet / Glide / Retool (Aplicações No-Code)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No AppSheet ou Glide, crie uma nova aplicação e selecione <strong>Google Sheets</strong> como fonte de dados. Em seguida, escolha a folha <strong>&quot;{syncConfig.spreadsheetName || 'Metaloespo - Base de Dados Central'}&quot;</strong>. Todos os registos e colaboradores ficam imediatamente disponíveis como tabelas relacionais.
                </p>
              </div>

              {/* Python Example */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-blue-600" />
                    <span>2. Python & Pandas (Script de Análise ou Integração ERP)</span>
                  </h4>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `import pandas as pd\nurl = "${csvRegistosUrl}"\ndf = pd.read_csv(url)\nprint(df.head())`,
                        'python'
                      )
                    }
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'python' ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  <pre>{`import pandas as pd
url = "${csvRegistosUrl}"
df = pd.read_csv(url)
print(df.head())`}</pre>
                </div>
              </div>

              {/* Google Apps Script Webhook API */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span>3. Webhook REST JSON Grátis (Google Apps Script)</span>
                  </h4>
                  <button
                    onClick={() => copyToClipboard(appsScriptCode, 'appsScript')}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'appsScript' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'appsScript' ? 'Copiado!' : 'Copiar Script'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Adicione este script na sua folha do Google (<em>Extensões &gt; Apps Script</em>) e implemente como <strong>Web App</strong> para criar uma API JSON pública ou privada para qualquer aplicação no mundo:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto">
                  <pre>{appsScriptCode}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PERMISSÕES NO GOOGLE DRIVE */}
          {activeTab === 'permissoes' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950">
                <p className="font-bold flex items-center gap-1.5 text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>Configurar Permissões de Partilha no Google Drive</span>
                </p>
                <p className="mt-1 text-purple-800 leading-relaxed">
                  Para que outras pessoas ou aplicações externas possam ler e escrever na folha de cálculo sem erros de permissão, configure a partilha no Google Drive.
                </p>
              </div>

              {syncConfig.spreadsheetUrl && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Abrir Folha no Google Drive</h4>
                    <p className="text-[11px] text-slate-500">Aceda diretamente para gerir os utilizadores com acesso</p>
                  </div>
                  <a
                    href={syncConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[38px] shrink-0"
                  >
                    <span>Abrir Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Opções de Acesso Recomendadas:
                </h4>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">
                      Opção A: Partilha por Link com a Equipa / Outras Aplicações
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                    Clique em <strong>&quot;Partilhar&quot;</strong> na folha do Google &gt; Em <em>Acesso Geral</em> altere de <em>Restrito</em> para <strong>&quot;Qualquer pessoa com o link&quot;</strong> com permissão de <strong>Editor</strong>. Esta é a forma mais simples de permitir que qualquer telemóvel ou script aceda sem exigir permissões individuais.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">
                      Opção B: Partilha Segura com Contas Google Específicas
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                    Clique em <strong>&quot;Partilhar&quot;</strong> e introduza os endereços de email Google dos chefes de equipa, encarregados ou contabilista como <strong>Editores</strong> ou <strong>Leitores</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP E MIGRAÇÃO JSON */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-700" />
                  <span>Transferência Completa de Dados Offline (JSON)</span>
                </p>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  Pode descarregar todos os registos de horas, obras e colaboradores num ficheiro JSON padrão, que pode ser importado para outra aplicação ou guardado como cópia de segurança de segurança.
                </p>
              </div>

              {/* Status alerts */}
              {importSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Base de dados importada com sucesso! Todos os dados foram atualizados.</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Export Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Exportar Base de Dados (.json)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Descarregue {registos.length} registos, {obras.length} obras e {colaboradores.length} colaboradores num ficheiro JSON.
                    </p>
                  </div>
                  <button
                    onClick={onExportJson}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarregar Backup JSON</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Importar Ficheiro JSON</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Carregue um ficheiro JSON gerado por outra aplicação ObraTempo ou cópia de segurança anterior.
                    </p>
                  </div>
                  <label className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs cursor-pointer transition-all active:scale-[0.98]">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Selecionar Ficheiro JSON</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span>ID: <code className="font-mono text-[11px]">{spreadsheetId ? spreadsheetId.slice(0, 16) + '...' : 'Nenhum'}</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer min-h-[38px]"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
