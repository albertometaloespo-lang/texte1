import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Colaborador,
  Obra,
  RegistoHoras,
  GoogleSyncConfig,
  ViewTab,
  UserRole,
  ValidacaoDia,
  AppLayoutMode,
} from './types';
import { StorageService } from './services/storage';
import { initAuth, googleSignIn, googleLogout, getCurrentUser, getAccessToken } from './services/googleAuth';
import { GoogleSheetsService } from './services/googleSheets';
import { PdfReportService } from './services/pdfReportService';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DateSelector } from './components/DateSelector';
import { DailyLogView } from './components/DailyLogView';
import { HistoryView } from './components/HistoryView';
import { ObrasView } from './components/ObrasView';
import { TeamView } from './components/TeamView';
import { ReportsView } from './components/ReportsView';
import { DriveSyncView } from './components/DriveSyncView';
import { WorkerLogModal } from './components/WorkerLogModal';
import { BatchObraLogModal } from './components/BatchObraLogModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminPinModal } from './components/AdminPinModal';
import { MobileTestModal } from './components/MobileTestModal';
import { CollaboratorLoginModal } from './components/CollaboratorLoginModal';
import { ExportPdfModal } from './components/ExportPdfModal';
import { ShareDatabaseModal } from './components/ShareDatabaseModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DesktopTopBar } from './components/DesktopTopBar';
import { DesktopAppModal } from './components/DesktopAppModal';
import { RealtimeSyncService } from './services/realtimeSync';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() =>
    StorageService.getColaboradores()
  );
  const [obras, setObras] = useState<Obra[]>(() => StorageService.getObras());
  const [registos, setRegistos] = useState<RegistoHoras[]>(() => StorageService.getRegistos());
  const [syncConfig, setSyncConfig] = useState<GoogleSyncConfig>(() =>
    StorageService.getSyncConfig()
  );
  const [validacoes, setValidacoes] = useState<Record<string, ValidacaoDia>>(() =>
    StorageService.getValidacoes()
  );

  // Perfil do Utilizador: padrão 'colaborador' (acesso apenas ao registo de horas)
  const [userRole, setUserRole] = useState<UserRole>(() =>
    StorageService.isAdminMode() ? 'administrador' : 'colaborador'
  );

  // Identidade do Colaborador com sessão iniciada (acesso exclusivo às suas horas)
  const [currentWorkerId, setCurrentWorkerId] = useState<string | null>(() =>
    StorageService.getCurrentWorkerId()
  );
  const [isWorkerLoginModalOpen, setIsWorkerLoginModalOpen] = useState<boolean>(false);

  const currentWorker = colaboradores.find((c) => c.id === currentWorkerId) || null;

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [currentTab, setCurrentTab] = useState<ViewTab>('registo');

  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Layout Mode: 'mobile' ou 'pc' (Versão de Secretária / Computador)
  const [layoutMode, setLayoutMode] = useState<AppLayoutMode>(() =>
    StorageService.getLayoutMode()
  );
  const [dailyViewMode, setDailyViewMode] = useState<'cartoes' | 'grelha'>('grelha');
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);

  // Modais
  const [activeWorkerForModal, setActiveWorkerForModal] = useState<Colaborador | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);
  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState<boolean>(false);
  const [isShareDatabaseModalOpen, setIsShareDatabaseModalOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [syncNotification, setSyncNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Inicializar listener de autenticação Firebase
  useEffect(() => {
    const unsubscribe = initAuth(
      (loggedUser) => {
        setUser(loggedUser);
        if (
          loggedUser.email === 'alberto.metaloespo@gmail.com' ||
          loggedUser.email === 'alberto.jose.sa@gmail.com'
        ) {
          setUserRole('administrador');
          StorageService.setAdminMode(true);
        }
      },
      () => setUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Detetar se foi passado um link pessoal de colaborador (#worker=col-X&pin=YYYY) ou folha central
  useEffect(() => {
    try {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const urlParams = new URLSearchParams(window.location.search);

      // Detetar se foi pedido acesso direto ao Modo PC (#mode=pc ou ?mode=pc ou #pc)
      if (
        hashParams.get('mode') === 'pc' ||
        urlParams.get('mode') === 'pc' ||
        hash === 'pc' ||
        hash.includes('pc')
      ) {
        setLayoutMode('pc');
        StorageService.setLayoutMode('pc');
        setUserRole('administrador');
        StorageService.setAdminMode(true);
      }

      const workerParam = hashParams.get('worker') || urlParams.get('worker');
      const pinParam = hashParams.get('pin') || urlParams.get('pin');
      const sheetIdParam = hashParams.get('sheetId') || urlParams.get('sheetId');

      if (sheetIdParam && sheetIdParam !== syncConfig.spreadsheetId) {
        const updatedConfig: GoogleSyncConfig = {
          ...syncConfig,
          spreadsheetId: sheetIdParam,
          spreadsheetName: syncConfig.spreadsheetName || 'Folha Central da Empresa',
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetIdParam}`,
        };
        setSyncConfig(updatedConfig);
        StorageService.saveSyncConfig(updatedConfig);
      }

      if (workerParam) {
        const matchedWorker = colaboradores.find((c) => c.id === workerParam);
        if (matchedWorker) {
          if (!matchedWorker.ativo) {
            setSyncNotification({
              type: 'error',
              text: `O colaborador ${matchedWorker.nome} está desativado. Contacte o encarregado.`,
            });
            setTimeout(() => setSyncNotification(null), 6000);
          } else if (!pinParam || matchedWorker.pin === pinParam) {
            setCurrentWorkerId(matchedWorker.id);
            StorageService.setCurrentWorkerId(matchedWorker.id);
            setUserRole('colaborador');
            StorageService.setAdminMode(false);
            setSyncNotification({
              type: 'success',
              text: `Bem-vindo, ${matchedWorker.nome}! Acesso móvel ao teu registo de horas ativo.`,
            });
            setTimeout(() => setSyncNotification(null), 5000);
          }
        }
      }
    } catch (e) {
      console.warn('URL parameters check:', e);
    }
  }, [colaboradores]);

  // Sincronização periódica com a Base de Dados Central no Google Drive
  useEffect(() => {
    if (!user || !syncConfig.spreadsheetId || !syncConfig.autoSync) return;

    const pullLatest = async () => {
      try {
        const remote = await GoogleSheetsService.readSpreadsheetData(syncConfig.spreadsheetId!);
        if (remote.registos.length > 0 || remote.colaboradores.length > 0) {
          setColaboradores(remote.colaboradores);
          setObras(remote.obras);
          setRegistos(remote.registos);
          setValidacoes(remote.validacoes);
          StorageService.saveColaboradores(remote.colaboradores);
          StorageService.saveObras(remote.obras);
          StorageService.saveRegistos(remote.registos);
          StorageService.saveAllValidacoes(remote.validacoes);
        }
      } catch (err) {
        // Silently catch background poll issues
      }
    };

    const onFocus = () => {
      pullLatest();
    };
    window.addEventListener('focus', onFocus);
    const timer = setInterval(pullLatest, 90000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [user, syncConfig.spreadsheetId, syncConfig.autoSync]);

  // Sincronização em Tempo Real (SSE) para transmissão instantânea entre todas as aplicações e telemóveis
  useEffect(() => {
    // 1. Carregar estado mais recente e autoritário do servidor central
    RealtimeSyncService.fetchServerData().then((serverData) => {
      if (serverData) {
        if (Array.isArray(serverData.registos)) {
          setRegistos(serverData.registos);
          StorageService.saveRegistos(serverData.registos);
        }
        if (Array.isArray(serverData.colaboradores)) {
          setColaboradores(serverData.colaboradores);
          StorageService.saveColaboradores(serverData.colaboradores);
        }
        if (Array.isArray(serverData.obras)) {
          setObras(serverData.obras);
          StorageService.saveObras(serverData.obras);
        }
        if (serverData.validacoes && typeof serverData.validacoes === 'object') {
          setValidacoes(serverData.validacoes);
          StorageService.saveAllValidacoes(serverData.validacoes);
        }
      }
    });

    // 2. Conectar stream de eventos em tempo real
    const unsubscribe = RealtimeSyncService.connect(
      (payload) => {
        // Ignorar eventos gerados por este mesmo cliente
        if (payload.sourceClient === RealtimeSyncService.getClientId()) {
          return;
        }

        if (payload.type === 'REGISTOS_UPDATED' && payload.registos) {
          setRegistos(payload.registos);
          StorageService.saveRegistos(payload.registos);
          setSyncNotification({
            type: 'success',
            text: payload.message || 'Novo registo de horas recebido em direto de outra aplicação!',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'REGISTOS_DELETED') {
          if (Array.isArray(payload.registos)) {
            setRegistos(payload.registos);
            StorageService.saveRegistos(payload.registos);
          } else if (Array.isArray(payload.deletedIds)) {
            const deletedSet = new Set(payload.deletedIds);
            setRegistos((prev) => {
              const next = prev.filter((r) => !deletedSet.has(r.id));
              StorageService.saveRegistos(next);
              return next;
            });
          }
          setSyncNotification({
            type: 'success',
            text: payload.message || 'Registo(s) eliminado(s) pelo administrador.',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'DAY_CLEARED') {
          if (Array.isArray(payload.registos)) {
            setRegistos(payload.registos);
            StorageService.saveRegistos(payload.registos);
          } else if (payload.date) {
            setRegistos((prev) => {
              const next = prev.filter((r) => r.data !== payload.date);
              StorageService.saveRegistos(next);
              return next;
            });
          }
          if (payload.validacoes) {
            setValidacoes(payload.validacoes);
            StorageService.saveAllValidacoes(payload.validacoes);
          } else if (payload.date) {
            StorageService.removeValidacao(payload.date);
            setValidacoes(StorageService.getValidacoes());
          }
          setSyncNotification({
            type: 'success',
            text: payload.message || `Registos do dia ${payload.date || ''} eliminados pelo administrador.`,
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'OBRA_DELETED') {
          if (Array.isArray(payload.obras)) {
            setObras(payload.obras);
            StorageService.saveObras(payload.obras);
          } else if (payload.obraId) {
            setObras((prev) => {
              const next = prev.filter((o) => o.id !== payload.obraId);
              StorageService.saveObras(next);
              return next;
            });
          }
          setSyncNotification({
            type: 'success',
            text: payload.message || 'Obra eliminada pelo administrador.',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'COLABORADOR_DELETED') {
          if (Array.isArray(payload.colaboradores)) {
            setColaboradores(payload.colaboradores);
            StorageService.saveColaboradores(payload.colaboradores);
          } else if (payload.colaboradorId) {
            setColaboradores((prev) => {
              const next = prev.filter((c) => c.id !== payload.colaboradorId);
              StorageService.saveColaboradores(next);
              return next;
            });
          }
          setSyncNotification({
            type: 'success',
            text: payload.message || 'Colaborador eliminado pelo administrador.',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'FULL_SYNC') {
          if (payload.registos) {
            setRegistos(payload.registos);
            StorageService.saveRegistos(payload.registos);
          }
          if (payload.colaboradores) {
            setColaboradores(payload.colaboradores);
            StorageService.saveColaboradores(payload.colaboradores);
          }
          if (payload.obras) {
            setObras(payload.obras);
            StorageService.saveObras(payload.obras);
          }
          if (payload.validacoes) {
            setValidacoes(payload.validacoes);
            StorageService.saveAllValidacoes(payload.validacoes);
          }
          setSyncNotification({
            type: 'success',
            text: 'Dados atualizados em direto de outra aplicação!',
          });
          setTimeout(() => setSyncNotification(null), 3500);
        } else if (payload.type === 'VALIDACOES_UPDATED') {
          if (payload.validacoes) {
            setValidacoes(payload.validacoes);
            StorageService.saveAllValidacoes(payload.validacoes);
          }
          if (payload.registos) {
            setRegistos(payload.registos);
            StorageService.saveRegistos(payload.registos);
          }
        } else if (payload.type === 'REGISTOS_CLEARED') {
          setRegistos([]);
          setValidacoes({});
          StorageService.saveRegistos([]);
          StorageService.saveAllValidacoes({});
          setSyncNotification({
            type: 'success',
            text: 'Registos limpos pelo administrador.',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        } else if (payload.type === 'EVERYTHING_WIPED') {
          setRegistos([]);
          setColaboradores([]);
          setObras([]);
          setValidacoes({});
          StorageService.wipeEverything();
          setSyncNotification({
            type: 'success',
            text: 'Todos os registos, colaboradores e obras foram limpos pelo administrador.',
          });
          setTimeout(() => setSyncNotification(null), 4000);
        }
      },
      (connected) => {
        setIsLiveConnected(connected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleLayoutMode = () => {
    const next: AppLayoutMode = layoutMode === 'pc' ? 'mobile' : 'pc';
    setLayoutMode(next);
    StorageService.setLayoutMode(next);
    setSyncNotification({
      type: 'success',
      text:
        next === 'pc'
          ? '🖥️ Versão PC / Secretária ativada.'
          : '📱 Versão Telemóvel ativada.',
    });
    setTimeout(() => setSyncNotification(null), 3000);
  };

  const handleSelectWorker = (worker: Colaborador) => {
    if (!worker.ativo) {
      setSyncNotification({
        type: 'error',
        text: `O colaborador ${worker.nome} encontra-se desativado.`,
      });
      setTimeout(() => setSyncNotification(null), 4000);
      return;
    }
    setCurrentWorkerId(worker.id);
    StorageService.setCurrentWorkerId(worker.id);
    setUserRole('colaborador');
    StorageService.setAdminMode(false);
    setSyncNotification({
      type: 'success',
      text: `Sessão ativa como ${worker.nome} (Acesso exclusivo ao teu registo).`,
    });
    setTimeout(() => setSyncNotification(null), 3500);
  };

  // Verificar se o dia atual está bloqueado
  const isSelectedDayLocked = Boolean(validacoes[selectedDate]?.bloqueado);

  // Sincronização automática para a Base de Dados Central no Google Sheets
  const autoSyncToDrive = async (
    newRegistos: RegistoHoras[],
    newCols: Colaborador[],
    newObras: Obra[],
    newValidacoes?: Record<string, ValidacaoDia>
  ) => {
    if (syncConfig.spreadsheetId && syncConfig.autoSync && user) {
      try {
        setIsSyncing(true);
        await GoogleSheetsService.syncAllToSpreadsheet(
          syncConfig.spreadsheetId,
          newCols,
          newObras,
          newRegistos,
          newValidacoes || validacoes
        );
        const updatedConfig = {
          ...syncConfig,
          lastSyncTime: new Date().toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setSyncConfig(updatedConfig);
        StorageService.saveSyncConfig(updatedConfig);
      } catch (err) {
        console.warn('Auto-sync aviso:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // COMANDO ADMINISTRADOR: Validar e Bloquear o Registo do Dia (com geração e envio automático do PDF)
  const handleValidateAndLockDay = () => {
    const adminName = user?.displayName || user?.email || 'Administrador';
    const hora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    setConfirmDialog({
      isOpen: true,
      title: 'Validar, Bloquear e Enviar Folha de Ponto em PDF',
      message: `Tem a certeza que deseja validar e bloquear os registos de ${selectedDate}? Os registos serão bloqueados contra alterações e será gerado e transferido automaticamente o ficheiro PDF oficial com o registo diário para envio.`,
      onConfirm: async () => {
        const validation: ValidacaoDia = {
          data: selectedDate,
          bloqueado: true,
          validadoPor: adminName,
          validadoEm: hora,
        };
        StorageService.saveValidacao(validation);
        const updatedValidacoes = StorageService.getValidacoes();
        setValidacoes(updatedValidacoes);

        // Marcar registos do dia como validados
        const updated = registos.map((r) =>
          r.data === selectedDate ? { ...r, validado: true, bloqueado: true, validadoPor: adminName, validadoEm: hora } : r
        );
        setRegistos(updated);
        StorageService.saveRegistos(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastValidacao(validation);
        autoSyncToDrive(updated, colaboradores, obras, updatedValidacoes);

        // Gerar o documento PDF oficial da folha de ponto diária
        try {
          const doc = PdfReportService.generateDailyTimesheetPdf({
            date: selectedDate,
            colaboradores,
            obras,
            registos: updated,
            validation,
          });

          const fileName = `Ponto_Diario_Metaloespo_${selectedDate}.pdf`;

          // 1. Descarregar o ficheiro PDF automaticamente no dispositivo
          doc.save(fileName);

          // 2. Preparar blob para partilha nativa ou upload
          const pdfBlob = doc.output('blob');
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

          // 3. Se suportar partilha nativa com ficheiro no dispositivo móvel, acionar partilha direta (WhatsApp, Email, etc.)
          let sharedNatively = false;
          if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
              await navigator.share({
                title: `Folha de Ponto Metaloespo - ${selectedDate}`,
                text: `Folha de ponto diária da Metaloespo referente ao dia ${selectedDate}. Registos validados e bloqueados pela administração.`,
                files: [pdfFile],
              });
              sharedNatively = true;
            } catch (shareErr) {
              // Partilha nativa cancelada ou dispensada pelo utilizador
            }
          }

          // 4. Se tiver ligação ao Google Drive ativa, guardar cópia na pasta do Drive
          let driveUploaded = false;
          try {
            const token = await getAccessToken();
            if (token) {
              await PdfReportService.uploadPdfToGoogleDrive(pdfBlob, fileName, token);
              driveUploaded = true;
            }
          } catch (driveErr) {
            console.warn('Upload automático para Google Drive:', driveErr);
          }

          setSyncNotification({
            type: 'success',
            text: driveUploaded
              ? `Dia ${selectedDate} validado! PDF descarregado e arquivado no Google Drive.`
              : `Dia ${selectedDate} validado! Ficheiro PDF gerado e pronto a enviar.`,
          });
          setTimeout(() => setSyncNotification(null), 5000);

          // 5. Abrir o modal de exportação/envio com opções rápidas de WhatsApp, Email ou Drive
          setIsExportPdfModalOpen(true);
        } catch (pdfErr: any) {
          console.error('Erro ao gerar/enviar PDF:', pdfErr);
          setSyncNotification({
            type: 'error',
            text: 'Registos validados, mas ocorreu um problema ao gerar o PDF.',
          });
          setTimeout(() => setSyncNotification(null), 5000);
        }
      },
    });
  };

  // COMANDO ADMINISTRADOR: Desbloquear o Registo do Dia
  const handleUnlockDay = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desbloquear Registos para Edição',
      message: `Deseja desbloquear os registos de ${selectedDate} para permitir alterações?`,
      onConfirm: () => {
        StorageService.removeValidacao(selectedDate);
        const updatedValidacoes = StorageService.getValidacoes();
        setValidacoes(updatedValidacoes);

        const updated = registos.map((r) =>
          r.data === selectedDate ? { ...r, bloqueado: false } : r
        );
        setRegistos(updated);
        StorageService.saveRegistos(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastValidacao(undefined, selectedDate);
        autoSyncToDrive(updated, colaboradores, obras, updatedValidacoes);
      },
    });
  };

  // Alternar Papel (Colaborador vs Administrador)
  const handleToggleRole = () => {
    if (userRole === 'administrador') {
      setUserRole('colaborador');
      StorageService.setAdminMode(false);
      setCurrentTab('registo');
    } else {
      // Se for o administrador logado pelo Google, entra direto
      if (user?.email === 'alberto.metaloespo@gmail.com') {
        setUserRole('administrador');
        StorageService.setAdminMode(true);
      } else {
        setIsAdminPinModalOpen(true);
      }
    }
  };

  // Guardar registos de um colaborador (suporta MÚLTIPLAS obras por dia)
  const handleSaveWorkerAllocations = (allocations: any[]) => {
    if (!activeWorkerForModal) return;

    // Se estiver bloqueado e não for administrador, impede guardar
    if (isSelectedDayLocked && userRole !== 'administrador') {
      return;
    }

    const workerId = activeWorkerForModal.id;
    const existingWorkerDay = registos.filter(
      (r) => r.colaboradorId === workerId && r.data === selectedDate
    );

    // Remover os registos antigos deste colaborador nesta data
    const remaining = registos.filter(
      (r) => !(r.colaboradorId === workerId && r.data === selectedDate)
    );

    // Criar os novos registos (cada obra é um registo no mesmo dia)
    const newItems: RegistoHoras[] = allocations.map((alloc) => ({
      id: alloc.id || `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      data: selectedDate,
      colaboradorId: workerId,
      obraId: alloc.obraId,
      horasNormais: Number(alloc.horasNormais) || 0,
      horasExtra: Number(alloc.horasExtra) || 0,
      descricao: alloc.descricao || '',
      validado: isSelectedDayLocked,
      bloqueado: isSelectedDayLocked,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }));

    const newIds = new Set(newItems.map((n) => n.id));
    const removedIds = existingWorkerDay.filter((r) => !newIds.has(r.id)).map((r) => r.id);

    const updatedRegistos = [...remaining, ...newItems];
    setRegistos(updatedRegistos);
    StorageService.saveRegistos(updatedRegistos);

    // Propagar remoções e adições/alterações para todas as outras aplicações ligadas
    if (removedIds.length > 0) {
      RealtimeSyncService.broadcastDeleteMultipleRegistos(
        removedIds,
        `${activeWorkerForModal.nome} atualizou/removeu registos de ${selectedDate}`
      );
    }
    if (newItems.length > 0) {
      const targetObra = obras.find((o) => o.id === newItems[0]?.obraId);
      RealtimeSyncService.broadcastRegistos(
        newItems,
        activeWorkerForModal.nome,
        targetObra?.nome || targetObra?.codigo || 'Obra'
      );
    }

    // Sincronizar com Drive em segundo plano
    autoSyncToDrive(updatedRegistos, colaboradores, obras);
  };

  // Guardar registo em lote de equipa por obra
  const handleSaveBatchAllocations = (
    obraId: string,
    workerLogs: {
      colaboradorId: string;
      horasNormais: number;
      horasExtra: number;
      descricao: string;
    }[]
  ) => {
    if (isSelectedDayLocked && userRole !== 'administrador') return;

    const selectedWorkerIds = new Set(workerLogs.map((w) => w.colaboradorId));

    const replacedIds = registos
      .filter((r) => r.data === selectedDate && r.obraId === obraId && selectedWorkerIds.has(r.colaboradorId))
      .map((r) => r.id);

    // Remover registos anteriores destes colaboradores NESTA obra nesta data
    const remaining = registos.filter(
      (r) => !(r.data === selectedDate && r.obraId === obraId && selectedWorkerIds.has(r.colaboradorId))
    );

    const newItems: RegistoHoras[] = workerLogs.map((item) => ({
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      data: selectedDate,
      colaboradorId: item.colaboradorId,
      obraId: obraId,
      horasNormais: item.horasNormais,
      horasExtra: item.horasExtra,
      descricao: item.descricao,
      validado: isSelectedDayLocked,
      bloqueado: isSelectedDayLocked,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }));

    const updated = [...remaining, ...newItems];
    setRegistos(updated);
    StorageService.saveRegistos(updated);

    if (replacedIds.length > 0) {
      RealtimeSyncService.broadcastDeleteMultipleRegistos(replacedIds);
    }

    // Difundir IMEDIATAMENTE para todas as outras aplicações e telemóveis ligados
    if (newItems.length > 0) {
      const targetObra = obras.find((o) => o.id === obraId);
      RealtimeSyncService.broadcastRegistos(
        newItems,
        `${workerLogs.length} Colaboradores`,
        targetObra?.nome || targetObra?.codigo || 'Obra'
      );
    }

    autoSyncToDrive(updated, colaboradores, obras);
  };

  // COMANDO ADMINISTRADOR: Eliminar um registo individual e propagar para todas as aplicações
  const handleDeleteSingleRegisto = (registo: RegistoHoras) => {
    if (userRole !== 'administrador') return;
    const col = colaboradores.find((c) => c.id === registo.colaboradorId);
    const obr = obras.find((o) => o.id === registo.obraId);

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Registo de Horas',
      message: `Tem a certeza que deseja eliminar o registo de ${col?.nome || 'Colaborador'} na obra "${
        obr?.nome || obr?.codigo || 'Obra'
      }" (${registo.horasNormais + registo.horasExtra}h em ${registo.data})? Esta eliminação será propagada para todas as aplicações ligadas.`,
      onConfirm: () => {
        const remaining = registos.filter((r) => r.id !== registo.id);
        setRegistos(remaining);
        StorageService.saveRegistos(remaining);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        RealtimeSyncService.broadcastDeleteRegisto(
          registo.id,
          `Registo de ${col?.nome || 'Colaborador'} (${obr?.codigo || 'Obra'}) eliminado pelo administrador`
        );
        autoSyncToDrive(remaining, colaboradores, obras);

        setSyncNotification({
          type: 'success',
          text: 'Registo eliminado e propagado para todas as aplicações.',
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // Gestão de Obras
  const handleSaveObra = (obraToSave: Obra) => {
    const exists = obras.some((o) => o.id === obraToSave.id);
    const updated = exists
      ? obras.map((o) => (o.id === obraToSave.id ? obraToSave : o))
      : [...obras, obraToSave];

    setObras(updated);
    StorageService.saveObras(updated);
    RealtimeSyncService.broadcastFullSync(registos, colaboradores, updated, validacoes);
    autoSyncToDrive(registos, colaboradores, updated);
  };

  const handleDeleteObra = (obraId: string) => {
    const obr = obras.find((o) => o.id === obraId);
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Obra',
      message: `Tem a certeza que deseja eliminar a obra "${obr?.codigo} - ${obr?.nome}"? Os registos de horas associados serão mantidos e a eliminação será propagada para todas as aplicações.`,
      onConfirm: () => {
        const updated = obras.filter((o) => o.id !== obraId);
        setObras(updated);
        StorageService.saveObras(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastDeleteObra(obraId);
        autoSyncToDrive(registos, colaboradores, updated);
        setSyncNotification({
          type: 'success',
          text: `Obra "${obr?.nome || obraId}" eliminada em todas as aplicações.`,
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // Gestão de Colaboradores
  const handleSaveColaborador = (colToSave: Colaborador) => {
    const exists = colaboradores.some((c) => c.id === colToSave.id);
    const updated = exists
      ? colaboradores.map((c) => (c.id === colToSave.id ? colToSave : c))
      : [...colaboradores, colToSave];

    if (!colToSave.ativo && currentWorkerId === colToSave.id) {
      setCurrentWorkerId(null);
      StorageService.setCurrentWorkerId(null);
    }

    setColaboradores(updated);
    StorageService.saveColaboradores(updated);
    RealtimeSyncService.broadcastFullSync(registos, updated, obras, validacoes);
    autoSyncToDrive(registos, updated, obras);
  };

  const handleDeleteColaborador = (colId: string) => {
    const col = colaboradores.find((c) => c.id === colId);
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Colaborador',
      message: `Tem a certeza que deseja eliminar o colaborador "${col?.nome}"? A eliminação será propagada para todas as aplicações ligadas.`,
      onConfirm: () => {
        const updated = colaboradores.filter((c) => c.id !== colId);
        setColaboradores(updated);
        StorageService.saveColaboradores(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastDeleteColaborador(colId);
        autoSyncToDrive(registos, updated, obras);
        setSyncNotification({
          type: 'success',
          text: `Colaborador "${col?.nome || colId}" eliminado em todas as aplicações.`,
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // COMANDO ADMINISTRADOR: Limpar Todos os Registos de Horas
  const handleClearAllRegistos = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Todos os Registos de Horas',
      message:
        'Tem a certeza de que deseja apagar permanentemente todos os registos de horas de todos os colaboradores? O histórico de horas e validações será completamente limpo em todas as aplicações.',
      onConfirm: () => {
        StorageService.clearAllRegistos();
        setRegistos([]);
        setValidacoes({});
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastClearAll();
        autoSyncToDrive([], colaboradores, obras, {});
        setSyncNotification({
          type: 'success',
          text: 'Todos os registos de horas foram limpos em todas as aplicações.',
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // COMANDO ADMINISTRADOR: Limpar TUDO (Registos, Colaboradores e Obras)
  const handleWipeEverything = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Tudo (Registos, Colaboradores e Obras)',
      message:
        'Tem a certeza absoluta de que deseja apagar permanentemente TODOS OS REGISTOS, COLABORADORES E OBRAS? Esta ação limpará completamente a base de dados em todas as aplicações ligadas.',
      onConfirm: () => {
        StorageService.wipeEverything();
        setColaboradores([]);
        setObras([]);
        setRegistos([]);
        setValidacoes({});
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastWipeEverything();
        autoSyncToDrive([], [], [], {});
        setSyncNotification({
          type: 'success',
          text: 'Todos os registos, colaboradores e obras foram limpos em todas as aplicações.',
        });
        setTimeout(() => setSyncNotification(null), 5000);
      },
    });
  };

  // COMANDO ADMINISTRADOR: Limpar Registos do Dia Selecionado
  const handleClearDayRegistos = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Registos do Dia',
      message: `Tem a certeza que deseja apagar todos os registos do dia ${selectedDate}? Esta ação será propagada para todas as aplicações ligadas.`,
      onConfirm: () => {
        const remaining = registos.filter((r) => r.data !== selectedDate);
        setRegistos(remaining);
        StorageService.saveRegistos(remaining);
        StorageService.removeValidacao(selectedDate);
        const updatedValidacoes = StorageService.getValidacoes();
        setValidacoes(updatedValidacoes);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastDeleteDayRegistos(selectedDate);
        autoSyncToDrive(remaining, colaboradores, obras, updatedValidacoes);
        setSyncNotification({
          type: 'success',
          text: `Registos do dia ${selectedDate} eliminados em todas as aplicações.`,
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // Repor dados
  const handleResetData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Repor Dados de Demonstração',
      message:
        'Isto irá repor as obras e colaboradores para os valores iniciais e limpar os registos em todas as aplicações. Deseja continuar?',
      onConfirm: () => {
        StorageService.resetAllData();
        const resetCols = StorageService.getColaboradores();
        const resetObras = StorageService.getObras();
        const resetRegs = StorageService.getRegistos();
        const resetVals = StorageService.getValidacoes();
        setColaboradores(resetCols);
        setObras(resetObras);
        setRegistos(resetRegs);
        setValidacoes(resetVals);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        RealtimeSyncService.broadcastAuthoritativeSync(
          resetRegs,
          resetCols,
          resetObras,
          resetVals
        );
        autoSyncToDrive(resetRegs, resetCols, resetObras, resetVals);
        setSyncNotification({
          type: 'success',
          text: 'Dados repostos e propagados para todas as aplicações.',
        });
        setTimeout(() => setSyncNotification(null), 4000);
      },
    });
  };

  // Autenticação Google com Configuração Automática da Base de Dados Central no Google Drive
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        if (
          res.user.email === 'alberto.metaloespo@gmail.com' ||
          res.user.email === 'alberto.jose.sa@gmail.com'
        ) {
          setUserRole('administrador');
          StorageService.setAdminMode(true);
        }

        setIsSyncing(true);
        try {
          const central = await GoogleSheetsService.ensureCentralSpreadsheet(
            colaboradores,
            obras,
            registos,
            validacoes
          );

          const updatedCfg: GoogleSyncConfig = {
            ...syncConfig,
            spreadsheetId: central.id,
            spreadsheetName: central.name,
            spreadsheetUrl: central.url,
            lastSyncTime: new Date().toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          setSyncConfig(updatedCfg);
          StorageService.saveSyncConfig(updatedCfg);

          // Ler dados consolidados da folha central
          const remoteData = await GoogleSheetsService.readSpreadsheetData(central.id);
          if (remoteData.registos.length > 0 || remoteData.colaboradores.length > 0) {
            setColaboradores(remoteData.colaboradores);
            setObras(remoteData.obras);
            setRegistos(remoteData.registos);
            setValidacoes(remoteData.validacoes);
            StorageService.saveColaboradores(remoteData.colaboradores);
            StorageService.saveObras(remoteData.obras);
            StorageService.saveRegistos(remoteData.registos);
            StorageService.saveAllValidacoes(remoteData.validacoes);
          }

          setSyncNotification({
            type: 'success',
            text: central.isNew
              ? `Autenticado como ${res.user.email || res.user.displayName}. Base de dados central criada no Google Drive ("${central.name}")!`
              : `Autenticado como ${res.user.email || res.user.displayName}. Ligado ao Google Drive ("${central.name}")!`,
          });
          setTimeout(() => setSyncNotification(null), 5000);
        } catch (autoErr: any) {
          console.warn('Configuração de base central no Drive:', autoErr);
          setSyncNotification({
            type: 'success',
            text: `Autenticação Google concluída (${res.user.email || res.user.displayName}). Pode ligar ou criar a folha na secção Drive.`,
          });
          setTimeout(() => setSyncNotification(null), 5000);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (err: any) {
      console.error('Erro na autenticação Google:', err);
      const code = err?.code || '';
      let errorText = 'Não foi possível iniciar sessão com o Google. Tente novamente.';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        errorText = 'Início de sessão Google cancelado.';
      } else if (code === 'auth/popup-blocked') {
        errorText = 'A janela pop-up do Google foi bloqueada pelo navegador. Permita pop-ups para continuar.';
      } else if (err?.message) {
        errorText = `Erro na autenticação Google: ${err.message}`;
      }
      setSyncNotification({
        type: 'error',
        text: errorText,
      });
      setTimeout(() => setSyncNotification(null), 6000);
    }
  };

  const handleSignOut = async () => {
    await googleLogout();
    setUser(null);
  };

  const handleUpdateSyncConfig = (cfg: GoogleSyncConfig) => {
    setSyncConfig(cfg);
    StorageService.saveSyncConfig(cfg);
  };

  // Sincronização Completa e Bidirecional com a Base de Dados Central no Google Drive
  const handleSyncNow = async () => {
    if (!syncConfig.spreadsheetId) {
      handleTabChange('drive');
      return;
    }
    setIsSyncing(true);
    setSyncNotification(null);
    try {
      const merged = await GoogleSheetsService.syncBidirectional(
        syncConfig.spreadsheetId,
        colaboradores,
        obras,
        registos,
        validacoes
      );

      setColaboradores(merged.colaboradores);
      setObras(merged.obras);
      setRegistos(merged.registos);
      setValidacoes(merged.validacoes);
      StorageService.saveColaboradores(merged.colaboradores);
      StorageService.saveObras(merged.obras);
      StorageService.saveRegistos(merged.registos);
      StorageService.saveAllValidacoes(merged.validacoes);

      const updated = {
        ...syncConfig,
        lastSyncTime: new Date().toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setSyncConfig(updated);
      StorageService.saveSyncConfig(updated);
      setSyncNotification({
        type: 'success',
        text: `Base de dados central atualizada no Google Drive! ${merged.syncedCount} registos sincronizados.`,
      });
      setTimeout(() => setSyncNotification(null), 5000);
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setSyncNotification({
        type: 'error',
        text: err.message || 'Erro ao sincronizar com a base de dados central no Google Drive.',
      });
      setTimeout(() => setSyncNotification(null), 6000);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Descarregar dados da Base de Dados Central (Sobrescrever local com o Drive)
  const handlePullFromDrive = async () => {
    if (!syncConfig.spreadsheetId) return;
    setIsSyncing(true);
    try {
      const remote = await GoogleSheetsService.readSpreadsheetData(syncConfig.spreadsheetId);
      setColaboradores(remote.colaboradores);
      setObras(remote.obras);
      setRegistos(remote.registos);
      setValidacoes(remote.validacoes);
      StorageService.saveColaboradores(remote.colaboradores);
      StorageService.saveObras(remote.obras);
      StorageService.saveRegistos(remote.registos);
      StorageService.saveAllValidacoes(remote.validacoes);

      const updated = {
        ...syncConfig,
        lastSyncTime: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      };
      setSyncConfig(updated);
      StorageService.saveSyncConfig(updated);
      setSyncNotification({
        type: 'success',
        text: `Dados descarregados com sucesso do Google Drive (${remote.registos.length} registos).`,
      });
      setTimeout(() => setSyncNotification(null), 4500);
    } catch (err: any) {
      setSyncNotification({
        type: 'error',
        text: err.message || 'Erro ao descarregar dados do Drive.',
      });
      setTimeout(() => setSyncNotification(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Forçar envio de todos os dados locais para a Base de Dados Central no Google Drive
  const handlePushToDrive = async () => {
    if (!syncConfig.spreadsheetId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Substituir Dados no Google Drive',
      message: `Deseja enviar todos os dados atuais (${registos.length} registos) para a folha "${
        syncConfig.spreadsheetName || 'Base de Dados Central'
      }" no Google Drive? Os dados existentes na folha serão substituídos pelos dados desta aplicação.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setIsSyncing(true);
        try {
          await GoogleSheetsService.syncAllToSpreadsheet(
            syncConfig.spreadsheetId!,
            colaboradores,
            obras,
            registos,
            validacoes
          );
          const updated = {
            ...syncConfig,
            lastSyncTime: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
          };
          setSyncConfig(updated);
          StorageService.saveSyncConfig(updated);
          setSyncNotification({
            type: 'success',
            text: `Todos os dados locais foram enviados para a base central no Google Drive.`,
          });
          setTimeout(() => setSyncNotification(null), 4500);
        } catch (err: any) {
          setSyncNotification({
            type: 'error',
            text: err.message || 'Erro ao enviar dados para o Drive.',
          });
          setTimeout(() => setSyncNotification(null), 6000);
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Exportar toda a base de dados em formato JSON para transferência entre aplicações
  const handleExportDatabaseJson = () => {
    try {
      const data = {
        app: 'ObraTempo - Metaloespo',
        exportedAt: new Date().toISOString(),
        version: '2.0',
        syncConfig,
        colaboradores,
        obras,
        registos,
        validacoes,
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `obratempo_base_dados_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSyncNotification({
        type: 'success',
        text: 'Base de dados exportada em JSON com sucesso!',
      });
      setTimeout(() => setSyncNotification(null), 4000);
    } catch (e: any) {
      console.error('Erro ao exportar JSON:', e);
    }
  };

  // Importar ficheiro JSON gerado por outra aplicação
  const handleImportDatabaseJson = (jsonData: any) => {
    try {
      if (Array.isArray(jsonData.colaboradores) && jsonData.colaboradores.length > 0) {
        setColaboradores(jsonData.colaboradores);
        StorageService.saveColaboradores(jsonData.colaboradores);
      }
      if (Array.isArray(jsonData.obras) && jsonData.obras.length > 0) {
        setObras(jsonData.obras);
        StorageService.saveObras(jsonData.obras);
      }
      if (Array.isArray(jsonData.registos)) {
        setRegistos(jsonData.registos);
        StorageService.saveRegistos(jsonData.registos);
      }
      if (jsonData.validacoes && typeof jsonData.validacoes === 'object') {
        setValidacoes(jsonData.validacoes);
        StorageService.saveAllValidacoes(jsonData.validacoes);
      }
      if (jsonData.syncConfig?.spreadsheetId) {
        const newSync = {
          ...syncConfig,
          spreadsheetId: jsonData.syncConfig.spreadsheetId,
          spreadsheetName: jsonData.syncConfig.spreadsheetName || 'Base de Dados Partilhada',
          spreadsheetUrl:
            jsonData.syncConfig.spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${jsonData.syncConfig.spreadsheetId}`,
        };
        setSyncConfig(newSync);
        StorageService.saveSyncConfig(newSync);
      }

      setSyncNotification({
        type: 'success',
        text: 'Base de dados importada com sucesso de outra aplicação!',
      });
      setTimeout(() => setSyncNotification(null), 5000);
    } catch (e: any) {
      setSyncNotification({
        type: 'error',
        text: 'Erro ao importar base de dados JSON.',
      });
      setTimeout(() => setSyncNotification(null), 5000);
    }
  };

  // Se o utilizador for 'colaborador', restringir abas que não sejam 'registo'
  const handleTabChange = (tab: ViewTab) => {
    if (userRole === 'colaborador' && tab !== 'registo') {
      setIsAdminPinModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  // Métricas para a Barra Superior do Modo PC
  const dayRegistosForTopBar = registos.filter((r) => r.data === selectedDate);
  const totalGeralDiaTopBar = Number(
    dayRegistosForTopBar
      .reduce((acc, r) => acc + (r.horasNormais || 0) + (r.horasExtra || 0), 0)
      .toFixed(1)
  );
  const totalNormaisTopBar = Number(
    dayRegistosForTopBar
      .reduce((acc, r) => acc + (r.horasNormais || 0), 0)
      .toFixed(1)
  );
  const totalExtraTopBar = Number(
    dayRegistosForTopBar
      .reduce((acc, r) => acc + (r.horasExtra || 0), 0)
      .toFixed(1)
  );
  const uniqueColsTodayTopBar = new Set(
    dayRegistosForTopBar.map((r) => r.colaboradorId)
  ).size;
  const activeWorkersCount = colaboradores.filter((c) => c.ativo).length;
  const activeObrasCount = obras.filter((o) => o.estado === 'em_curso').length;

  return (
    <div
      className={`min-h-screen text-slate-900 flex ${
        layoutMode === 'pc'
          ? 'flex-row h-screen overflow-hidden bg-slate-100'
          : 'flex-col bg-slate-50 font-sans'
      }`}
    >
      {layoutMode === 'pc' ? (
        /* ================= VISTA PC / SECRETÁRIA ================= */
        <>
          {/* Barra Lateral Desktop */}
          <DesktopSidebar
            currentTab={currentTab}
            onTabChange={handleTabChange}
            userRole={userRole}
            onToggleRole={handleToggleRole}
            isDriveConnected={!!syncConfig.spreadsheetId}
            isLiveConnected={isLiveConnected}
            activeObrasCount={activeObrasCount}
            activeWorkersCount={activeWorkersCount}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenDesktopAppModal={() => setIsDesktopModalOpen(true)}
            onToggleLayoutMode={handleToggleLayoutMode}
            onQuickSync={syncConfig.spreadsheetId ? handleSyncNow : undefined}
            isSyncing={isSyncing}
            onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
            syncConfig={syncConfig}
          />

          {/* Área Principal de Trabalho Desktop */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
            {/* Barra Superior Desktop */}
            <DesktopTopBar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dayValidation={validacoes[selectedDate]}
              isDayLocked={isSelectedDayLocked}
              totalGeralDia={totalGeralDiaTopBar}
              totalHorasNormais={totalNormaisTopBar}
              totalHorasExtra={totalExtraTopBar}
              uniqueColsCount={uniqueColsTodayTopBar}
              totalActiveColsCount={activeWorkersCount}
              activeObrasCount={activeObrasCount}
              onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
              onQuickSync={syncConfig.spreadsheetId ? handleSyncNow : undefined}
              isSyncing={isSyncing}
              onOpenDesktopAppModal={() => setIsDesktopModalOpen(true)}
              onToggleLayoutMode={handleToggleLayoutMode}
              dailyViewMode={dailyViewMode}
              onToggleDailyViewMode={setDailyViewMode}
            />

            {/* Notificação Toast */}
            {syncNotification && (
              <div className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between text-xs font-semibold border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  {syncNotification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{syncNotification.text}</span>
                </div>
                <button
                  onClick={() => setSyncNotification(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Conteúdo da Tab em Ecrã Amplo */}
            <main className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
              <div className="max-w-7xl mx-auto space-y-6">
                {currentTab === 'registo' && (
                  <DailyLogView
                    selectedDate={selectedDate}
                    userRole={userRole}
                    isDayLocked={isSelectedDayLocked}
                    dayValidation={validacoes[selectedDate]}
                    colaboradores={colaboradores}
                    obras={obras}
                    registos={registos}
                    currentWorker={currentWorker}
                    onSwitchAccount={() => setIsWorkerLoginModalOpen(true)}
                    onOpenWorkerModal={(col) => setActiveWorkerForModal(col)}
                    onOpenBatchModal={() => setIsBatchModalOpen(true)}
                    onValidateAndLockDay={handleValidateAndLockDay}
                    onUnlockDay={handleUnlockDay}
                    onPromptAdmin={() => setIsAdminPinModalOpen(true)}
                    onExportPdf={() => setIsExportPdfModalOpen(true)}
                    onClearDayRegistos={handleClearDayRegistos}
                    onDeleteRegisto={handleDeleteSingleRegisto}
                    desktopMode={true}
                    dailyViewMode={dailyViewMode}
                    onToggleDailyViewMode={setDailyViewMode}
                    onSaveBatchAllocations={handleSaveBatchAllocations}
                  />
                )}

                {currentTab === 'historico' && (
                  <HistoryView
                    colaboradores={colaboradores}
                    obras={obras}
                    registos={registos}
                    validacoes={validacoes}
                    userRole={userRole}
                    currentWorkerId={currentWorkerId}
                    onNavigateToDate={(date) => {
                      setSelectedDate(date);
                      setCurrentTab('registo');
                    }}
                    onEditRegisto={(reg) => {
                      const col = colaboradores.find((c) => c.id === reg.colaboradorId);
                      if (col) {
                        setSelectedDate(reg.data);
                        setActiveWorkerForModal(col);
                      }
                    }}
                    onDeleteRegisto={handleDeleteSingleRegisto}
                    onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
                  />
                )}

                {currentTab === 'obras' && userRole === 'administrador' && (
                  <ObrasView
                    obras={obras}
                    registos={registos}
                    onSaveObra={handleSaveObra}
                    onDeleteObra={handleDeleteObra}
                  />
                )}

                {currentTab === 'equipa' && userRole === 'administrador' && (
                  <TeamView
                    colaboradores={colaboradores}
                    registos={registos}
                    onSaveColaborador={handleSaveColaborador}
                    onDeleteColaborador={handleDeleteColaborador}
                    syncConfig={syncConfig}
                  />
                )}

                {currentTab === 'relatorios' && userRole === 'administrador' && (
                  <ReportsView
                    colaboradores={colaboradores}
                    obras={obras}
                    registos={registos}
                    onClearAllRegistos={handleClearAllRegistos}
                    onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
                  />
                )}

                {currentTab === 'drive' && userRole === 'administrador' && (
                  <DriveSyncView
                    user={user}
                    syncConfig={syncConfig}
                    colaboradores={colaboradores}
                    obras={obras}
                    registos={registos}
                    onSignIn={handleSignIn}
                    onSignOut={handleSignOut}
                    onUpdateSyncConfig={handleUpdateSyncConfig}
                    onSyncNow={handleSyncNow}
                    onPullFromDrive={handlePullFromDrive}
                    onPushToDrive={handlePushToDrive}
                    validacoes={validacoes}
                    onResetData={handleResetData}
                    onClearAllRegistos={handleClearAllRegistos}
                    onWipeEverything={handleWipeEverything}
                    onOpenMobileModal={() => setIsMobileModalOpen(true)}
                    onOpenShareDatabaseModal={() => setIsShareDatabaseModalOpen(true)}
                    onExportJson={handleExportDatabaseJson}
                    onImportJson={handleImportDatabaseJson}
                    isLiveConnected={isLiveConnected}
                  />
                )}
              </div>
            </main>
          </div>
        </>
      ) : (
        /* ================= VISTA TELEMÓVEL / MÓVEL ================= */
        <>
          {/* Top Header Mobile */}
          <Header
            syncConfig={syncConfig}
            isSyncing={isSyncing}
            userRole={userRole}
            currentWorker={currentWorker}
            onOpenWorkerLogin={() => setIsWorkerLoginModalOpen(true)}
            onQuickSync={syncConfig.spreadsheetId ? handleSyncNow : undefined}
            onOpenDriveTab={() => handleTabChange('drive')}
            onToggleRole={handleToggleRole}
            onOpenMobileModal={() => setIsMobileModalOpen(true)}
            onOpenShareDatabase={() => setIsShareDatabaseModalOpen(true)}
            onToggleLayoutMode={handleToggleLayoutMode}
            onOpenDesktopAppModal={() => setIsDesktopModalOpen(true)}
            appLayoutMode={layoutMode}
            isLiveConnected={isLiveConnected}
          />

          {/* Notificação Toast Mobile */}
          {syncNotification && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] animate-in fade-in slide-in-from-top-2">
              <div
                className={`p-3 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs font-semibold ${
                  syncNotification.type === 'success'
                    ? 'bg-slate-900 text-white border border-slate-700'
                    : 'bg-red-600 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncNotification.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-white shrink-0" />
                  )}
                  <span>{syncNotification.text}</span>
                </div>
                <button
                  onClick={() => setSyncNotification(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Date Selector (visível no ecrã de Registo Diário) */}
          {currentTab === 'registo' && (
            <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          )}

          {/* Main Content Area Mobile */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
            {currentTab === 'registo' && (
              <DailyLogView
                selectedDate={selectedDate}
                userRole={userRole}
                isDayLocked={isSelectedDayLocked}
                dayValidation={validacoes[selectedDate]}
                colaboradores={colaboradores}
                obras={obras}
                registos={registos}
                currentWorker={currentWorker}
                onSwitchAccount={() => setIsWorkerLoginModalOpen(true)}
                onOpenWorkerModal={(col) => setActiveWorkerForModal(col)}
                onOpenBatchModal={() => setIsBatchModalOpen(true)}
                onValidateAndLockDay={handleValidateAndLockDay}
                onUnlockDay={handleUnlockDay}
                onPromptAdmin={() => setIsAdminPinModalOpen(true)}
                onExportPdf={() => setIsExportPdfModalOpen(true)}
                onClearDayRegistos={handleClearDayRegistos}
                onDeleteRegisto={handleDeleteSingleRegisto}
                desktopMode={false}
              />
            )}

            {currentTab === 'historico' && (
              <HistoryView
                colaboradores={colaboradores}
                obras={obras}
                registos={registos}
                validacoes={validacoes}
                userRole={userRole}
                currentWorkerId={currentWorkerId}
                onNavigateToDate={(date) => {
                  setSelectedDate(date);
                  setCurrentTab('registo');
                }}
                onEditRegisto={(reg) => {
                  const col = colaboradores.find((c) => c.id === reg.colaboradorId);
                  if (col) {
                    setSelectedDate(reg.data);
                    setActiveWorkerForModal(col);
                  }
                }}
                onDeleteRegisto={handleDeleteSingleRegisto}
                onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
              />
            )}

            {currentTab === 'obras' && userRole === 'administrador' && (
              <ObrasView
                obras={obras}
                registos={registos}
                onSaveObra={handleSaveObra}
                onDeleteObra={handleDeleteObra}
              />
            )}

            {currentTab === 'equipa' && userRole === 'administrador' && (
              <TeamView
                colaboradores={colaboradores}
                registos={registos}
                onSaveColaborador={handleSaveColaborador}
                onDeleteColaborador={handleDeleteColaborador}
                syncConfig={syncConfig}
              />
            )}

            {currentTab === 'relatorios' && userRole === 'administrador' && (
              <ReportsView
                colaboradores={colaboradores}
                obras={obras}
                registos={registos}
                onClearAllRegistos={handleClearAllRegistos}
                onOpenExportPdf={() => setIsExportPdfModalOpen(true)}
              />
            )}

            {currentTab === 'drive' && userRole === 'administrador' && (
              <DriveSyncView
                user={user}
                syncConfig={syncConfig}
                colaboradores={colaboradores}
                obras={obras}
                registos={registos}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onUpdateSyncConfig={handleUpdateSyncConfig}
                onSyncNow={handleSyncNow}
                onPullFromDrive={handlePullFromDrive}
                onPushToDrive={handlePushToDrive}
                validacoes={validacoes}
                onResetData={handleResetData}
                onClearAllRegistos={handleClearAllRegistos}
                onWipeEverything={handleWipeEverything}
                onOpenMobileModal={() => setIsMobileModalOpen(true)}
                onOpenShareDatabaseModal={() => setIsShareDatabaseModalOpen(true)}
                onExportJson={handleExportDatabaseJson}
                onImportJson={handleImportDatabaseJson}
                isLiveConnected={isLiveConnected}
              />
            )}
          </main>

          {/* Bottom Navigation Bar */}
          <BottomNav
            currentTab={currentTab}
            userRole={userRole}
            onTabChange={handleTabChange}
            isDriveConnected={!!syncConfig.spreadsheetId}
            onPromptAdmin={() => setIsAdminPinModalOpen(true)}
            onOpenWorkerLogin={() => setIsWorkerLoginModalOpen(true)}
          />
        </>
      )}

      {/* ================= MODAIS COMPARTILHADOS (MOBILE E PC) ================= */}

      {/* Modal: Registo Individual do Colaborador (MÚLTIPLAS OBRAS POR DIA) */}
      {activeWorkerForModal && (
        <WorkerLogModal
          isOpen={true}
          onClose={() => setActiveWorkerForModal(null)}
          colaborador={activeWorkerForModal}
          date={selectedDate}
          obras={obras}
          initialRegistos={registos.filter(
            (r) => r.colaboradorId === activeWorkerForModal.id && r.data === selectedDate
          )}
          isLocked={isSelectedDayLocked}
          userRole={userRole}
          onSave={handleSaveWorkerAllocations}
        />
      )}

      {/* Modal: Registo em Lote por Obra */}
      {isBatchModalOpen && (
        <BatchObraLogModal
          isOpen={true}
          onClose={() => setIsBatchModalOpen(false)}
          date={selectedDate}
          obras={obras}
          colaboradores={colaboradores.filter((c) => c.ativo)}
          existingRegistos={registos}
          isLocked={isSelectedDayLocked}
          onSaveBatch={handleSaveBatchAllocations}
        />
      )}

      {/* Modal de Confirmação para Ações Destrutivas ou Bloqueio */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de PIN de Administrador */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setUserRole('administrador');
          StorageService.setAdminMode(true);
        }}
        onGoogleSignIn={handleSignIn}
      />

      {/* Modal de Login de Colaborador (Acesso Exclusivo com PIN) */}
      <CollaboratorLoginModal
        isOpen={isWorkerLoginModalOpen}
        onClose={() => setIsWorkerLoginModalOpen(false)}
        colaboradores={colaboradores.filter((c) => c.ativo)}
        onSelectWorker={handleSelectWorker}
        onSwitchToAdmin={() => setIsAdminPinModalOpen(true)}
        currentWorkerId={currentWorkerId}
      />

      {/* Modal para Testar no Telemóvel (QR Code e Guia PWA) */}
      <MobileTestModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        spreadsheetId={syncConfig.spreadsheetId}
      />

      {/* Modal de Partilha da Base de Dados em Várias Aplicações */}
      <ShareDatabaseModal
        isOpen={isShareDatabaseModalOpen}
        onClose={() => setIsShareDatabaseModalOpen(false)}
        syncConfig={syncConfig}
        colaboradores={colaboradores}
        obras={obras}
        registos={registos}
        validacoes={validacoes}
        onExportJson={handleExportDatabaseJson}
        onImportJson={handleImportDatabaseJson}
      />

      {/* Modal para Exportar e Enviar Folha de Ponto em PDF */}
      <ExportPdfModal
        isOpen={isExportPdfModalOpen}
        onClose={() => setIsExportPdfModalOpen(false)}
        selectedDate={selectedDate}
        colaboradores={colaboradores}
        obras={obras}
        registos={registos}
        validation={validacoes[selectedDate]}
        user={user}
      />

      {/* Modal para Instalar / Criar Atalho para o PC */}
      <DesktopAppModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
        syncConfig={syncConfig}
        onExportJson={handleExportDatabaseJson}
      />
    </div>
  );
}
