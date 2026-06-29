import React, { useState, useMemo, useRef } from 'react';
import { PortalDatabase, calculateResearcherStats, DEPARTMENTS } from '../services/storage';
import { CustomUser, Publication, Certificate, ResearchProject } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  User, 
  Award, 
  BookOpen, 
  FileText, 
  Download, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Sparkles, 
  Trash2, 
  ExternalLink,
  ShieldAlert,
  GraduationCap,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ProfileViewProps {
  db: PortalDatabase;
  user: CustomUser;
  onUpdateUser: (updated: CustomUser) => void;
  onRefresh: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  db,
  user,
  onUpdateUser,
  onRefresh
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pubs' | 'apps' | 'tasks' | 'interests' | 'certs'>('overview');
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingApplication, setIsGeneratingApplication] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const snoApplicationRef = useRef<HTMLDivElement>(null);
  
  const myPubs = useMemo(() => db.publications.filter(p => p.user_record_book === user.record_book_id), [db.publications, user.record_book_id]);
  const myApps = useMemo(() => db.applications.filter(a => a.student_record_book === user.record_book_id), [db.applications, user.record_book_id]);
  const myCerts = useMemo(() => db.certificates.filter(c => c.user_record_book === user.record_book_id), [db.certificates, user.record_book_id]);
  
  const activityData = useMemo(() => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      
      const pubCount = myPubs.filter(p => {
        const pd = new Date(p.created_at);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;

      const appCount = myApps.filter(a => {
        const ad = new Date(a.created_at);
        return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
      }).length;

      data.push({
        name: monthLabel,
        'Публикации': pubCount,
        'Заявки': appCount,
        'Всего': pubCount + appCount
      });
    }
    return data;
  }, [myPubs, myApps]);
  
  // Форма добавления публикации
  const [showAddPub, setShowAddPub] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubType, setPubType] = useState<'статья' | 'тезисы' | 'монография' | 'учебное_пособие'>('статья');
  const [pubJournal, setPubJournal] = useState('');
  const [pubYear, setPubYear] = useState(new Date().getFullYear());
  const [pubLink, setPubLink] = useState('');

  // Форма добавления интереса
  const [newInterest, setNewInterest] = useState('');

  const myTasks = db.tasks.filter(t => t.assigned_to_record_book === user.record_book_id);
  const stats = calculateResearcherStats(user.record_book_id);

  const generateAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: 'Professional 3D student avatar, scholarly, elegant, research-focused',
          userInterests: `${user.last_name} ${user.first_name}, ${user.department}`
        }),
      });
      
      const data = await response.json();
      if (data.imageUrl) {
        const updated = { ...user, avatar_url: data.imageUrl };
        const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
        if (dbUser) dbUser.avatar_url = data.imageUrl;
        localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
        onUpdateUser(updated);
        onRefresh();
      }
    } catch (err) {
      console.error('Avatar generation error:', err);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleAddPublication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim() || !pubJournal.trim()) return;

    const newP: Publication = {
      id: 'pub_' + Date.now(),
      user_record_book: user.record_book_id,
      author_names: [`${user.last_name} ${user.first_name[0]}.`],
      title: pubTitle,
      type: pubType,
      journal: pubJournal,
      year: Number(pubYear),
      link: pubLink || undefined,
      file_name: 'Статья_БГЭУ_ФЭМ.pdf',
      is_confirmed: false, // Требует подтверждения координатора науки
      created_at: new Date().toISOString()
    };

    db.publications.unshift(newP);
    
    // Оповещение координатора
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_record_book: 'coordinator',
      title: 'Новая публикация на модерацию',
      message: `Студент ${user.last_name} ${user.first_name} добавил работу «${pubTitle}» в портфолио`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    setPubTitle('');
    setPubJournal('');
    setPubLink('');
    setShowAddPub(false);
    onRefresh();
  };

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterest.trim()) return;
    if (user.scientific_interests.includes(newInterest.trim())) return;

    const updated = {
      ...user,
      scientific_interests: [...user.scientific_interests, newInterest.trim()]
    };
    
    const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
    if (dbUser) dbUser.scientific_interests = updated.scientific_interests;
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onUpdateUser(updated);
    setNewInterest('');
  };

  const handleRemoveInterest = (item: string) => {
    const updated = {
      ...user,
      scientific_interests: user.scientific_interests.filter(i => i !== item)
    };
    const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
    if (dbUser) dbUser.scientific_interests = updated.scientific_interests;
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onUpdateUser(updated);
  };

  const exportPortfolioToPdf = async () => {
    if (!pdfTemplateRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Портфолио_${user.last_name}_${user.record_book_id}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateSnoApplication = async () => {
    if (!snoApplicationRef.current) return;
    setIsGeneratingApplication(true);
    
    try {
      const canvas = await html2canvas(snoApplicationRef.current, {
        scale: 3, // Higher quality for text
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Заявление_СНО_${user.last_name}.pdf`);
      
      // Можно также отправить уведомление координатору
      db.notifications.push({
        id: 'notif_' + Date.now(),
        user_record_book: 'coordinator',
        title: 'Новое заявление в СНО',
        message: `Студент ${user.last_name} ${user.first_name} сгенерировал заявление на вступление в СНО`,
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
      onRefresh();

    } catch (error) {
      console.error('Application PDF Error:', error);
    } finally {
      setIsGeneratingApplication(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Профиль карточка исследователя */}
      <div className="bg-gradient-to-r from-brand-blue via-blue-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-brand-gold/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-6 relative z-10">
          <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-3xl bg-gradient-to-tr from-brand-gold to-cyan-500 p-1 flex-shrink-0 shadow-xl relative group">
            <div className="w-full h-full bg-brand-blue rounded-[22px] flex items-center justify-center text-3xl font-extrabold text-brand-gold overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <>{user.first_name[0]}{user.last_name[0]}</>
              )}
            </div>
            <button 
              onClick={generateAvatar}
              disabled={isGeneratingAvatar}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-brand-gold text-brand-blue shadow-lg hover:scale-110 transition-all border border-brand-blue/20"
              title="Сгенерировать AI-аватар"
            >
              {isGeneratingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-brand-gold text-brand-blue font-bold text-xs uppercase tracking-wider">
                Зачётка № {user.record_book_id}
              </span>
              <span className="text-xs font-mono bg-blue-950 px-2 py-0.5 rounded text-blue-300">
                Группа {user.group} (Курс {user.course})
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{user.last_name} {user.first_name}</h1>
            <p className="text-blue-200 text-xs sm:text-sm opacity-90 truncate max-w-xl">{user.department}</p>
          </div>
        </div>

        {/* Кнопка экспорта в PDF */}
        <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
          {user.role === 'student' && (
            <button
              onClick={generateSnoApplication}
              disabled={isGeneratingApplication}
              className="px-6 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl hover:bg-blue-700 flex items-center justify-center space-x-2 transition-all disabled:opacity-70"
            >
              {isGeneratingApplication ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>{isGeneratingApplication ? 'Генерация...' : 'Вступить в СНО'}</span>
            </button>
          )}

          <button
            onClick={exportPortfolioToPdf}
            disabled={isExporting}
            className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-gold to-cyan-500 text-brand-blue font-extrabold text-sm shadow-xl hover:brightness-110 flex items-center justify-center space-x-2 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            <span>{isExporting ? 'Генерация PDF...' : 'Экспорт портфолио в PDF'}</span>
          </button>
        </div>
      </div>

      {/* Скрытый шаблон для заявления СНО */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-10000px', 
          top: 0, 
          pointerEvents: 'none',
          zIndex: -200
        }}
      >
        <div 
          ref={snoApplicationRef} 
          className="w-[800px] p-[100px] bg-white text-black font-serif"
          style={{ fontFamily: 'Times New Roman, serif', backgroundColor: '#ffffff', minHeight: '1100px', color: '#000000' }}
        >
          <div className="ml-auto w-1/2 text-sm space-y-1 mb-20" style={{ marginLeft: 'auto', width: '50%', marginBottom: '5rem' }}>
            <p>Декану факультета экономики</p>
            <p>и менеджмента БГЭУ</p>
            <p>Васильевой И.В.</p>
            <p className="pt-2" style={{ paddingTop: '0.5rem' }}>студента(ки) {user.course} курса, группы {user.group}</p>
            <p className="font-bold" style={{ fontWeight: 'bold' }}>{user.last_name} {user.first_name} {user.middle_name || ''}</p>
          </div>

          <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.5rem' }}>ЗАЯВЛЕНИЕ</h2>
          </div>

          <div className="text-lg leading-relaxed text-justify mb-20 px-4" style={{ fontSize: '1.125rem', lineHeight: '1.625', textAlign: 'justify', marginBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
            <p>
              Прошу принять меня в члены Студенческого научного общества (СНО) факультета экономики и менеджмента Белорусского государственного экономического университета.
            </p>
            <p className="mt-6" style={{ marginTop: '1.5rem' }}>
              Обязуюсь активно участвовать в научно-исследовательской деятельности факультета, соблюдать Устав СНО БГЭУ и содействовать развитию молодежной науки.
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
            Сгенерировано в SNO.PORTAL ФЭМ БГЭУ • {new Date().toLocaleString('ru-RU')}
          </div>
        </div>
      </div>

      {/* Скрытый шаблон для PDF (используем position: fixed вместо hidden для html2canvas) */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-10000px', 
          top: 0, 
          pointerEvents: 'none',
          zIndex: -100
        }}
      >
        <div 
          ref={pdfTemplateRef} 
          className="w-[800px] p-12 bg-white text-[#0f172a] font-sans"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#ffffff' }}
        >
          <div className="flex items-center justify-between pb-6 mb-8" style={{ borderBottom: '2px solid var(--color-brand-blue)' }}>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--color-brand-blue)' }}>SNO.PORTAL</h1>
              <p className="text-xs font-bold text-[#64748b]">БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Электронный документ</p>
              <p className="text-xs font-black text-brand-gold">ФАКУЛЬТЕТ ЭКОНОМИКИ И МЕНЕДЖМЕНТА</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-2 uppercase tracking-tight">ЭЛЕКТРОННОЕ ПОРТФОЛИО ИССЛЕДОВАТЕЛЯ</h2>
            <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: 'var(--color-brand-gold)' }}></div>
          </div>

          <div className="grid grid-cols-3 gap-8 mb-10">
            <div className="col-span-2 space-y-4">
              <div>
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">ФИО Исследователя</p>
                <p className="text-xl font-bold text-[#1e293b]">{user.last_name} {user.first_name} {user.middle_name || ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Номер зачетной книжки</p>
                  <p className="text-sm font-bold text-[#334155]">{user.record_book_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Группа / Курс</p>
                  <p className="text-sm font-bold text-[#334155]">{user.group} / {user.course} курс</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Кафедра / Подразделение</p>
                <p className="text-sm font-bold text-[#334155]">{user.department}</p>
              </div>
            </div>
            <div className="rounded-2xl p-6 border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-center" style={{ color: 'var(--color-brand-blue)' }}>Научный статус</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Индекс Хирша</span>
                  <span className="text-sm font-black text-brand-blue">{stats.hIndex}</span>
                </div>
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Публикации</span>
                  <span className="text-sm font-black text-brand-blue">{myPubs.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Рейтинг ФЭМ</span>
                  <span className="text-sm font-black text-brand-gold">{stats.ratingPoints}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid var(--color-brand-blue)' }}>Список опубликованных научных работ</h3>
            <div className="space-y-4">
              {myPubs.length > 0 ? myPubs.map((p, idx) => (
                <div key={p.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: 'var(--color-brand-blue)' }}>{idx + 1}.</span> {p.title}
                    </p>
                    <span className="text-[9px] font-black text-[#94a3b8] uppercase ml-4 flex-shrink-0">{p.year} г.</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-medium mb-1">
                    <span className="font-bold uppercase mr-1" style={{ color: '#475569' }}>Издание:</span> {p.journal}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{p.type}</span>
                    {p.is_confirmed && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>Верифицировано НИРС</span>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#94a3b8] italic">Научные публикации отсутствуют</p>
              )}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #0a2a5e' }}>Участие в научных мероприятиях</h3>
            <div className="space-y-4">
              {myApps.length > 0 ? myApps.map((a, idx) => (
                <div key={a.id} className="p-4 rounded-xl border border-[#f1f5f9]">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-[#1e293b] mb-1">{a.event_title}</p>
                      <p className="text-[10px] text-[#64748b]">
                        <span className="font-bold uppercase mr-1" style={{ color: '#475569' }}>Доклад:</span> {a.report_title}
                      </p>
                    </div>
                    <span className="text-[9px] font-black uppercase" style={{ color: '#d4af37' }}>{a.status}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#94a3b8] italic">Заявки на конференции отсутствуют</p>
              )}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid var(--color-brand-blue)' }}>Достижения и сертификаты</h3>
            <div className="space-y-4">
              {myCerts.length > 0 ? myCerts.map((c, idx) => (
                <div key={c.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: 'var(--color-brand-blue)' }}>{idx + 1}.</span> {c.title}
                    </p>
                    <span className="text-[9px] font-black text-[#94a3b8] uppercase ml-4 flex-shrink-0">{new Date(c.issue_date).getFullYear()} г.</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-medium mb-1">
                    <span className="font-bold uppercase mr-1" style={{ color: '#475569' }}>Мероприятие:</span> {c.event_name}
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    {c.type.replace(/_/g, ' ')}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-[#94a3b8] italic">Награды и сертификаты отсутствуют</p>
              )}
            </div>
          </div>

          <div className="mt-20 pt-8 border-t flex justify-between items-end" style={{ borderTop: '1px solid #f1f5f9' }}>
            <div className="text-[10px] font-bold text-[#94a3b8]">
              <p>Сформировано автоматически: {new Date().toLocaleDateString('ru-RU')}</p>
              <p>ID Документа: {user.record_book_id}-{Date.now()}</p>
            </div>
            <div className="text-right">
              <div className="w-32 h-16 border-2 border-[#e2e8f0] rounded flex items-center justify-center mb-1 italic text-[10px] text-[#cbd5e1]" style={{ backgroundColor: '#f8fafc' }}>
                Место для печати
              </div>
              <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Деканат ФЭМ БГЭУ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Дашборд показателей (5 карточек) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <DashStat title="Индекс Хирша" value={stats.hIndex} desc="h-index в базе" highlight />
        <DashStat title="Публикации" value={myPubs.length} desc={`${stats.totalPubs} верифицировано`} />
        <DashStat title="Доклады" value={myApps.length} desc="конференции БГЭУ" />
        <DashStat title="Баллы рейтинга" value={stats.ratingPoints} desc="рейтинг ФЭМ" highlight />
        <DashStat title="Задачи СНИЛ" value={myTasks.length} desc="поручения" />
      </div>

      {/* График научной активности */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-blue-100 tracking-tight">Научная активность</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Динамика публикаций и заявок за последние 12 месяцев</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider">
             <div className="flex items-center space-x-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></div>
               <span className="text-slate-500 dark:text-slate-400">Публикации</span>
             </div>
             <div className="flex items-center space-x-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
               <span className="text-slate-500 dark:text-slate-400">Заявки</span>
             </div>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: '800', textTransform: 'uppercase' }}
              />
              <Area 
                type="monotone" 
                dataKey="Публикации" 
                stroke="#d4af37" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorPubs)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="Заявки" 
                stroke="#2563eb" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorApps)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Переключатель вкладок портфолио */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-sm flex overflow-x-auto space-x-3 no-scrollbar text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
        <SubTabBtn active={activeSubTab === 'overview'} onClick={() => setActiveSubTab('overview')} icon={<BookOpen className="w-5 h-5" />} label="Труды" count={myPubs.length} />
        <SubTabBtn active={activeSubTab === 'certs'} onClick={() => setActiveSubTab('certs')} icon={<Award className="w-5 h-5" />} label="Дипломы" count={myCerts.length} />
        <SubTabBtn active={activeSubTab === 'apps'} onClick={() => setActiveSubTab('apps')} icon={<FileText className="w-5 h-5" />} label="Заявки" count={myApps.length} />
        <SubTabBtn active={activeSubTab === 'tasks'} onClick={() => setActiveSubTab('tasks')} icon={<Briefcase className="w-5 h-5" />} label="Задачи" count={myTasks.length} />
        <SubTabBtn active={activeSubTab === 'interests'} onClick={() => setActiveSubTab('interests')} icon={<Sparkles className="w-5 h-5" />} label="Интересы" count={user.scientific_interests.length} />
      </div>

      {/* Вкладка 1: Публикации портфолио */}
      {activeSubTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-brand-blue dark:text-blue-300 flex items-center space-x-2">
                <GraduationCap className="w-6 h-6 text-brand-gold" />
                <span>Электронный реестр публикаций исследователя</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Все труды автоматически отправляются координатору науки ФЭМ для верификации</p>
            </div>
            <button
              onClick={() => setShowAddPub(!showAddPub)}
              className="px-4 py-2 rounded-xl bg-brand-blue text-brand-gold font-bold text-xs shadow hover:bg-blue-900 transition-colors flex items-center space-x-1 self-start"
            >
              <Plus className="w-4 h-4" /> <span>Добавить труд</span>
            </button>
          </div>

          {/* Форма добавления работы */}
          {showAddPub && (
            <form onSubmit={handleAddPublication} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-inner space-y-4 animate-fadeIn transition-colors">
              <h4 className="font-bold text-sm text-[#0a2a5e] dark:text-blue-300">Регистрация нового научного труда</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Название работы / статьи *</label>
                  <input type="text" required placeholder="Например: Оценка рисков цифровизации банковского сектора РБ" value={pubTitle} onChange={e => setPubTitle(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border dark:border-slate-700 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Вид издания</label>
                  <select value={pubType} onChange={e => setPubType(e.target.value as any)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border dark:border-slate-700 text-xs cursor-pointer">
                    <option value="статья">Статья в журнале (15 баллов)</option>
                    <option value="тезисы">Тезисы доклада (8 баллов)</option>
                    <option value="монография">Монография (40 баллов)</option>
                    <option value="учебное_пособие">Учебное пособие (25 баллов)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Сборник / Журнал ВАК *</label>
                  <input type="text" required placeholder="Вестник БГЭУ №2 / Сборник Декады науки" value={pubJournal} onChange={e => setPubJournal(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border dark:border-slate-700 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Год выпуска</label>
                  <input type="number" value={pubYear} onChange={e => setPubYear(Number(e.target.value))} className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border dark:border-slate-700 text-xs font-mono focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Ссылка URL (elibrary / РИНЦ / Репозиторий БГЭУ)</label>
                <input type="url" placeholder="https://edoc.bseu.by/..." value={pubLink} onChange={e => setPubLink(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-xl border dark:border-slate-700 text-xs font-mono focus:outline-none" />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddPub(false)} className="px-5 py-2.5 text-sm text-slate-600 dark:text-slate-400 font-semibold order-2 sm:order-1">Отмена</button>
                <button type="submit" className="px-6 py-3 bg-[#d4af37] text-[#0a2a5e] font-bold text-sm rounded-xl shadow hover:brightness-105 transition-all order-1 sm:order-2">Сохранить в портфолио</button>
              </div>
            </form>
          )}

          {myPubs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">В портфолио пока нет зарегистрированных трудов.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Добавьте свои статьи и тезисы для повышения рейтинга научной активности на факультете.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myPubs.map(pb => (
                <div key={pb.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0a2a5e] dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 font-bold uppercase">{pb.type}</span>
                      <span className="text-slate-500 dark:text-slate-400">{pb.year} г.</span>
                      {pb.is_confirmed ? (
                        <span className="text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" /> <span>Верифицировано ВАК</span>
                        </span>
                      ) : (
                        <span className="text-amber-800 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3" /> <span>На рассмотрении координатора</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-[#0a2a5e] dark:text-blue-200 leading-snug">{pb.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">📖 Издание: <strong>{pb.journal}</strong></p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {pb.link && (
                      <a href={pb.link} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all" title="Открыть ссылку">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        db.publications = db.publications.filter(p => p.id !== pb.id);
                        localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
                        onRefresh();
                      }}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Удалить из портфолио"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вкладка 2: Сертификаты и дипломы */}
      {activeSubTab === 'certs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-[#0a2a5e] flex items-center space-x-2">
                <Award className="w-6 h-6 text-[#d4af37]" />
                <span>Награды, дипломы и сертификаты</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Подтверждение участия в конкурсах, олимпиадах и научных проектах</p>
            </div>
          </div>

          {myCerts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">В портфолио пока нет наград.</p>
              <p className="text-xs text-slate-400 mt-1">Загрузите подтверждения ваших достижений через личный кабинет.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCerts.map(c => (
                <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.issue_date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1 leading-snug">{c.title}</h4>
                  <p className="text-xs text-slate-500 mb-3">{c.event_name}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      c.type.startsWith('диплом') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.type.replace(/_/g, ' ')}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вкладка 3: Заявки на события */}
      {activeSubTab === 'apps' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-[#0a2a5e] flex items-center space-x-2">
                <FileText className="w-6 h-6 text-[#d4af37]" />
                <span>Мои заявки на участие в конференциях</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Отслеживайте статус поданных докладов и тезисов</p>
            </div>
          </div>

          {myApps.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Вы ещё не подавали заявок на конференции.</p>
              <p className="text-xs text-slate-400 mt-1">Выберите мероприятие в календаре событий для подачи работы.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myApps.map(ap => (
                <div key={ap.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-blue-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase">
                      <span>{new Date(ap.created_at).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>ID: {ap.id.slice(-8)}</span>
                    </div>
                    <h4 className="font-bold text-[#0a2a5e]">{ap.event_title}</h4>
                    <p className="text-xs text-slate-600 font-medium">Тема: «{ap.topic}»</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      ap.status === 'принята' ? 'bg-green-100 text-green-700' : 
                      ap.status === 'отклонена' ? 'bg-red-100 text-red-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {ap.status}
                    </span>
                    {ap.review_comment && (
                      <p className="text-[10px] text-slate-400 italic text-right max-w-[200px]">
                        "{ap.review_comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вкладка 3: Задачи в лабораториях СНИЛ */}
      {activeSubTab === 'tasks' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0a2a5e]">Мои исследовательские поручения в СНИЛ</h3>
          {myTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Вам пока не назначено задач от руководителей лабораторий.</p>
          ) : (
            <div className="space-y-3">
              {myTasks.map(t => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-teal-600 font-bold uppercase">{t.snil_name}</span>
                    <h4 className="font-bold text-sm text-[#0a2a5e]">{t.title}</h4>
                    <p className="text-xs text-slate-600">{t.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${t.status === 'выполнена' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {t.status}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">До: {t.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вкладка 4: Научные интересы */}
      {activeSubTab === 'interests' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6 transition-colors">
          <div>
            <h3 className="text-lg font-bold text-[#0a2a5e] dark:text-blue-300">Теги научных интересов</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Используются системой для персональной рекомендации конференций и подбора команд СНИЛ</p>
          </div>

          <form onSubmit={handleAddInterest} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              placeholder="Новый интерес (например: Эконометрика)..."
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-[#0a2a5e] dark:focus:border-blue-500 dark:text-slate-100 transition-colors min-h-[44px]"
            />
            <button type="submit" className="px-6 py-3 bg-[#0a2a5e] text-white font-bold text-sm rounded-xl hover:bg-blue-900 transition-colors min-h-[44px] shadow-sm">
              Добавить
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {user.scientific_interests.map(intr => (
              <span key={intr} className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-medium text-xs flex items-center space-x-2 border border-blue-100 dark:border-blue-900 shadow-sm transition-colors">
                <span>💡 {intr}</span>
                <button type="button" onClick={() => handleRemoveInterest(intr)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-bold ml-1 transition-colors">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

const DashStat: React.FC<{ title: string; value: number | string; desc: string; highlight?: boolean }> = ({ title, value, desc, highlight }) => (
  <div className={`p-5 rounded-2xl border transition-all ${
    highlight 
      ? 'bg-[#0a2a5e] dark:bg-blue-900/40 border-[#d4af37]/40 text-white' 
      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-blue-100 shadow-sm'
  }`}>
    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>{title}</p>
    <p className={`text-2xl font-black font-mono ${highlight ? 'text-white' : 'text-[#0a2a5e] dark:text-[#d4af37]'}`}>{value}</p>
    <p className={`text-[10px] mt-1 font-medium ${highlight ? 'text-blue-200 opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>{desc}</p>
  </div>
);

const SubTabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2.5 px-4 py-3.5 rounded-xl transition-all whitespace-nowrap min-h-[44px] ${
      active 
        ? 'bg-[#0a2a5e] text-[#d4af37] shadow-lg scale-[1.02]' 
        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95'
    }`}
  >
    {icon}
    <span className="font-bold text-xs sm:text-sm">{label}</span>
    {count > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
        active ? 'bg-[#d4af37] text-[#0a2a5e]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      }`}>
        {count}
      </span>
    )}
  </button>
);
