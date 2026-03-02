import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { PdfImage } from './reportStore';

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 8;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 10;
const CONTENT_TOP = HEADER_HEIGHT + 2;
const CONTENT_HEIGHT = A4_HEIGHT - CONTENT_TOP - FOOTER_HEIGHT;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const GAP = 4;

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeLayout(): { slots: Slot[]; perPage: number } {
  const slotH = (CONTENT_HEIGHT - GAP) / 2;
  return {
    perPage: 2,
    slots: [
      { x: MARGIN, y: CONTENT_TOP, w: CONTENT_WIDTH, h: slotH },
      { x: MARGIN, y: CONTENT_TOP + slotH + GAP, w: CONTENT_WIDTH, h: slotH },
    ],
  };
}

function addImageInSlot(
  pdf: jsPDF,
  imgData: string,
  slot: Slot,
  origWidth: number,
  origHeight: number,
  label: string
) {
  const labelH = 5;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(80, 80, 80);
  pdf.text(label, slot.x, slot.y + labelH);

  const imgTop = slot.y + labelH + 1;
  const availableH = slot.h - labelH - 1;

  if (availableH <= 0) return;

  const ratio = origHeight / origWidth;
  let imgW = slot.w;
  let imgH = imgW * ratio;

  if (imgH > availableH) {
    imgH = availableH;
    imgW = imgH / ratio;
  }

  const x = slot.x + (slot.w - imgW) / 2;
  const y = imgTop + (availableH - imgH) / 2;
  pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
}

function addHeader(pdf: jsPDF, pageNum: number, totalPages: number, metadata?: { patientName?: string; examDate?: string; patientId?: string }) {
  pdf.setFontSize(14);
  pdf.setTextColor(219, 39, 119);
  pdf.text('EndoMapper - Mapeamento de Lesões', A4_WIDTH / 2, 14, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);

  let infoY = 20;
  if (metadata?.patientName) {
    pdf.text(`Paciente: ${metadata.patientName}`, MARGIN, infoY);
  }
  if (metadata?.patientId) {
    pdf.text(`ID: ${metadata.patientId}`, MARGIN, infoY + 4);
  }

  const dateStr = metadata?.examDate
    ? new Date(metadata.examDate).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  pdf.text(`Data: ${dateStr}`, A4_WIDTH - MARGIN, infoY, { align: 'right' });
  pdf.text(`Página ${pageNum}/${totalPages}`, A4_WIDTH - MARGIN, infoY + 4, { align: 'right' });

  pdf.setDrawColor(219, 39, 119);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, 27, A4_WIDTH - MARGIN, 27);
}

function addFooter(pdf: jsPDF) {
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    'EndoMapper © ' + new Date().getFullYear() + ' - Sistema de Mapeamento de Endometriose',
    A4_WIDTH / 2,
    A4_HEIGHT - 6,
    { align: 'center' }
  );
}

export function generatePdfReport(
  images: PdfImage[],
  metadata?: { patientName?: string; examDate?: string; patientId?: string }
): void {
  if (images.length === 0) {
    toast.warning('Nenhuma imagem adicionada ao relatório.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const { slots, perPage } = computeLayout();
  const totalPages = Math.ceil(images.length / perPage);

  images.forEach((img, index) => {
    const pageIndex = Math.floor(index / perPage);
    const slotIndex = index % perPage;

    if (pageIndex > 0 && slotIndex === 0) {
      pdf.addPage();
    }

    if (slotIndex === 0) {
      addHeader(pdf, pageIndex + 1, totalPages, metadata);
      addFooter(pdf);
    }

    const tempImg = new Image();
    tempImg.src = img.data;
    const origWidth = tempImg.width || 800;
    const origHeight = tempImg.height || 600;

    addImageInSlot(pdf, img.data, slots[slotIndex], origWidth, origHeight, img.label);
  });

  pdf.save('relatorio-endomapper.pdf');
}
