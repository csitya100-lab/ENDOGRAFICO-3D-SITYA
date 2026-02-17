import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import type { Report } from "./reportStore";

const SEVERITY_LABELS: Record<string, string> = {
  superficial: "Superficial",
  deep: "Profunda",
};

const SEVERITY_HEX: Record<string, string> = {
  superficial: "EC4899",
  deep: "EAB308",
};

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 50);
}

export async function exportToPDF(report: Report): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFillColor(236, 72, 153);
  pdf.rect(0, 0, pageWidth, 12, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text("EndoMapper - Relatório de Mapeamento", margin, 8);
  y = 20;

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Relatório de Exame", margin, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(71, 85, 105);

  const infoRows = [
    ["Paciente:", report.patientName],
    ["ID:", report.patientId],
    ["Data do Exame:", report.examDate],
    ["Tipo:", report.examType],
    ["Relatório ID:", report.id],
  ];

  for (const [label, value] of infoRows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, margin + 35, y);
    y += 6;
  }
  y += 4;

  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  const views2D = [
    { key: "sagittal" as const, label: "Sagittal" },
    { key: "coronal" as const, label: "Coronal" },
    { key: "posterior" as const, label: "Posterior" },
  ];

  const available2D = views2D.filter((v) => report.images2D[v.key]);

  if (available2D.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59);
    pdf.text("Vistas 2D", margin, y);
    y += 8;

    const imgWidth = (contentWidth - (available2D.length - 1) * 4) / available2D.length;
    const imgHeight = imgWidth;

    for (let i = 0; i < available2D.length; i++) {
      const view = available2D[i];
      const x = margin + i * (imgWidth + 4);

      try {
        pdf.addImage(report.images2D[view.key], "PNG", x, y, imgWidth, imgHeight);
      } catch {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(x, y, imgWidth, imgHeight, "F");
      }

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text(view.label, x + imgWidth / 2, y + imgHeight + 5, { align: "center" });
    }
    y += imgHeight + 12;
  }

  const images3D = report.images3D || [];
  if (images3D.length > 0) {
    if (y > 200) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59);
    pdf.text("Capturas 3D", margin, y);
    y += 8;

    const cols = Math.min(images3D.length, 3);
    const img3DWidth = (contentWidth - (cols - 1) * 4) / cols;
    const img3DHeight = img3DWidth;

    for (let i = 0; i < images3D.length; i++) {
      const col = i % cols;
      if (col === 0 && i > 0) {
        y += img3DHeight + 14;
        if (y + img3DHeight > 280) {
          pdf.addPage();
          y = margin;
        }
      }
      const x = margin + col * (img3DWidth + 4);

      try {
        pdf.addImage(images3D[i].data, "PNG", x, y, img3DWidth, img3DHeight);
      } catch {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(x, y, img3DWidth, img3DHeight, "F");
      }

      if (images3D[i].label) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        pdf.text(images3D[i].label, x + img3DWidth / 2, y + img3DHeight + 4, { align: "center" });
      }
    }
    y += img3DHeight + 14;
  }

  if (report.lesions.length > 0) {
    if (y > 220) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59);
    pdf.text("Resumo das Lesões", margin, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, contentWidth, 7, "F");
    pdf.setTextColor(71, 85, 105);
    pdf.text("Lesão", margin + 2, y + 5);
    pdf.text("Localização", margin + 40, y + 5);
    pdf.text("Severidade", margin + contentWidth - 30, y + 5);
    y += 9;

    pdf.setFont("helvetica", "normal");
    report.lesions.forEach((lesion) => {
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }

      const sevColor = lesion.severity === "superficial" ? [236, 72, 153] : [234, 179, 8];
      pdf.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
      pdf.circle(margin + 4, y + 2.5, 2, "F");

      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "bold");
      pdf.text(lesion.name, margin + 10, y + 4);
      
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text(lesion.location.substring(0, 40), margin + 40, y + 4);

      const sevLabel = SEVERITY_LABELS[lesion.severity] || lesion.severity;
      pdf.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
      pdf.text(sevLabel, margin + contentWidth - 30, y + 4);

      y += 6;

      if (lesion.comment) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(100, 116, 139);
        
        const splitComment = pdf.splitTextToSize(lesion.comment, contentWidth - 50);
        pdf.text(splitComment, margin + 10, y + 2);
        y += (splitComment.length * 4) + 2;
      } else {
        y += 2;
      }
    });
  }

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — EndoMapper`,
    pageWidth / 2,
    pdf.internal.pageSize.getHeight() - 8,
    { align: "center" }
  );

  const filename = `relatorio_${sanitizeFilename(report.patientName)}_${report.examDate.replace(/\//g, "-")}.pdf`;
  pdf.save(filename);
}

export async function exportToWord(report: Report): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "EndoMapper — Relatório de Mapeamento", color: "EC4899", size: 18, font: "Arial" }),
      ],
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Relatório de Exame", bold: true, size: 36, font: "Arial", color: "1E293B" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const infoRows = [
    ["Paciente", report.patientName],
    ["ID", report.patientId],
    ["Data do Exame", report.examDate],
    ["Tipo", report.examType],
    ["Relatório ID", report.id],
  ];

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: infoRows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: "475569" })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value, size: 20, font: "Arial", color: "1E293B" })],
                }),
              ],
            }),
          ],
        })
    ),
  });
  children.push(infoTable);

  children.push(new Paragraph({ spacing: { before: 200, after: 200 } }));

  const views2D = [
    { key: "sagittal" as const, label: "Sagittal" },
    { key: "coronal" as const, label: "Coronal" },
    { key: "posterior" as const, label: "Posterior" },
  ];
  const available2D = views2D.filter((v) => report.images2D[v.key]);

  if (available2D.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Vistas 2D", bold: true, size: 28, font: "Arial", color: "1E293B" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const view of available2D) {
      try {
        const imageData = base64ToUint8Array(report.images2D[view.key]);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageData,
                transformation: { width: 300, height: 300 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        );
        children.push(
          new Paragraph({
            children: [new TextRun({ text: view.label, italics: true, size: 18, font: "Arial", color: "64748B" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
          })
        );
      } catch {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[${view.label} — imagem indisponível]`, color: "94A3B8", size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
          })
        );
      }
    }
  }

  const images3D = report.images3D || [];
  if (images3D.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Capturas 3D", bold: true, size: 28, font: "Arial", color: "1E293B" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const img of images3D) {
      try {
        const imageData = base64ToUint8Array(img.data);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageData,
                transformation: { width: 350, height: 350 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        );
        if (img.label) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: img.label, italics: true, size: 18, font: "Arial", color: "64748B" })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
            })
          );
        }
      } catch {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[Captura 3D — imagem indisponível]`, color: "94A3B8", size: 18 })],
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  if (report.lesions.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Resumo das Lesões", bold: true, size: 28, font: "Arial", color: "1E293B" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    const headerRow = new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: "F1F5F9" },
          children: [
            new Paragraph({ children: [new TextRun({ text: "Lesão", bold: true, size: 18, font: "Arial" })] }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: "F1F5F9" },
          children: [
            new Paragraph({ children: [new TextRun({ text: "Localização", bold: true, size: 18, font: "Arial" })] }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: "F1F5F9" },
          children: [
            new Paragraph({ children: [new TextRun({ text: "Severidade", bold: true, size: 18, font: "Arial" })] }),
          ],
        }),
      ],
    });

    const lesionRows = [];
    for (const lesion of report.lesions) {
      lesionRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: lesion.name, size: 18, font: "Arial", color: "1E293B" })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: lesion.location, size: 18, font: "Arial", color: "475569" })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: SEVERITY_LABELS[lesion.severity] || lesion.severity,
                      size: 18,
                      font: "Arial",
                      bold: true,
                      color: SEVERITY_HEX[lesion.severity] || "000000",
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );

      if (lesion.comment) {
        lesionRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 3,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Obs: ${lesion.comment}`,
                        size: 16,
                        font: "Arial",
                        color: "64748B",
                        italics: true,
                      }),
                    ],
                    spacing: { before: 50, after: 50 },
                  }),
                ],
              }),
            ],
          })
        );
      }
    }

    const lesionTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...lesionRows],
    });
    children.push(lesionTable);
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — EndoMapper`,
          size: 14,
          font: "Arial",
          color: "94A3B8",
          italics: true,
        }),
      ],
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [
      {
        children,
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `relatorio_${sanitizeFilename(report.patientName)}_${report.examDate.replace(/\//g, "-")}.docx`;
  saveAs(blob, filename);
}
