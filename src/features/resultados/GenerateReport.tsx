import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { COPStatistics } from '../../core/services/hooks/useCOPCalculator';

interface GenerateReportProps {
  pet: {
    name: string;
    race: string;
    age: number;
    weight: string;
    gender: string;
    diagnosis?: string;
    owner?: string;
  };
  appointmentDate: string;
  processedData: any[];
  copStats: COPStatistics | null;
  measurementType: 'static' | 'dynamic';
  timeChartData: any[];
  avgWeights: any[];
  avgSymmetry: any[];
}

export const generatePDF = async ({
  pet,
  appointmentDate,
  processedData,
  copStats,
  measurementType,
  timeChartData,
  avgWeights,
  avgSymmetry
}: GenerateReportProps) => {
  // Crear nuevo documento PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configuración de colores
  const primaryColor = '#2563eb';
  const secondaryColor = '#475569';
  const accentColor = '#10b981';
  const dangerColor = '#ef4444';

  let yPos = 20;

  // ==================== TÍTULO ====================
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Resultados', 105, yPos, { align: 'center' });
  yPos += 10;

  // ==================== INFORMACIÓN DEL PACIENTE ====================
  doc.setFontSize(14);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Paciente', 14, yPos);
  yPos += 6;

  // Crear tabla de información del paciente
  autoTable(doc, {
    startY: yPos,
    head: [['Campo', 'Valor']],
    body: [
      ['Nombre', pet.name],
      ['Raza', pet.race],
      ['Edad', `${pet.age} años`],
      ['Peso', `${pet.weight} kg`],
      ['Género', pet.gender === 'M' ? 'Macho' : 'Hembra'],
      ['Dueño', pet.owner || 'No especificado'],
      ['Diagnóstico', pet.diagnosis || 'Sin diagnóstico'],
      ['Fecha', appointmentDate],
      ['Tipo de medición', measurementType === 'static' ? 'Estático' : 'Dinámico'],
      ['Puntos recolectados', processedData.length.toString()]
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 'white' },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // @ts-ignore - autoTable modifica doc internamente
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== ESTADÍSTICAS COP ====================
  if (copStats) {
    doc.setFontSize(14);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Estadísticas del Centro de Presiones (COP)', 14, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Parámetro', 'Media ± SE', 'Desviación Estándar', 'Muestras']],
      body: [
        [
          'COP-MedLat (mm)',
          `${copStats.medLat.mean.toFixed(2)} ± ${copStats.medLat.se.toFixed(2)}`,
          copStats.medLat.std.toFixed(2),
          copStats.sampleSize.toString()
        ],
        [
          'COP-CranCaud (mm)',
          `${copStats.cranCaud.mean.toFixed(2)} ± ${copStats.cranCaud.se.toFixed(2)}`,
          copStats.cranCaud.std.toFixed(2),
          copStats.sampleSize.toString()
        ],
        [
          'Superficie de Soporte (mm²)',
          `${copStats.supportSurface.mean.toFixed(2)} ± ${copStats.supportSurface.se.toFixed(2)}`,
          copStats.supportSurface.std.toFixed(2),
          copStats.sampleSize.toString()
        ],
        [
          'Longitud Estatokinesiograma (mm)',
          copStats.statokinesiogramLength.toFixed(2),
          '-',
          '-'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 'white' },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ==================== GRÁFICAS ====================
  // Función para capturar y agregar gráficas
  const addChartToPDF = async (chartElementId: string, title: string) => {
    const element = document.getElementById(chartElementId);
    if (!element) return yPos;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, yPos);
      yPos += 5;

      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    } catch (error) {
      console.error(`Error capturando gráfica ${title}:`, error);
    }

    return yPos;
  };

  // Capturar todas las gráficas usando IDs únicos
  const chartIds = [
    { id: 'chart-gyro', title: 'Giroscopio (rad/s)' },
    { id: 'chart-accel', title: 'Acelerómetro (g)' },
    { id: 'chart-weights-line', title: 'Evolución de Pesos' },
    { id: 'chart-weights-bar', title: 'Promedios de Peso' },
    { id: 'chart-symmetry-line', title: 'Evolución de Simetría (%)' },
    { id: 'chart-symmetry-bar', title: 'Promedios de Simetría (%)' }
  ];

  for (const chart of chartIds) {
    yPos = await addChartToPDF(chart.id, chart.title);
  }

  // ==================== PIE DE PÁGINA ====================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.text(
      `Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
      14,
      287
    );
    doc.text(`Página ${i} de ${pageCount}`, 180, 287);
  }

  // Guardar el PDF
  doc.save(`reporte_${pet.name}_${new Date().toISOString().slice(0,10)}.pdf`);
};