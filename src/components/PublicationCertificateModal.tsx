import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Publication, CustomUser, PublicationCertificate } from '../types';
import { X, Printer, Download, AlertCircle, FileText, Sparkles, GraduationCap } from 'lucide-react';
import QRCode from 'qrcode';

interface PublicationCertificateModalProps {
  certificate: PublicationCertificate | null;
  publication: Publication | null;
  user: CustomUser | null;
  onClose: () => void;
  onGenerate: (pubId: string, gender?: 'male' | 'female') => void;
}

export const PublicationCertificateModal: React.FC<PublicationCertificateModalProps> = ({
  certificate,
  publication,
  user,
  onClose,
  onGenerate
}) => {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | ''>(user?.gender || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (certificate && publication) {
      const url = publication.link || `https://bseu.by/pubs/${publication.id}`;
      QRCode.toDataURL(url, { width: 128, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR error:', err));
    }
  }, [certificate, publication]);

  if (!publication || !user) return null;

  const handleGenerate = () => {
    if (!selectedGender) {
      alert('Пожалуйста, выберите ваш пол для корректного оформления справки');
      return;
    }
    onGenerate(publication.id, selectedGender as 'male' | 'female');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = () => {
    if (confirm('Вы уверены, что хотите перегенерировать справку? Старый номер будет аннулирован.')) {
      onGenerate(publication.id, selectedGender as 'male' | 'female');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fadeIn cursor-zoom-out" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh] my-auto overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-blue-100">Справка о наличии публикации</h2>
          <div className="flex items-center gap-2">
            {certificate && (
              <button 
                onClick={handleRegenerate}
                className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                title="Перегенерировать данные"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Перегенерировать</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center bg-slate-50 dark:bg-slate-950/20 scrollbar-thin">
          {!certificate ? (
            <div className="text-center space-y-6 py-12 max-w-lg mx-auto w-full">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Регистрация справки</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Вы можете сгенерировать официальную справку, подтверждающую наличие данной публикации.
                Справка будет зарегистрирована в реестре деканата ФЭМ БГЭУ.
              </p>

              {!user.gender && !selectedGender && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl space-y-4 text-left">
                  <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold">
                    <AlertCircle className="w-5 h-5" />
                    <span>Требуется уточнение данных</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Для корректного формирования текста справки («выдана студенту» или «выдана студентке»), пожалуйста, укажите ваш пол:
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSelectedGender('male')}
                      className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${selectedGender === 'male' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      Мужской
                    </button>
                    <button 
                      onClick={() => setSelectedGender('female')}
                      className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${selectedGender === 'female' ? 'bg-pink-600 border-pink-600 text-white shadow-lg shadow-pink-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      Женский
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50"
                disabled={!selectedGender && !user.gender}
              >
                Сгенерировать и зарегистрировать
              </button>
            </div>
          ) : (
            <div className="w-full space-y-6 flex flex-col items-center pb-12">
              <div className="flex space-x-4 print:hidden shrink-0">
                <button 
                  onClick={handlePrint}
                  className="px-6 py-3 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl flex items-center space-x-2 font-bold hover:brightness-110 transition-all shadow-lg shadow-slate-900/10"
                >
                  <Printer className="w-4 h-4" />
                  <span>Распечатать</span>
                </button>
                <button 
                  onClick={() => alert('PDF версия доступна через кнопку печати (Сохранить как PDF)')}
                  className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center space-x-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать</span>
                </button>
              </div>

              {/* Certificate A4 Paper representation */}
              <div className="bg-white w-full max-w-[794px] min-h-[1123px] shadow-2xl p-12 sm:p-20 relative text-black print:shadow-none print:p-0 print:m-0 print:w-full print:h-auto printable-certificate shrink-0 overflow-hidden" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                <div className="text-center space-y-1 mb-14">
                  <p className="text-sm font-bold uppercase">Министерство образования Республики Беларусь</p>
                  <p className="text-sm font-bold uppercase leading-tight">Учреждение образования<br/>«Белорусский государственный экономический университет»</p>
                  <p className="text-sm font-bold uppercase mt-4">Факультет экономики и менеджмента</p>
                  <div className="w-full h-px bg-black mt-4"></div>
                </div>

                <div className="flex justify-between items-end mb-16 text-sm">
                  <div className="border-b border-black pb-1 px-4 min-w-[150px] text-center italic">
                    {new Date(certificate.issue_date).toLocaleDateString('ru-RU')}
                  </div>
                  <div className="text-2xl font-bold uppercase tracking-tight">
                    СПРАВКА № {certificate.number}
                  </div>
                  <div className="border-b border-black pb-1 px-4 min-w-[150px] text-center">
                    г. Минск
                  </div>
                </div>

                <div className="text-justify text-[1.1rem] leading-[1.8] mb-20 indent-12 space-y-8">
                  <p>
                    Выдана настоящая {user.gender === 'female' ? 'студентке' : 'студенту'} факультета экономики и менеджмента БГЭУ 
                    <span className="font-bold border-b border-black px-2 mx-1 whitespace-nowrap">{certificate.user_name}</span> 
                    (группа {user.group}), в том, что {user.gender === 'female' ? 'она' : 'он'} действительно имеет научно-исследовательскую публикацию:
                  </p>
                  
                  <div className="py-6 border-y border-slate-100 italic font-bold text-center leading-relaxed">
                    «{certificate.publication_title}»
                  </div>

                  <p>
                    Данная научная работа ({publication.type}) опубликована в издании: 
                    <span className="font-bold border-b border-black px-2 mx-1">{certificate.publication_journal}</span> 
                    в {certificate.publication_year} году.
                  </p>

                  <div className="flex items-start space-x-6 mt-12 bg-slate-50/50 p-6 rounded-2xl print:bg-transparent print:p-0">
                    {qrDataUrl && (
                      <div className="flex-shrink-0 bg-white p-2 border border-slate-200 print:border-slate-300">
                        <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                      </div>
                    )}
                    <div className="text-sm text-slate-600 leading-relaxed print:text-black">
                      <p className="font-bold mb-1">Верификация публикации:</p>
                      <p>Работа размещена в электронном репозитории / открытом доступе по адресу:</p>
                      <p className="font-mono text-[10px] mt-1 break-all text-blue-700 underline print:text-black">{publication.link || `https://edoc.bseu.by/pubs/${publication.id}`}</p>
                      <p className="mt-2 text-[10px] italic">Используйте QR-код для быстрого перехода к тексту работы.</p>
                    </div>
                  </div>

                  <p className="pt-8">
                    Справка выдана по месту требования для подтверждения научной активности {user.gender === 'female' ? 'студентки' : 'студента'}.
                  </p>
                </div>

                <div className="mt-32 flex justify-between items-end">
                  <div className="text-lg font-bold w-1/3">
                    Декан ФЭМ
                  </div>
                  
                  <div className="w-1/3 flex flex-col items-center relative">
                    {/* Mock Stamp */}
                    <div className="absolute -top-16 -left-12 w-40 h-40 border-8 border-blue-900/10 rounded-full flex items-center justify-center opacity-40 transform -rotate-12 pointer-events-none">
                      <div className="border-4 border-blue-900/10 rounded-full w-[90%] h-[90%] flex items-center justify-center">
                        <div className="text-center text-blue-900/60 text-[9px] font-bold uppercase leading-[1.1]">
                          МИНИСТЕРСТВО<br/>ОБРАЗОВАНИЯ<br/>ФЭМ БГЭУ<br/>ДЛЯ СПРАВОК
                        </div>
                      </div>
                    </div>
                    <div className="w-full border-b border-black"></div>
                    <span className="text-[10px] mt-1 uppercase italic tracking-widest text-slate-400">подпись, печать</span>
                  </div>

                  <div className="text-lg font-bold w-1/3 text-right">
                    О.В. Гулин
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-certificate, .printable-certificate * {
            visibility: visible !important;
          }
          .printable-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 20mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            transform: none !important;
            background: white !important;
            z-index: 9999 !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
};
