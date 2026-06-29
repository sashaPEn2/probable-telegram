import React, { useState, useMemo, useRef } from 'react';
import { PortalDatabase, seedFacultyStarterTemplate, calculateResearcherStats } from '../services/storage';
import { CustomUser } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Sparkles, 
  Calendar, 
  Pin, 
  ArrowRight, 
  FlaskConical, 
  Send, 
  FileText, 
  Plus, 
  Award, 
  ShieldAlert,
  Users,
  Search,
  BookOpen,
  Download,
  Loader2
} from 'lucide-react';

interface FeedViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  onSelectEvent: (eventId: string) => void;
  onSelectSnil: (snilId: string) => void;
  onRefresh: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  db,
  user,
  onSelectEvent,
  onSelectSnil,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateNews, setShowCreateNews] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [pubToTg, setPubToTg] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (!user) return { hIndex: 0, totalPubs: 0, totalReports: 0, conferencesCount: 0, ratingPoints: 0 };
    return calculateResearcherStats(user.record_book_id);
  }, [user, db.publications, db.applications, db.certificates]);

  const myPubs = useMemo(() => {
    if (!user) return [];
    return db.publications.filter(p => p.user_record_book === user.record_book_id);
  }, [db.publications, user]);

  const myApps = useMemo(() => {
    if (!user) return [];
    return db.applications.filter(a => a.student_record_book === user.record_book_id);
  }, [db.applications, user]);

  const myCerts = useMemo(() => {
    if (!user) return [];
    return db.certificates.filter(c => c.user_record_book === user.record_book_id);
  }, [db.certificates, user]);

  const exportPortfolioToPdf = async () => {
    if (!pdfTemplateRef.current || !user) return;
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

  const canCreateNews = user && (user.role === 'activist' || user.role === 'coordinator' || user.role === 'admin');

  const handlePublishNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    db.news.unshift({
      id: 'news_' + Date.now(),
      title: newTitle,
      content: newContent,
      author_record_book: user!.record_book_id,
      author_name: `${user!.last_name} ${user!.first_name} (${user!.role === 'activist' ? 'СНО ФЭМ' : 'Деканат'})`,
      is_pinned: isPinned,
      created_at: new Date().toISOString(),
      published_to_telegram: pubToTg,
      image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80'
    });

    // Оповещение
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_record_book: 'all',
      title: 'Новый анонс СНО ФЭМ!',
      message: newTitle,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    setNewTitle('');
    setNewContent('');
    setShowCreateNews(false);
    onRefresh();
  };

  const filteredNews = db.news.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEvents = db.events.filter(e => e.is_active).slice(0, 4);
  const topSnils = db.snils.filter(s => s.is_active).slice(0, 3);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Главный баннер ФЭМ БГЭУ */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-blue via-blue-900 to-[#0d3b84] text-white p-8 sm:p-12 shadow-xl border border-brand-gold/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-gold/20 border border-brand-gold text-brand-gold text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Студенческая наука БГЭУ</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Цифровой портал исследователя <span className="text-brand-gold underline decoration-cyan-400/50">ФЭМ</span>
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed opacity-90">
            Единая среда для генерации идей, участия в конференциях, подачи заявок на гранты СНИЛ и формирования верифицированного портфолио исследователя.
          </p>
          
          <div className="pt-2 flex flex-wrap gap-3">
            {db.news.length === 0 && db.events.length === 0 && (
              <button
                onClick={() => { seedFacultyStarterTemplate(); onRefresh(); }}
                className="px-5 py-2.5 rounded-xl bg-brand-gold text-brand-blue font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all animate-bounce"
              >
                <Plus className="w-4 h-4" />
                <span>Загрузить стартовые анонсы ФЭМ (Демо)</span>
              </button>
            )}
            <a 
              href="https://t.me/snofem" 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-400/30 text-white font-semibold flex items-center space-x-2 transition-all text-xs sm:text-sm"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Канал @snofem в Telegram</span>
            </a>
          </div>
        </div>
      </div>

      {/* Быстрая статистика факультета */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-6 h-6 text-blue-400" />} number={db.publications.length + 42} label="Публикаций в базе" />
        <StatCard icon={<Calendar className="w-6 h-6 text-brand-gold" />} number={db.events.length + 8} label="Научных мероприятий" />
        <StatCard icon={<FlaskConical className="w-6 h-6 text-teal-400" />} number={db.snils.length + 5} label="Лабораторий СНИЛ" />
        <StatCard icon={<Users className="w-6 h-6 text-purple-400" />} number={db.users.length + 156} label="Исследователей ФЭМ" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Лента новостей СНО (Левые 2 колонки) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-brand-blue dark:text-blue-300 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-brand-gold" />
                <span>Новости и анонсы СНО ФЭМ</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Официальная хроника и дискуссионные площадки</p>
            </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-auto">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Поиск новостей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 sm:py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-brand-blue dark:focus:border-blue-500 min-h-[40px]"
                  />
                </div>

                {canCreateNews && (
                  <button
                    onClick={() => setShowCreateNews(!showCreateNews)}
                    className="px-4 py-2.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-brand-blue text-white hover:bg-blue-900 transition-colors text-xs font-bold flex items-center justify-center space-x-1 min-h-[40px] shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-brand-gold" />
                    <span className="whitespace-nowrap">Новый анонс</span>
                  </button>
                )}
              </div>
          </div>

          {/* Форма создания новости (только для Активиста СНО / Координатора) */}
          {showCreateNews && (
            <form onSubmit={handlePublishNews} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-brand-blue dark:text-blue-300">Публикация анонса СНО</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 font-mono">Авто-интеграция Telegram</span>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Заголовок новости..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-blue dark:focus:border-blue-500"
                />
              </div>

              <div>
                <textarea
                  rows={4}
                  placeholder="Текст анонса (поддерживает ссылки на мероприятия)..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-blue dark:focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded text-brand-blue" />
                    <span>Закрепить наверху</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={pubToTg} onChange={(e) => setPubToTg(e.target.checked)} className="rounded text-sky-600" />
                    <span>Репост в @snofem</span>
                  </label>
                </div>

                <div className="flex space-x-3 w-full sm:w-auto">
                  <button type="button" onClick={() => setShowCreateNews(false)} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold">Отмена</button>
                  <button type="submit" className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-brand-gold text-brand-blue font-bold text-sm shadow-md hover:brightness-105 transition-all">Опубликовать</button>
                </div>
              </div>
            </form>
          )}

          {/* Список новостей */}
          {filteredNews.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Новостей пока не найдено.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Нажмите «Загрузить стартовые анонсы» выше для инициализации демонстрационных данных БГЭУ.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews.map(item => (
                <article key={item.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all relative ${item.is_pinned ? 'border-brand-gold dark:border-cyan-600/50 bg-amber-50/20 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
                  {item.is_pinned && (
                    <div className="absolute top-4 right-4 flex items-center space-x-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-0.5 rounded-full">
                      <Pin className="w-3 h-3 rotate-45" />
                      <span>Важное</span>
                    </div>
                  )}

                  {item.image_url && (
                    <div className="mb-4 rounded-xl overflow-hidden max-h-56 border border-slate-100 dark:border-slate-800">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-mono">
                    <span>{new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
                    <span>•</span>
                    <span className="text-blue-900 dark:text-blue-400 font-semibold">{item.author_name}</span>
                    {item.published_to_telegram && (
                      <span className="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded ml-auto flex items-center space-x-1">
                        <Send className="w-2.5 h-2.5" /> <span>Telegram</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-brand-blue dark:text-blue-100 mb-2 leading-snug">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                </article>
              ))}
            </div>
          )}

        </div>

        {/* Правая колонка: Ближайшие события и топ СНИЛ */}
        <div className="space-y-8">

          {/* Персональный научный статус исследователя на дашборде */}
          {user && (
            <div className="bg-gradient-to-br from-brand-blue to-blue-950 text-white rounded-3xl p-6 shadow-md border border-brand-gold/30 space-y-4">
              <div className="flex items-center space-x-3 border-b border-blue-900 pb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>{user.first_name[0]}{user.last_name[0]}</>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">{user.last_name} {user.first_name}</h4>
                  <p className="text-[10px] text-blue-300 font-mono">Группа {user.group} • зачётка №{user.record_book_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-1">
                <div className="bg-blue-950/40 p-2 rounded-xl border border-blue-900/40">
                  <p className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">h-индекс</p>
                  <p className="text-sm font-black text-brand-gold mt-0.5">{stats.hIndex}</p>
                </div>
                <div className="bg-blue-950/40 p-2 rounded-xl border border-blue-900/40">
                  <p className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Работы</p>
                  <p className="text-sm font-black text-brand-gold mt-0.5">{myPubs.length}</p>
                </div>
                <div className="bg-blue-950/40 p-2 rounded-xl border border-blue-900/40">
                  <p className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Рейтинг</p>
                  <p className="text-sm font-black text-cyan-400 mt-0.5">{stats.ratingPoints}</p>
                </div>
              </div>

              <button
                onClick={exportPortfolioToPdf}
                disabled={isExporting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-gold to-cyan-500 text-brand-blue font-black text-sm shadow-lg hover:brightness-110 flex items-center justify-center space-x-3 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                id="download-dashboard-pdf-btn"
              >
                {isExporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>{isExporting ? 'Генерация PDF...' : 'Скачать PDF-отчет достижений'}</span>
              </button>
            </div>
          )}

          {/* Скрытый шаблон для PDF (используем position: fixed вместо hidden для html2canvas) */}
          {user && (
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
          )}

          {/* Виджет ближайших конференций */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-brand-blue dark:text-blue-300 flex items-center space-x-2 text-base">
                <Calendar className="w-5 h-5 text-brand-gold" />
                <span>Ближайшие события</span>
              </h3>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Онлайн-регистрация</span>
            </div>

            {activeEvents.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">Нет предстоящих событий.</p>
            ) : (
              <div className="space-y-3">
                {activeEvents.map(ev => (
                  <div 
                    key={ev.id}
                    onClick={() => onSelectEvent(ev.id)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                      <span className="text-[#d4af37] font-bold uppercase">{ev.type.replace('_', ' ')}</span>
                      <span>до {new Date(ev.registration_deadline).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-brand-blue dark:text-blue-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">📍 {ev.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Конкурс Лучшая СНИЛ */}
          <div className="bg-gradient-to-br from-brand-gold to-cyan-500 rounded-3xl p-6 text-brand-blue shadow-lg relative overflow-hidden">
            <Award className="w-32 h-32 absolute -bottom-6 -right-6 text-white/20 pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-blue text-white">Конкурс БГЭУ</span>
              <h3 className="text-xl font-extrabold leading-tight">Лучшая СНИЛ БГЭУ 2026</h3>
              <p className="text-xs leading-relaxed font-medium opacity-90">
                Приём отчётов лабораторий факультета экономики и менеджмента за прошедший год открыт до 15 мая.
              </p>
              <div className="pt-2">
                <button 
                  onClick={() => onSelectSnil('snil_1')}
                  className="px-4 py-2 rounded-xl bg-brand-blue text-brand-gold font-bold text-xs shadow hover:bg-blue-950 flex items-center space-x-1.5"
                >
                  <span>Подать заявку СНИЛ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Виджет Лабораторий */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-brand-blue dark:text-blue-300 flex items-center space-x-2 text-base">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                <span>Активные СНИЛ ФЭМ</span>
              </h3>
            </div>

            {topSnils.map(sn => (
              <div 
                key={sn.id}
                onClick={() => onSelectSnil(sn.id)}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-900/20 cursor-pointer transition-all"
              >
                <h4 className="font-bold text-xs text-brand-blue dark:text-blue-200 line-clamp-1">{sn.name}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">Рук: {sn.head_name}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sn.research_directions.slice(0, 2).map((d, i) => (
                    <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">{d}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; number: number; label: string }> = ({ icon, number, label }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center space-x-4 shadow-sm transition-colors">
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xl sm:text-2xl font-extrabold text-brand-blue dark:text-blue-300 font-mono">{number}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">{label}</p>
    </div>
  </div>
);
