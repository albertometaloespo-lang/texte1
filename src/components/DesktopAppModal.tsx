import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  Laptop,
  CheckCircle2,
  HardHat,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { GoogleSyncConfig } from '../types';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: GoogleSyncConfig;
  onExportJson?: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  onExportJson,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;
  const pcUrl = `${currentOrigin}${currentPath}#mode=pc`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pcUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // 1. Descarregar Atalho do Ambiente de Trabalho do Windows (.url)
  const handleDownloadWindowsShortcut = () => {
    const urlContent = `[InternetShortcut]\r\nURL=${pcUrl}\r\nIconIndex=0\r\nIconFile=${currentOrigin}/icon.svg\r\n`;
    const blob = new Blob([urlContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Metaloespo_PC.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Descarregar Ficheiro Launcher HTML Autónomo para o PC (.html)
  const handleDownloadHtmlLauncher = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Metaloespo - Versão PC / Secretária</title>
  <link rel="icon" href="${currentOrigin}/icon.svg">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .card {
      background: #1e293b;
      padding: 40px;
      border-radius: 24px;
      border: 1px solid #334155;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .badge {
      background: #f59e0b;
      color: #0f172a;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: inline-block;
      margin-bottom: 16px;
    }
    h1 { margin: 0 0 10px 0; font-size: 26px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      background: #f59e0b;
      color: #0f172a;
      padding: 14px 28px;
      border-radius: 14px;
      font-weight: 700;
      text-decoration: none;
      display: inline-block;
      font-size: 15px;
      transition: all 0.2s;
    }
    .btn:hover { background: #fbbf24; transform: translateY(-2px); }
  </style>
  <script>
    // Redirecionamento automático imediato para o Modo PC da Metaloespo
    window.location.replace('${pcUrl}');
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">Atalho de Acesso PC</div>
    <h1>Metaloespo PC</h1>
    <p>A abrir a versão de secretária da aplicação Metaloespo...</p>
    <a href="${pcUrl}" class="btn">Abrir Metaloespo PC Agora</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Metaloespo_Escritorio.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  Metaloespo no Computador (PC)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  Exclusivo PC
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Aceder, instalar e criar atalho no Ambiente de Trabalho
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Cartão de Destaque: Modo PC Ativo */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <Laptop className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-amber-950">
                A Versão PC está otimizada para ecrãs grandes e secretária:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Barra lateral permanente com acesso rápido a todas as áreas</li>
                <li><strong>Grelha Rápida de Lançamento</strong>: preencha horas de toda a equipa em grelha com o teclado</li>
                <li>Sincronização em direto com os telemóveis dos colaboradores e Google Drive</li>
              </ul>
            </div>
          </div>

          {/* Opção 1: Descarregar Atalho para o Ambiente de Trabalho */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Descarregar Atalho para o Ambiente de Trabalho (PC)
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guarde este atalho na pasta do Ambiente de Trabalho do seu computador. Dê duplo clique para abrir a aplicação diretamente no ecrã de secretária.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadWindowsShortcut}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Atalho Windows (.url)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadHtmlLauncher}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Launcher PC (.html)</span>
              </button>
            </div>
          </div>

          {/* Opção 2: Instalar como App no PC (PWA) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Instalar como Aplicação de PC (Chrome / Edge)
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              No seu navegador no computador (Google Chrome ou Microsoft Edge):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="font-bold block text-slate-900 mb-0.5">No Chrome:</span>
                Clique no ícone de instalar <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">⊕ Instalar Metaloespo</span> na barra de endereço (lado direito).
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="font-bold block text-slate-900 mb-0.5">No Edge:</span>
                Clique em <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">Definições (...) → Aplicações → Instalar este site como aplicação</span>.
              </div>
            </div>
          </div>

          {/* Opção 3: Link Direto da Versão PC */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Link Direto da Versão PC (Favoritos)
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={pcUrl}
                className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-700 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Cópia de Segurança JSON para o PC */}
          {onExportJson && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-blue-950 block">
                    Cópia de Segurança de Dados para o PC
                  </span>
                  <span className="text-[11px] text-blue-800">
                    Descarregue uma cópia de segurança em ficheiro JSON para guardar no seu computador.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onExportJson}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Dados</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            A versão PC partilha dados em direto com os telemóveis.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
