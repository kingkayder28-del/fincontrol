import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './storage';
import { Organization } from '../types';

export interface ReportExportOptions {
  organization: Organization;
  reportTitle: string;
  reportSubtitle?: string;
  reportId?: string;
  generatedBy: string;
  headers: string[];
  rows: (string | number)[][];
  summaryCards?: { label: string; value: string }[];
}

export function exportReportToPDF(options: ReportExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { organization, reportTitle, reportSubtitle, reportId, generatedBy, headers, rows, summaryCards } = options;
  const currencySymbol = organization.currency?.symbol || 'MWK';

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [30, 58, 138]; // Blue 900
  const lightBg = [248, 250, 252];

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LEDGERNEST', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(organization.name.toUpperCase(), 14, 22);
  doc.text(`Currency: ${organization.currency?.code || 'MWK'} (${currencySymbol})`, 14, 27);

  // Report Title & Meta
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(reportTitle, 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (reportSubtitle) {
    doc.text(reportSubtitle, 14, 47);
  }

  const generatedDate = new Date().toLocaleString();
  const idStr = reportId || `REPORT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  doc.text(`Report ID: ${idStr}  |  Generated At: ${generatedDate}  |  By: ${generatedBy}`, 14, 52);

  let currentY = 58;

  // Summary Cards Box
  if (summaryCards && summaryCards.length > 0) {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(14, currentY, 182, 18, 2, 2, 'F');

    const cardWidth = 182 / summaryCards.length;
    summaryCards.forEach((card, idx) => {
      const xPos = 14 + idx * cardWidth + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label.toUpperCase(), xPos, currentY + 6);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(card.value, xPos, currentY + 13);
    });

    currentY += 24;
  }

  // Data Table
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // Footer Signature & Audit info
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  if (finalY + 30 < 280) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('--------------------------------------------', 14, finalY + 15);
    doc.text(`Authorized Officer Signature: ${organization.authorizedSignatory || 'Finance Manager'}`, 14, finalY + 20);
    doc.text('Official LedgerNest Financial Record - Tamper-Proof Audit System', 14, finalY + 25);
  }

  // Save PDF
  const filename = `${reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
