import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalDatabase, generateIcsCalendar, addNotificationAndNotifyTelegram } from '../services/storage';
import { CustomUser, ScientificEvent, EventType } from '../types';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Download, 
  CheckCircle, 
  FileText, 
  Upload, 
  X, 
  Send,
  Filter,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface EventsViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  selectedEventId: string | null;
  onClearSelectedEvent: () => void;
  onRefresh: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  db,
  user,
  selectedEventId,
  onClearSelectedEvent,
  onRefresh
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [activeModalEvent, setActiveModalEvent] = useState<ScientificEvent | null>(
    selectedEventId ? db.events.find(e => e.id === selectedEventId) || null : null
  );

  // Состояния формы регистрации
  const [topic, setTopic] = useState('');
  const [abstract, setAbstract] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const eventTypes: { label: string; val: string }[] = [
    { label: 'Все форматы', val: 'all' },
    { label: 'Конференции', val: 'конференция' },
    { label: 'Научные слэмы', val: 'научный_слэм' },
    { label: 'Научные гостиные', val: 'научная_гостиная' },
    { label: 'Семинары', val: 'семинар' },
    { label: 'Мастер-классы', val: 'мастер-класс' },
    { label: 'Форумы', val: 'форум' },
  ];

  const filteredEvents = db.events.filter(ev => 
    filterType === 'all' ? true : ev.type === filterType
  );

  const handleOpenRegistration = (ev: ScientificEvent) => {
    setActiveModalEvent(ev);
    setSubmittedSuccess(false);
    setTopic('');
    setAbstract('');
    setFileName('');
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeModalEvent) return;
    if (!topic.trim() || !abstract.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      // Регистрируем заявку в базе
      const newApp = {
        id: 'app_' + Date.now(),
        student_record_book: user.record_book_id,
        student_name: `${user.last_name} ${user.first_name}`,
        student_group: user.group,
        event_id: activeModalEvent.id,
        event_title: activeModalEvent.title,
        topic: topic,
        abstract: abstract,
        file_name: fileName || 'Тезисы_доклада_БГЭУ.pdf',
        status: 'на_рассмотрении' as const,
        created_at: new Date().toISOString()
      };

      db.applications.push(newApp);

      // Добавляем студента в список участников мероприятия
      if (!activeModalEvent.participant_record_books.includes(user.record_book_id)) {
        activeModalEvent.participant_record_books.push(user.record_book_id);
      }

      // Оповещение пользователю
      addNotificationAndNotifyTelegram({
        id: 'notif_' + Date.now(),
        user_record_book: user.record_book_id,
        title: 'Заявка принята на рассмотрение',
        message: `Ваш доклад «${topic}» зарегистрирован на мероприятие «${activeModalEvent.title}»`,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      });

      localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      onRefresh();
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Заголовок и фильтры сетки */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a2a5e] dark:text-blue-200 flex items-center space-x-2.5">
            <Calendar className="w-7 h-7 text-[#d4af37]" />
            <span>Календарь научных мероприятий ФЭМ</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 font-medium">
            Онлайн-регистрация докладов, загрузка тезисов и интеграция с календарями (ics / Outlook)
          </p>
        </div>

        {/* Панель фильтров */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 mr-2 text-slate-400 dark:text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Фильтр:</span>
          </div>
          {eventTypes.map(t => (
            <button
              key={t.val}
              onClick={() => setFilterType(t.val)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[38px] border ${
                filterType === t.val
                  ? 'bg-[#0a2a5e] text-[#d4af37] border-[#0a2a5e] shadow-lg scale-105'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Сетка карточек мероприятий */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">Мероприятия выбранного формата пока не запланированы.</p>
          <button 
            onClick={() => setFilterType('all')}
            className="mt-4 text-[#d4af37] font-black text-xs uppercase tracking-widest hover:underline"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map(ev => {
            const isRegistered = user && ev.participant_record_books.includes(user.record_book_id);
            const userApp = user && db.applications.find(a => a.event_id === ev.id && a.student_record_book === user.record_book_id);

            return (
              <div 
                key={ev.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-[#d4af37] dark:hover:border-[#d4af37] shadow-sm hover:shadow-2xl transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 sm:p-7 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0a2a5e] dark:text-blue-300 border border-blue-100 dark:border-blue-800 uppercase tracking-wider font-mono">
                      {ev.type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-2 h-2 rounded-full ${ev.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${ev.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {ev.is_active ? 'Регистрация открыта' : 'Завершена'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-[#0a2a5e] dark:text-white group-hover:text-blue-700 dark:group-hover:text-[#d4af37] transition-colors leading-tight">
                    {ev.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-3 font-medium">
                    {ev.description}
                  </p>

                  <div className="pt-4 space-y-3 text-xs text-slate-500 dark:text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <span>Даты: <strong className="text-slate-800 dark:text-slate-200">{new Date(ev.start_date).toLocaleDateString()} — {new Date(ev.end_date).toLocaleDateString()}</strong></span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="truncate">{ev.location}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-teal-500" />
                      </div>
                      <span>Участников: <span className="text-slate-800 dark:text-slate-200">{ev.participant_record_books.length} / {ev.max_participants}</span></span>
                    </div>
                  </div>

                  {ev.materials_links && ev.materials_links.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {ev.materials_links.map((mat, i) => (
                        <a 
                          key={i} 
                          href={mat.url} 
                          className="inline-flex items-center space-x-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-[#d4af37] dark:hover:bg-[#d4af37] text-slate-700 dark:text-slate-300 hover:text-[#0a2a5e] dark:hover:text-[#0a2a5e] px-3 py-1.5 rounded-lg transition-all font-black uppercase tracking-wider border border-transparent hover:border-[#d4af37]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{mat.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => generateIcsCalendar(ev)}
                    className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#d4af37] transition-all flex items-center justify-center min-w-[44px]"
                    title="Скачать .ics в календарь"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  {isRegistered ? (
                    <div className="flex-1 py-3 px-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-2 min-h-[44px]">
                      <CheckCircle className="w-4 h-4" />
                      <span>{userApp ? `Статус: ${userApp.status.replace('_', ' ')}` : 'Участвую'}</span>
                    </div>
                  ) : ev.is_active ? (
                    <button
                      onClick={() => handleOpenRegistration(ev)}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#0a2a5e] dark:bg-blue-600 hover:bg-blue-900 dark:hover:bg-blue-500 text-[#d4af37] dark:text-white font-black text-[11px] uppercase tracking-widest shadow-md hover:shadow-xl transition-all text-center min-h-[44px] active:scale-95"
                    >
                      Регистрация доклада
                    </button>
                  ) : (
                    <span className="flex-1 text-center text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em]">Приём заявок закрыт</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно подачи тезисов доклада */}
      {activeModalEvent && createPortal(
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl border border-[#d4af37]/30 flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-[#0a2a5e] to-blue-900 p-6 text-white flex items-center justify-between border-b border-[#d4af37]/20">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-black">Научная регистрация БГЭУ</span>
                </div>
                <h3 className="font-black text-lg mt-1 line-clamp-1">{activeModalEvent.title}</h3>
              </div>
              <button 
                onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {submittedSuccess ? (
                <div className="p-10 text-center space-y-6">
                  <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-green-100 dark:border-green-800">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-[#0a2a5e] dark:text-white uppercase tracking-tight">Заявка отправлена!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3 font-medium px-4">
                      Ваши тезисы направлены координатору научной работы ФЭМ. Отслеживать изменение статуса можно в личном портфолио исследователя.
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                    className="w-full py-4 rounded-2xl bg-[#0a2a5e] dark:bg-blue-600 text-[#d4af37] dark:text-white font-black text-sm uppercase tracking-widest shadow-lg hover:brightness-110 transition-all"
                  >
                    Вернуться в календарь
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="p-8 space-y-5">
                  {!user && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center space-x-3 mb-2">
                      <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <span>Для подачи докладов необходимо войти в систему по номеру зачётки.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Данные исследователя</label>
                      <div className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold font-mono">
                        {user ? `${user.last_name} ${user.first_name} [Гр. ${user.group}]` : 'Авторизация не выполнена'}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Тема доклада / исследования *</label>
                      <input
                        type="text"
                        required
                        placeholder="Введите полное название вашей научной работы..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Аннотация (тезисы) *</label>
                      <textarea
                        rows={5}
                        required
                        placeholder="Кратко изложите актуальность, цель исследования и ожидаемые выводы..."
                        value={abstract}
                        onChange={(e) => setAbstract(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Файл работы (PDF / DOCX)</label>
                      <div className="relative">
                        <label className="flex items-center justify-between px-4 py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#d4af37] dark:hover:border-[#d4af37] cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition-all group">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                              <Upload className="w-5 h-5" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                {fileName || 'Нажмите для выбора файла'}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">PDF, DOCX до 15 МБ</p>
                            </div>
                          </div>
                          <input 
                            type="file" 
                            accept=".pdf,.docx,.doc" 
                            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-2 flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                      className="px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all order-2 sm:order-1"
                    >
                      Закрыть
                    </button>
                    <button
                      type="submit"
                      disabled={!user || isSubmitting}
                      className="flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#0a2a5e] via-blue-900 to-blue-800 text-[#d4af37] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-125 flex items-center justify-center space-x-3 transition-all order-1 sm:order-2 disabled:opacity-50 disabled:grayscale"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                          <span>Отправка...</span>
                        </div>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Подать заявку</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
