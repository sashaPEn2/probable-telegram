import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Certificate, CustomUser } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { isInIframe } from '../lib/iframeUtils';
import { withSafeColorsForHtml2Canvas } from '../lib/pdfUtils';
import { 
  X, 
  Download, 
  Printer, 
  Award, 
  ShieldCheck, 
  Clock, 
  Loader2,
  FileDown,
  ExternalLink
} from 'lucide-react';

interface CertificateModalProps {
  certificate: Certificate;
  recipientUser: CustomUser | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  certificate,
  recipientUser,
  onClose
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'png' | null>(null);
  const [iframeWarning, setIframeWarning] = useState(false);

  const fullName = recipientUser
    ? `${recipientUser.last_name} ${recipientUser.first_name} ${recipientUser.middle_name || ''}`.trim()
    : 'Участник СНО';

  const groupText = recipientUser?.group ? `студента группы ${recipientUser.group}` : 'студента';
  const facultyText = recipientUser?.faculty ? `${recipientUser.faculty} БГЭУ` : 'факультета экономики и менеджмента БГЭУ';

  // Format date elegantly (e.g. "29 июня 2026 г.")
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) + ' г.';
    } catch {
      return dateStr;
    }
  };

  // Get localized type title
  const getCertificateTypeTitle = () => {
    switch (certificate.type) {
      case 'диплом_1_степени':
        return 'ДИПЛОМ I СТЕПЕНИ';
      case 'диплом_2_степени':
        return 'ДИПЛОМ II СТЕПЕНИ';
      case 'диплом_3_степени':
        return 'ДИПЛОМ III СТЕПЕНИ';
      case 'грамота':
        return 'ПОЧЕТНАЯ ГРАМОТА';
      case 'сертификат_участника':
      default:
        return 'СЕРТИФИКАТ УЧАСТНИКА';
    }
  };

  // Theme based on certificate type
  const getThemeStyles = () => {
    switch (certificate.type) {
      case 'диплом_1_степени':
        return {
          bgGradient: 'from-emerald-600/5 to-emerald-700/5',
          borderColor: 'border-emerald-500',
          badgeBg: 'bg-emerald-100/50 text-amber-800 border-emerald-300',
          titleColor: 'text-emerald-600 dark:text-emerald-400',
          sealColor: 'text-emerald-600',
          sealBg: 'bg-emerald-100/50',
          ribbonColor: 'bg-emerald-600',
          accentBorder: '#10b981',
          ribbonStyle: 'linear-gradient(135deg, #f59e0b, #b45309)',
        };
      case 'диплом_2_степени':
        return {
          bgGradient: 'from-slate-400/5 to-slate-600/5',
          borderColor: 'border-slate-400',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          titleColor: 'text-slate-600 dark:text-slate-400',
          sealColor: 'text-slate-500',
          sealBg: 'bg-slate-100',
          ribbonColor: 'bg-slate-400',
          accentBorder: '#94a3b8',
          ribbonStyle: 'linear-gradient(135deg, #cbd5e1, #475569)',
        };
      case 'диплом_3_степени':
        return {
          bgGradient: 'from-amber-700/5 to-amber-900/5',
          borderColor: 'border-amber-700',
          badgeBg: 'bg-emerald-100/50 text-amber-950 border-emerald-500/30',
          titleColor: 'text-amber-800 dark:text-emerald-600',
          sealColor: 'text-emerald-700',
          sealBg: 'bg-emerald-100/50',
          ribbonColor: 'bg-amber-700',
          accentBorder: '#b45309',
          ribbonStyle: 'linear-gradient(135deg, #d97706, #78350f)',
        };
      case 'грамота':
        return {
          bgGradient: 'from-red-500/5 to-rose-600/5',
          borderColor: 'border-green-500',
          badgeBg: 'bg-green-100 text-green-800 border-green-300',
          titleColor: 'text-green-600 dark:text-green-400',
          sealColor: 'text-green-600',
          sealBg: 'bg-green-100',
          ribbonColor: 'bg-green-500',
          accentBorder: '#10b981',
          ribbonStyle: 'linear-gradient(135deg, #10b981, #be123c)',
        };
      case 'сертификат_участника':
      default:
        return {
          bgGradient: 'from-emerald-500/5 to-indigo-600/5',
          borderColor: 'border-emerald-500',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          titleColor: 'text-emerald-700 dark:text-emerald-400',
          sealColor: 'text-emerald-700',
          sealBg: 'bg-emerald-100',
          ribbonColor: 'bg-emerald-500',
          accentBorder: '#10b981',
          ribbonStyle: 'linear-gradient(135deg, #10b981, #1d4ed8)',
        };
    }
  };

  const theme = getThemeStyles();

  // Export to PDF
  const handleExportPDF = async () => {
    if (isInIframe()) {
      setIframeWarning(true);
      return;
    }
    if (!certificateRef.current) return;
    setIsExporting('pdf');
    try {
      // Force element dimensions to standard landscape A4 (approx 1123x794 pixels at 96 dpi)
      const element = certificateRef.current;
      const originalStyle = element.getAttribute('style') || '';
      
      // Temporarily set fixed size and style for snapshotting
      element.setAttribute('style', `width: 1123px; height: 794px; min-width: 1123px; min-height: 794px; position: relative; left: 0; top: 0;`);
      
      let canvas: HTMLCanvasElement | null = null;
      await withSafeColorsForHtml2Canvas(element, async () => {
        canvas = await html2canvas(element, {
          scale: 2, // High DPI
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
      });
      
      // Restore original style
      element.setAttribute('style', originalStyle);

      if (!canvas) {
        throw new Error("Failed to render canvas");
      }

      const imgData = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SNO_FEM_Certificate_${certificate.id}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(null);
    }
  };

  // Export as PNG Image
  const handleExportPNG = async () => {
    if (!certificateRef.current) return;
    setIsExporting('png');
    try {
      const element = certificateRef.current;
      const originalStyle = element.getAttribute('style') || '';
      
      // Temporarily set fixed size and style for snapshotting
      element.setAttribute('style', `width: 1123px; height: 794px; min-width: 1123px; min-height: 794px; position: relative; left: 0; top: 0;`);
      
      let canvas: HTMLCanvasElement | null = null;
      await withSafeColorsForHtml2Canvas(element, async () => {
        canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
      });
      
      element.setAttribute('style', originalStyle);

      if (!canvas) {
        throw new Error("Failed to render canvas");
      }

      const link = document.createElement('a');
      link.download = `SNO_FEM_Certificate_${certificate.id}.png`;
      link.href = (canvas as HTMLCanvasElement).toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    } finally {
      setIsExporting(null);
    }
  };

  // Direct print option
  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md overflow-y-auto p-4 md:p-8 flex justify-center animate-fadeIn print:static print:bg-white cursor-zoom-out"
    >
      
      {/* Floating close and download buttons for mobile & quick access (always visible) */}
      <div className="fixed top-4 right-4 z-[210] flex items-center space-x-2 print:hidden" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleExportPDF}
          disabled={isExporting !== null}
          className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90 disabled:opacity-50 flex items-center justify-center border border-emerald-400"
          title="Скачать PDF (A4)"
        >
          {isExporting === 'pdf' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={onClose}
          className="p-3.5 bg-slate-900/95 border border-slate-800 text-slate-300 hover:text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Container holding controls and the certificate board */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="max-w-5xl w-full flex flex-col items-center space-y-4 print:space-y-0 print:p-0 my-auto cursor-default"
      >
        
        {/* Actions panel (hidden in print) */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/95 text-white p-4 rounded-3xl border border-slate-800 shadow-xl print:hidden">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${theme.badgeBg}`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight uppercase">Электронный {certificate.type.startsWith('диплом') ? 'диплом' : 'сертификат'}</h4>
              <p className="text-[11px] text-slate-400 font-medium">Сгенерирован и верифицирован базой данных СНО ФЭМ</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать</span>
            </button>
            
            <button
              onClick={handleExportPNG}
              disabled={isExporting !== null}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isExporting === 'png' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG Рисунок</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting !== null}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-md disabled:opacity-50"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Скачать PDF (A4)</span>
            </button>
            
            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>
            
            <button
              onClick={onClose}
              className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {iframeWarning && (
          <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-amber-800 dark:text-amber-400 text-sm print:hidden">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Ограничения предпросмотра</span>
            </div>
            <p>
              В режиме предпросмотра скачивание и печать могут быть заблокированы. 
              Пожалуйста, откройте приложение в новой вкладке браузера (кнопка в правом верхнем углу окна), чтобы распечатать или скачать диплом.
            </p>
          </div>
        )}

        {/* --- CERTIFICATE DISPLAY (Strict landscape A4 aspect ratio 1123 x 794 px on export) --- */}
        <div className="w-full overflow-x-auto pb-4 flex justify-center print:p-0 print:overflow-visible">
          
          <div 
            ref={certificateRef}
            className="w-[960px] h-[678px] min-w-[960px] min-h-[678px] bg-[#faf9f6] text-slate-900 border-[16px] rounded-sm p-10 flex flex-col justify-between relative shadow-2xl overflow-hidden select-none print:shadow-none print:border-[16px] print:my-0"
            style={{ 
              borderColor: theme.accentBorder,
              fontFamily: '"Inter", sans-serif'
            }}
          >
            {/* Background elegant watermarked circle pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none"></div>
            
            {/* Elegant corner decorative framing lines using absolute positioning */}
            <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed opacity-25 pointer-events-none" style={{ borderColor: theme.accentBorder }}></div>
            <div className="absolute top-2 left-2 right-2 bottom-2 border border-solid opacity-10 pointer-events-none" style={{ borderColor: theme.accentBorder }}></div>
            
            {/* Elegant Corner Decals (SVG ornaments) */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 pointer-events-none opacity-60" style={{ borderColor: theme.accentBorder }}></div>
            <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 pointer-events-none opacity-60" style={{ borderColor: theme.accentBorder }}></div>
            <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 pointer-events-none opacity-60" style={{ borderColor: theme.accentBorder }}></div>
            <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 pointer-events-none opacity-60" style={{ borderColor: theme.accentBorder }}></div>

            {/* --- HEADER --- */}
            <div className="text-center space-y-1 relative z-10">
              <div className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase">
                Министерство образования Республики Беларусь
              </div>
              <div className="text-xs font-extrabold tracking-[0.15em] text-slate-700 uppercase">
                Белорусский государственный экономический университет
              </div>
              <div className="text-[11px] font-bold tracking-[0.1em] text-emerald-900 uppercase">
                Студенческое научное общество ФЭМ БГЭУ
              </div>
              <div className="w-48 h-0.5 mx-auto my-3" style={{ background: theme.ribbonStyle }}></div>
            </div>

            {/* --- MAIN TITLE BLOCK --- */}
            <div className="text-center space-y-2 relative z-10">
              <h1 className={`text-4xl font-black tracking-widest ${theme.titleColor} font-serif`}>
                {getCertificateTypeTitle()}
              </h1>
              <div className="text-[11px] font-extrabold tracking-[0.3em] text-slate-500 uppercase">
                Интеллектуальный Клуб СНО ФЭМ
              </div>
            </div>

            {/* --- CONTENT BLOCK --- */}
            <div className="text-center space-y-5 relative z-10 max-w-2xl mx-auto">
              <div className="text-xs font-medium italic text-slate-500 uppercase tracking-widest">
                Настоящим документом подтверждается, что
              </div>
              
              {/* Recipient's Name */}
              <div className="py-1">
                <span className="text-3xl font-black tracking-tight text-slate-900 font-serif border-b-2 border-slate-300 pb-1.5 px-8 inline-block italic">
                  {fullName}
                </span>
                <div className="text-xs text-slate-500 font-bold mt-2">
                  {groupText}, {facultyText}
                </div>
              </div>

              {/* Award Details */}
              <div className="text-sm text-slate-700 leading-relaxed font-medium">
                {certificate.type.startsWith('диплом') ? (
                  <>
                    награждается за успешное прохождение и занятое <strong className="text-slate-900 font-extrabold">{certificate.type === 'диплом_1_степени' ? '1-е' : certificate.type === 'диплом_2_степени' ? '2-е' : '3-е'} место</strong> в интеллектуальной онлайн-викторине
                  </>
                ) : (
                  <>
                    награждается за активное и результативное участие в интеллектуальной онлайн-викторине
                  </>
                )}
                <div className="text-base font-extrabold text-blue-950 mt-1">
                  «{certificate.title.replace(/Победитель викторины\s*["«]|["»]\s*\(\d-е место\)/g, '').trim()}»
                </div>
                {certificate.custom_points && certificate.custom_points > 0 && (
                  <div className="text-xs font-black text-emerald-600 uppercase tracking-wider mt-1 flex items-center justify-center space-x-1">
                    <span>С начислением {certificate.custom_points} рейтинговых баллов</span>
                  </div>
                )}
              </div>
            </div>

            {/* --- FOOTER / SIGNATURES & VERIFICATION --- */}
            <div className="grid grid-cols-3 items-end pt-4 border-t border-slate-200 relative z-10">
              
              {/* Left Column: Verification registration */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 space-y-0.5">
                  <div>Рег. №: <span className="font-mono text-slate-600 font-extrabold">{certificate.id.substring(0, 12).replace(/_temp/g, '').toUpperCase()}</span></div>
                  <div>Дата: <span className="font-mono text-slate-600">{formatDate(certificate.issue_date)}</span></div>
                </div>
              </div>

              {/* Center Column: Official stamp and ribbon decal */}
              <div className="flex flex-col items-center justify-center relative">
                
                {/* Visual Stamp Ribbon */}
                <div className="w-8 h-12 absolute -top-8 left-1/2 -translate-x-1/2 opacity-70 pointer-events-none flex justify-between z-0">
                  <div className="w-3.5 h-full" style={{ background: theme.ribbonStyle }}></div>
                  <div className="w-3.5 h-full" style={{ background: theme.ribbonStyle }}></div>
                </div>

                {/* SNO Circular Stamp Visual */}
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-green-500/40 p-0.5 relative z-10 bg-transparent flex items-center justify-center -mb-2 rotate-12 select-none opacity-85">
                  <div className="w-full h-full rounded-full border border-green-500/40 flex flex-col items-center justify-center text-center text-[5px] font-bold uppercase text-green-500/70 p-1 relative">
                    <span className="scale-[0.8] leading-none absolute top-1.5 font-black">БГЭУ * БГЭУ</span>
                    <span className="scale-[0.8] font-serif tracking-widest font-black text-[7px] my-auto leading-none text-green-500">СНО ФЭМ</span>
                    <span className="scale-[0.8] leading-none absolute bottom-1.5 font-black">ДЛЯ ДОКУМЕНТОВ</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Signatures */}
              <div className="space-y-3.5 text-right">
                
                {/* Signature 1 */}
                <div className="relative">
                  {/* Handwritten vector signature simulation */}
                  <span className="absolute right-12 -top-2.5 font-serif italic text-emerald-800/60 font-black text-xl select-none -rotate-6 pointer-events-none tracking-widest font-mono">
                    Terro.A.V
                  </span>
                  <div className="flex items-end justify-end text-[10px] font-bold text-slate-500">
                    <span className="border-b border-slate-300 w-24 text-center mr-2"></span>
                    <span className="text-slate-800 font-black">А.В. Терро</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mr-1">Председатель СНО ФЭМ</div>
                </div>

                {/* Signature 2 */}
                <div className="relative">
                  {/* Handwritten vector signature simulation */}
                  <span className="absolute right-12 -top-2.5 font-serif italic text-indigo-800/60 font-black text-xl select-none -rotate-3 pointer-events-none tracking-widest font-mono">
                    Gulina.O
                  </span>
                  <div className="flex items-end justify-end text-[10px] font-bold text-slate-500">
                    <span className="border-b border-slate-300 w-24 text-center mr-2"></span>
                    <span className="text-slate-800 font-black">О.В. Гулина</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mr-1">Зам. декана ФЭМ БГЭУ</div>
                </div>

              </div>

            </div>

          </div>

        </div>
        
        {/* Help tooltip (hidden in print) */}
        <div className="text-xs text-slate-400 text-center flex items-center space-x-1.5 bg-slate-900/40 px-4 py-2 rounded-2xl print:hidden max-w-lg">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Электронный оригинал выдан бессрочно и хранится в вашем цифровом портфолио СНО ФЭМ.</span>
        </div>

      </div>

    </div>,
    document.body
  );
};
