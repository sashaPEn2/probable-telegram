import React, { useState, useRef } from 'react';
import { PortalDatabase, createSnilApplication, savePortalDB, addNotificationAndNotifyTelegram } from '../services/storage';
import { CustomUser, SNIL, ResearchTask } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { withSafeColorsForHtml2Canvas } from '../lib/pdfUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FlaskConical, 
  Award, 
  Users, 
  CheckCircle2, 
  Plus, 
  Clock, 
  FileCheck, 
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Briefcase,
  Download,
  Loader2,
  Trophy,
  Microscope,
  User,
  CheckCircle,
  FileText,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

interface SnilViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  selectedSnilId: string | null;
  onClearSelectedSnil: () => void;
  onRefresh: () => void;
}

export const SnilView: React.FC<SnilViewProps> = ({
  db,
  user,
  selectedSnilId,
  onClearSelectedSnil,
  onRefresh
}) => {
  const [activeSnil, setActiveSnil] = useState<SNIL | null>(null);
  const [isGeneratingApplication, setIsGeneratingApplication] = useState(false);
  const snilApplicationRef = useRef<HTMLDivElement>(null);
  const [isJoinSectionOpen, setIsJoinSectionOpen] = useState(false);
  
  const allSnils = db.snils || [];
  
  const snils = React.useMemo(() => {
    if (!selectedSnilId) return allSnils;
    const targetId = selectedSnilId === 'snil_1' ? 'snil_innovatika' : selectedSnilId;
    const filtered = allSnils.filter(s => s.id === targetId);
    return filtered.length > 0 ? filtered : allSnils;
  }, [allSnils, selectedSnilId]);

  const userSnil = allSnils.find(s => user && s.member_record_books.includes(user.record_book_id));
  const userApplications = db.snil_applications || [];
  const myPendingApp = user ? userApplications.find(a => a.student_record_book === user.record_book_id && a.status !== 'отклонена') : null;

  const handleJoinRequest = (snil: SNIL) => {
    if (!user) return;
    if (userSnil || myPendingApp) return;

    createSnilApplication(snil.id, snil.name, user.record_book_id);

    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: snil.head_record_book,
      title: 'Новая заявка в СНИЛ!',
      message: `Студент ${user.last_name} ${user.first_name} подал заявку на вступление в «${snil.name}»`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });
    onRefresh();
  };

  const generateSnilApplication = async (snil: SNIL) => {
    if (!snilApplicationRef.current || !user) return;
    setActiveSnil(snil);
    setIsGeneratingApplication(true);
    
    // We need to wait for the state update and ref rendering if we were using it for live capture, 
    // but here we can just use a timeout or better yet, a dedicated generation function.
    setTimeout(async () => {
      try {
        let canvas: HTMLCanvasElement | null = null;
        await withSafeColorsForHtml2Canvas(snilApplicationRef.current!, async () => {
          canvas = await html2canvas(snilApplicationRef.current!, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
        });
        if (!canvas) throw new Error("Canvas render failed");
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Заявление_СНИЛ_${snil.name.replace(/\s+/g, '_')}_${user.last_name}.pdf`);
        
        // Record the application in the system
        createSnilApplication(snil.id, snil.name, user.record_book_id);

        addNotificationAndNotifyTelegram({
          id: 'notif_' + Date.now(),
          user_record_book: snil.head_record_book,
          title: 'Сформировано заявление на вступление',
          message: `Студент ${user.last_name} подготовил заявление на вступление в вашу СНИЛ «${snil.name}»`,
          type: 'info',
          is_read: false,
          created_at: new Date().toISOString()
        });
        onRefresh();

      } catch (error) {
        console.error('SNIL Application PDF Error:', error);
      } finally {
        setIsGeneratingApplication(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-12 pb-24">
      
      {/* Header Section */}
      <div className="relative bg-[#0a2a5e] rounded-[2.5rem] p-8 sm:p-14 overflow-hidden shadow-2xl border border-[#d4af37]/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4af37]/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-3xl"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-3 text-[#d4af37] text-xs font-black uppercase tracking-[0.3em] font-mono">
            <FlaskConical className="w-6 h-6" />
            <span>Научный потенциал ФЭМа</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">СНИЛ ФЭМа БГЭУ</h2>
          <p className="text-blue-100/70 text-sm sm:text-lg max-w-3xl leading-relaxed font-medium">
            Студенческие научно-исследовательские лаборатории — это интеллектуальные центры ФЭМа, где студенты и преподаватели создают будущее экономики Беларуси через инновации, аналитику и прикладные разработки.
          </p>
        </div>
      </div>

      {/* Instructions Section (Collapsible) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
      >
        <button
          onClick={() => setIsJoinSectionOpen(!isJoinSectionOpen)}
          className="w-full p-6 sm:p-8 flex items-center justify-between text-left focus:outline-none hover:bg-blue-100/20 dark:hover:bg-blue-900/20 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm flex-shrink-0 border border-blue-200 dark:border-blue-700">
              <FileText className="w-6 h-6 text-[#0a2a5e] dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0a2a5e] dark:text-white uppercase tracking-tight">Как вступить в СНИЛ ФЭМ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Пошаговая инструкция и регламент вступления в научный состав</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isJoinSectionOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400 dark:text-slate-500 hover:text-[#0a2a5e] dark:hover:text-white p-1 rounded-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isJoinSectionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-blue-100 dark:border-blue-800/80"
            >
              <div className="p-6 sm:p-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
                    <div className="flex items-center space-x-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-mono">1</span>
                      <span>Подача заявки</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Выберите интересующую вас лабораторию ниже и нажмите кнопку <b>«Вступить в СНИЛ»</b>. Ваша заявка мгновенно поступит на рассмотрение руководителю.
                    </p>
                  </div>
                  <div className="space-y-2 p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
                    <div className="flex items-center space-x-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-mono">2</span>
                      <span>Рассмотрение</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Руководитель СНИЛ изучит ваш профиль исследователя и примет решение о включении вас в научный состав.
                    </p>
                  </div>
                  <div className="space-y-2 p-5 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
                    <div className="flex items-center space-x-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-mono">3</span>
                      <span>Научная работа</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      После одобрения заявки вы станете полноправным участником СНИЛ, сможете выполнять задачи и получать рейтинговые баллы.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Announcements Section */}
      {db.announcements && db.announcements.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <Sparkles className="w-5 h-5" />
            <span>Важные объявления СНИЛ</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.announcements.map((ann) => {
              const snil = snils.find(s => s.id === ann.snil_id);
              return (
                <motion.div 
                  key={ann.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-6 rounded-3xl border ${ann.is_urgent ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      СНИЛ {snil?.name || 'Лаборатория'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(ann.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <h4 className="text-lg font-black text-[#0a2a5e] dark:text-white mb-2 leading-tight">{ann.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{ann.content}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of SNILs */}
      {selectedSnilId && snils.length < allSnils.length && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-blue-50/50 dark:bg-blue-950/20 px-6 py-4 rounded-3xl border border-blue-100 dark:border-blue-900/60"
        >
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Показана выбранная лаборатория: <span className="text-[#0a2a5e] dark:text-blue-400 font-extrabold">СНИЛ {snils[0]?.name}</span>
          </p>
          <button 
            onClick={onClearSelectedSnil}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl font-bold text-xs shadow-xs transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Показать все лаборатории</span>
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {snils.map((snil) => {
          const isMember = user && snil.member_record_books.includes(user.record_book_id);
          return (
            <motion.div 
              key={snil.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col group relative"
            >
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

              <div className="p-8 sm:p-10 pb-4 relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#0a2a5e] dark:text-blue-300 border border-blue-100 dark:border-blue-800 group-hover:rotate-6 transition-transform">
                    <Microscope className="w-7 h-7" />
                  </div>
                  {snil.is_best_snil_nominee && (
                    <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/30 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
                      <Trophy className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#d4af37]">Лучшая СНИЛ 2026</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.25em]">
                    {snil.department}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#0a2a5e] dark:text-white leading-tight">
                    СНИЛ {snil.name}
                  </h3>
                </div>
              </div>

              <div className="p-8 sm:p-10 pt-0 space-y-8 flex-1 relative z-10">
                <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-medium line-clamp-4">
                  {snil.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Руководитель:</p>
                      <p className="text-[11px] font-bold leading-tight">{snil.head_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Участников:</p>
                      <p className="text-[11px] font-bold">{snil.member_record_books.length} исследователей</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Направления:</p>
                  <div className="flex flex-wrap gap-2">
                    {snil.research_directions.map((dir, i) => (
                      <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100/50 dark:border-blue-900/50">
                        {dir}
                      </span>
                    ))}
                  </div>
                </div>

                {snil.achievements && snil.achievements.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>Научные результаты и достижения:</span>
                    </p>
                    <div className="space-y-2">
                      {snil.achievements.map((ach, i) => (
                        <div key={i} className="flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-400 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-500/10 dark:border-amber-500/20 shadow-xs">
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="font-semibold leading-relaxed">{ach}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 mt-auto flex flex-col sm:flex-row gap-3">
                {isMember ? (
                  <div className="w-full py-4 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-2 border border-green-200 dark:border-green-900">
                    <CheckCircle className="w-5 h-5" />
                    <span>Вы в составе «{snil.name}»</span>
                  </div>
                ) : myPendingApp && myPendingApp.snil_id === snil.id ? (
                  <div className="w-full py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-2 border border-amber-200 dark:border-amber-900">
                    <Clock className="w-5 h-5" />
                    <span>Заявка на рассмотрении</span>
                  </div>
                ) : (userSnil || myPendingApp) ? null : (
                  <button
                    onClick={() => handleJoinRequest(snil)}
                    disabled={!user}
                    className="w-full py-4 rounded-2xl bg-[#0a2a5e] dark:bg-blue-600 text-[#d4af37] dark:text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:brightness-110 transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Вступить в СНИЛ</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Hidden PDF Template */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-10000px', 
          top: 0, 
          pointerEvents: 'none',
          zIndex: -300
        }}
      >
        <div 
          ref={snilApplicationRef} 
          className="w-[800px] p-[100px] bg-white text-black font-serif"
          style={{ fontFamily: 'Times New Roman, serif', backgroundColor: '#ffffff', minHeight: '1100px', color: '#000000' }}
        >
          {activeSnil && (
            <>
              <div className="ml-auto w-1/2 text-sm space-y-1 mb-20" style={{ marginLeft: 'auto', width: '50%', marginBottom: '5rem' }}>
                <p>Руководителю СНИЛ</p>
                <p>{activeSnil.name}</p>
                <p>{activeSnil.head_name}</p>
                <p className="pt-2" style={{ paddingTop: '0.5rem' }}>студента(ки) {user?.course} курса, группы {user?.group}</p>
                <p className="font-bold" style={{ fontWeight: 'bold' }}>{user?.last_name} {user?.first_name} {user?.middle_name || ''}</p>
              </div>

              <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.5rem' }}>ЗАЯВЛЕНИЕ</h2>
              </div>

              <div className="text-lg leading-relaxed text-justify mb-20 px-4" style={{ fontSize: '1.125rem', lineHeight: '1.625', textAlign: 'justify', marginBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                <p>
                  Прошу включить меня в состав участников Студенческой научно-исследовательской лаборатории (СНИЛ) {activeSnil.name} ФЭМ БГЭУ.
                </p>
                <p className="mt-6" style={{ marginTop: '1.5rem' }}>
                  Намерен(а) принимать активное участие в научно-исследовательской работе лаборатории по направлениям: 
                  <span className="italic" style={{ fontStyle: 'italic' }}> {activeSnil.research_directions.join(', ')}</span>.
                </p>
                <p className="mt-6" style={{ marginTop: '1.5rem' }}>
                  Обязуюсь соблюдать внутренний регламент работы СНИЛ и своевременно выполнять порученные научно-исследовательские задания.
                </p>
              </div>

              <div className="flex justify-between items-end mt-40 px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                <div className="text-lg pb-1 w-40 text-center" style={{ fontSize: '1.125rem', borderBottom: '1px solid #000000', width: '10rem', textAlign: 'center' }}>
                  {new Date().toLocaleDateString('ru-RU')}
                </div>
                <div className="text-lg pb-1 w-48 text-center relative" style={{ fontSize: '1.125rem', borderBottom: '1px solid #000000', width: '12rem', textAlign: 'center', position: 'relative' }}>
                  <span className="text-[10px] absolute -bottom-5 left-0 right-0 text-center uppercase font-sans" style={{ fontSize: '10px', position: 'absolute', bottom: '-1.25rem', left: 0, right: 0, textAlign: 'center', textTransform: 'uppercase', color: '#9ca3af' }}>Подпись</span>
                </div>
              </div>

              <div className="mt-32 pt-10 border-t text-[10px] font-sans italic text-center" style={{ marginTop: '8rem', paddingTop: '2.5rem', borderTop: '1px solid #f3f4f6', fontSize: '10px', fontStyle: 'italic', textAlign: 'center', color: '#d1d5db' }}>
                Сформировано в SNO.PORTAL • Кафедра {activeSnil.department} • {new Date().toLocaleString('ru-RU')}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

