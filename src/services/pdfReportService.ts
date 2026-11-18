import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Colaborador, Obra, RegistoHoras, ValidacaoDia } from '../types';

export interface DailyReportData {
  date: string;
  colaboradores: Colaborador[];
  obras: Obra[];
  registos: RegistoHoras[];
  validation?: ValidacaoDia;
}

export const PdfReportService = {
  /**
   * Gera o documento PDF com a folha de ponto diária da Metaloespo
   */
  generateDailyTimesheetPdf(data: DailyReportData): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const { date, colaboradores, obras, registos, validation } = data;

    // Formatar data em português
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dayRegistos = registos.filter((r) => r.data === date);
    const obrasMap = new Map(obras.map((o) => [o.id, o]));
    const colsMap = new Map(colaboradores.map((c) => [c.id, c]));

    // Totais gerais do dia
    const totalNormais = dayRegistos.reduce((acc, r) => acc + (r.horasNormais || 0), 0);
    const totalExtra = dayRegistos.reduce((acc, r) => acc + (r.horasExtra || 0), 0);
    const totalGeral = Number((totalNormais + totalExtra).toFixed(1));
    const activeWorkersToday = new Set(dayRegistos.map((r) => r.colaboradorId)).size;
    const activeObrasToday = new Set(dayRegistos.map((r) => r.obraId)).size;

    // --- CABEÇALHO DA EMPRESA ---
    // Barra superior decorativa
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 22, 'F');

    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 22, 210, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('METALOESPO', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240); // slate-200
    doc.text('FOLHA DE PONTO DIÁRIA & REGISTO DE HORAS', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Data: ${date}`, 196, 13, { align: 'right' });
    doc.text(
      validation?.bloqueado ? 'ESTADO: VALIDADO' : 'ESTADO: EM ABERTO',
      196,
      18,
      { align: 'right' }
    );

    // --- INFORMAÇÃO DO DIA & RESUMO ---
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Registo Diário de Ponto - ${formattedDate}`, 14, 32);

    // Cartões de Totais (com alto contraste entre caixas, bordas e texto)
    const cardY = 36;
    const cardHeight = 16;

    // Cartão 1: Total Horas
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(100, 116, 139); // slate-500
    doc.setLineWidth(0.35);
    doc.roundedRect(14, cardY, 43, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // slate-900 (alto contraste)
    doc.text('TOTAL DE HORAS', 17, cardY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalGeral} h`, 17, cardY + 12.5);

    // Cartão 2: Horas Normais (Destaque e alto contraste para máxima legibilidade)
    doc.setFillColor(236, 253, 245); // Fundo verde esmeralda claro (emerald-50)
    doc.setDrawColor(5, 150, 105); // Borda verde esmeralda sólida e nítida (emerald-600)
    doc.setLineWidth(0.45); // Borda reforçada para destacar a caixa
    doc.roundedRect(61, cardY, 43, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 78, 59); // Verde esmeralda muito escuro (emerald-900) para contraste perfeito
    doc.text('HORAS NORMAIS', 64, cardY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(4, 120, 87); // Verde escuro encorpado (emerald-700)
    doc.text(`${totalNormais.toFixed(1)} h`, 64, cardY + 12.5);

    // Cartão 3: Horas Suplementares (Extra)
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(0.35);
    doc.roundedRect(108, cardY, 43, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15); // amber-900 (alto contraste)
    doc.text('HORAS EXTRA', 111, cardY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`${totalExtra.toFixed(1)} h`, 111, cardY + 12.5);

    // Cartão 4: Colaboradores / Obras
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(37, 99, 235); // blue-600
    doc.setLineWidth(0.35);
    doc.roundedRect(155, cardY, 41, cardHeight, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138); // blue-900 (alto contraste)
    doc.text('PESSOAL / OBRAS', 158, cardY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(`${activeWorkersToday} col. · ${activeObrasToday} obras`, 158, cardY + 12.5);

    // --- TABELA 1: DETALHE POR COLABORADOR ---
    const tableWorkersData: any[] = [];

    // Agrupar por colaborador (ativos ou qualquer colaborador com registo no dia)
    const workerIdsWithRecords = new Set(dayRegistos.map((r) => r.colaboradorId));
    const relevantCols = colaboradores.filter((c) => c.ativo || workerIdsWithRecords.has(c.id));
    relevantCols.forEach((col) => {
      const colRegs = dayRegistos.filter((r) => r.colaboradorId === col.id);
      const colNorm = colRegs.reduce((acc, r) => acc + (r.horasNormais || 0), 0);
      const colExt = colRegs.reduce((acc, r) => acc + (r.horasExtra || 0), 0);
      const colTot = Number((colNorm + colExt).toFixed(1));

      // Obter nomes das obras e descrição
      const obrasNames = colRegs
        .map((r) => {
          const ob = obrasMap.get(r.obraId);
          const desc = r.descricao ? ` [${r.descricao}]` : '';
          return ob ? `${ob.codigo} (${(r.horasNormais || 0) + (r.horasExtra || 0)}h${desc})` : 'N/D';
        })
        .join(', ');

      const status =
        colTot === 0
          ? 'Ausente / Sem registo'
          : colTot === 8
          ? 'Completo (8h)'
          : colTot > 8
          ? `Extra (+${(colTot - 8).toFixed(1)}h)`
          : `Incompleto (${colTot}h)`;

      tableWorkersData.push([
        col.ativo ? col.nome : `${col.nome} (Inativo)`,
        col.funcao,
        obrasNames || '-',
        colNorm > 0 ? `${colNorm.toFixed(1)}` : '0',
        colExt > 0 ? `${colExt.toFixed(1)}` : '0',
        colTot > 0 ? `${colTot.toFixed(1)} h` : '0 h',
        status,
        '', // Espaço para assinatura/rubrica
      ]);
    });

    autoTable(doc, {
      startY: 56,
      head: [
        [
          'Colaborador',
          'Função',
          'Obras Alocadas',
          'Normais',
          'Extra',
          'Total',
          'Estado',
          'Rubrica',
        ],
      ],
      body: tableWorkersData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 42 },
        3: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] }, // Normais (alto contraste verde escuro)
        4: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] }, // Extra (alto contraste âmbar)
        5: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] }, // Total (alto contraste slate escuro)
        6: { cellWidth: 23 },
        7: { cellWidth: 20 }, // Assinatura
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Posição vertical após a primeira tabela
    let finalY = (doc as any).lastAutoTable?.finalY || 160;

    // --- TABELA 2: RESUMO POR OBRA TRABALHADA NO DIA ---
    if (activeObrasToday > 0) {
      if (finalY > 210) {
        doc.addPage();
        finalY = 20;
      } else {
        finalY += 8;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Distribuição por Obra no Dia', 14, finalY);

      const tableObrasData: any[] = [];
      obras.forEach((obr) => {
        const obrRegs = dayRegistos.filter((r) => r.obraId === obr.id);
        if (obrRegs.length > 0) {
          const totNorm = obrRegs.reduce((acc, r) => acc + (r.horasNormais || 0), 0);
          const totExt = obrRegs.reduce((acc, r) => acc + (r.horasExtra || 0), 0);
          const colsCount = new Set(obrRegs.map((r) => r.colaboradorId)).size;

          tableObrasData.push([
            obr.codigo,
            obr.nome,
            obr.cliente,
            obr.localizacao,
            `${colsCount} colab.`,
            `${totNorm.toFixed(1)} h`,
            totExt > 0 ? `+${totExt.toFixed(1)} h` : '-',
            `${(totNorm + totExt).toFixed(1)} h`,
          ]);
        }
      });

      autoTable(doc, {
        startY: finalY + 3,
        head: [
          [
            'Código',
            'Nome da Obra',
            'Cliente',
            'Localização',
            'Efetivo',
            'H. Normais',
            'H. Extra',
            'Total',
          ],
        ],
        body: tableObrasData,
        theme: 'grid',
        headStyles: {
          fillColor: [71, 85, 105], // slate-600
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 45 },
          2: { cellWidth: 32 },
          3: { cellWidth: 35 },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [4, 120, 87] }, // H. Normais (alto contraste)
          6: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] }, // H. Extra (alto contraste)
          7: { cellWidth: 17, halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] }, // Total
        },
      });

      finalY = (doc as any).lastAutoTable?.finalY || finalY + 40;
    }

    // --- RODAPÉ / VALIDAÇÃO E ASSINATURA DA ADMINISTRAÇÃO ---
    if (finalY > 245) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 8;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(148, 163, 184); // slate-400 (borda nítida)
    doc.setLineWidth(0.35);
    doc.roundedRect(14, finalY, 182, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('CONFERÊNCIA E VALIDAÇÃO DA ADMINISTRAÇÃO / ENCARREGADO:', 18, finalY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const validInfo = validation?.bloqueado
      ? `Validado e aprovado por: ${validation.validadoPor || 'Alberto (Metaloespo)'} em ${
          validation.validadoEm || date
        }. Registos conferidos.`
      : 'Documento provisório. Aguarda conferência e validação final da administração.';
    doc.text(validInfo, 18, finalY + 12);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Assinatura do Responsável: _________________________________________', 18, finalY + 19);

    // Rodapé de página com numeração
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Metaloespo - Folha de Ponto Diária · Gerado em ${new Date().toLocaleString('pt-PT')} · Página ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return doc;
  },

  /**
   * Procura ou cria a pasta "Folhas de Ponto - Metaloespo" no Google Drive
   */
  async getOrCreateDriveFolder(accessToken: string): Promise<string> {
    const folderName = 'Folhas de Ponto - Metaloespo';

    // 1. Procurar pasta existente
    const query = encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Se não existir, criar a pasta
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error('Não foi possível criar a pasta no Google Drive.');
    }

    const folder = await createRes.json();
    return folder.id;
  },

  /**
   * Envia o ficheiro PDF gerado para a pasta no Google Drive
   */
  async uploadPdfToGoogleDrive(
    pdfBlob: Blob,
    fileName: string,
    accessToken: string
  ): Promise<{ id: string; name: string; webViewLink: string }> {
    const folderId = await this.getOrCreateDriveFolder(accessToken);

    const metadata = {
      name: fileName,
      mimeType: 'application/pdf',
      parents: [folderId],
    };

    const boundary = 'foo_bar_baz_metaloespo';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`;
    const fileHeaderPart = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

    const blobPart1 = new Blob([metadataPart], { type: 'text/plain' });
    const blobPart2 = new Blob([fileHeaderPart], { type: 'text/plain' });
    const blobPart3 = new Blob([closeDelimiter], { type: 'text/plain' });

    const multipartBlob = new Blob([blobPart1, blobPart2, pdfBlob, blobPart3], {
      type: `multipart/related; boundary=${boundary}`,
    });

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: multipartBlob,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Erro no upload para o Drive:', errText);
      throw new Error(`Falha ao guardar PDF no Google Drive: ${uploadRes.statusText}`);
    }

    return await uploadRes.json();
  },
};
