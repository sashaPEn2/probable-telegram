import React, { useState } from 'react';
import { PortalDatabase, generateIcsCalendar } from '../services/storage';
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
  Sparkles
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
      db.notifications.push({
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a2a5e] flex items-center space-x-2.5">
            <Calendar className="w-7 h-7 text-[#d4af37]" />
            <span>Календарь научных мероприятий ФЭМ</span>
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Онлайн-регистрация докладов, загрузка тезисов и интеграция с календарями (ics / Outlook)
          </p>
        </div>

        {/* Панель фильтров */}
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-3 lg:pb-0 no-scrollbar">
          <Filter className="w-5 h-5 text-slate-400 flex-shrink-0 ml-1" />
          {eventTypes.map(t => (
            <button
              key={t.val}
              onClick={() => setFilterType(t.val)}
              className={`px-5 py-3 rounded-2xl text-xs font-bold flex-shrink-0 transition-all whitespace-nowrap min-h-[44px] ${
                filterType === t.val
                  ? 'bg-[#0a2a5e] text-[#d4af37] shadow-lg scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Сетка карточек мероприятий */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-base">Мероприятия выбранного формата пока не запланированы.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map(ev => {
            const isRegistered = user && ev.participant_record_books.includes(user.record_book_id);
            const userApp = user && db.applications.find(a => a.event_id === ev.id && a.student_record_book === user.record_book_id);

            return (
              <div 
                key={ev.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-[#d4af37] shadow-sm hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 sm:p-7 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-blue-50 text-[#0a2a5e] border border-blue-200 uppercase tracking-wider font-mono">
                      {ev.type.replace('_', ' ')}
                    </span>
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded ${ev.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {ev.is_active ? '● Регистрация открыта' : '● Завершена'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0a2a5e] group-hover:text-blue-700 transition-colors leading-snug">
                    {ev.title}
                  </h3>

                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-3">
                    {ev.description}
                  </p>

                  <div className="pt-3 space-y-2 text-xs text-slate-500 font-medium border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                      <span>Даты: <strong className="text-slate-800">{new Date(ev.start_date).toLocaleDateString()} — {new Date(ev.end_date).toLocaleDateString()}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span>Участников: {ev.participant_record_books.length} / {ev.max_participants}</span>
                    </div>
                  </div>

                  {ev.materials_links && ev.materials_links.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {ev.materials_links.map((mat, i) => (
                        <a 
                          key={i} 
                          href={mat.url} 
                          className="inline-flex items-center space-x-1 text-[11px] bg-slate-100 hover:bg-blue-100 text-blue-900 px-2 py-1 rounded transition-colors font-mono"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{mat.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <button
                    onClick={() => generateIcsCalendar(ev)}
                    className="p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#0a2a5e] transition-colors flex items-center space-x-2 text-xs font-mono min-h-[44px] min-w-[44px] justify-center"
                    title="Скачать .ics в календарь"
                  >
                    <Download className="w-5 h-5 text-[#d4af37]" />
                    <span className="hidden sm:inline">.ics Календарь</span>
                  </button>

                  {isRegistered ? (
                    <div className="flex-1 py-3 px-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-400 font-bold text-xs flex items-center justify-center space-x-2 min-h-[44px]">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                      <span>{userApp ? `Статус: ${userApp.status.toUpperCase()}` : 'Вы зарегистрированы'}</span>
                    </div>
                  ) : ev.is_active ? (
                    <button
                      onClick={() => handleOpenRegistration(ev)}
                      className="flex-1 py-3 px-4 rounded-2xl bg-[#0a2a5e] hover:bg-blue-900 text-[#d4af37] font-black text-xs shadow-md hover:shadow-xl transition-all text-center min-h-[44px] active:scale-95"
                    >
                      Регистрация докладов
                    </button>
                  ) : (
                    <span className="flex-1 text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Приём заявок закрыт</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно подачи тезисов доклада */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-blue-200">
            
            <div className="bg-[#0a2a5e] p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#d4af37] font-bold">Официальная регистрация БГЭУ</span>
                <h3 className="font-bold text-base line-clamp-1">{activeModalEvent.title}</h3>
              </div>
              <button 
                onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-[#0a2a5e]">Заявка успешно отправлена!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ваши тезисы направлены координатору научной работы ФЭМ. Отслеживать изменение статуса можно в личном портфолио исследователя.
                </p>
                <button
                  onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                  className="w-full py-3 rounded-xl bg-[#0a2a5e] text-white font-bold text-sm shadow mt-4"
                >
                  Вернуться в календарь
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="p-6 space-y-4">
                {!user && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 mb-2">
                    Внимание: Для подачи докладов войдите в систему по номеру зачётки в правом верхнем углу!
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ФИО и Группа исследователя</label>
                  <input 
                    type="text" 
                    disabled 
                    value={user ? `${user.last_name} ${user.first_name} (${user.group})` : 'Не авторизован'} 
                    className="w-full px-3 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-600 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Тема доклада / научного исследования *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Влияние ИИ на логистические цепочки предприятий РБ"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0a2a5e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Краткие тезисы (Аннотация) *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Изложите актуальность, цель исследования и основные выводы (до 2000 знаков)..."
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-[#0a2a5e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Загрузить файл работы (PDF / DOCX)</label>
                  <div className="flex items-center space-x-3">
                    <label className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0a2a5e] cursor-pointer bg-slate-50 transition-colors">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-slate-600 truncate font-mono">
                        {fileName || 'Выбрать файл с компьютера...'}
                      </span>
                      <input 
                        type="file" 
                        accept=".pdf,.docx,.doc" 
                        onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Максимальный размер файла — 15 МБ. Оформление строго по стандарту БГЭУ.</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => { setActiveModalEvent(null); onClearSelectedEvent(); }}
                    className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold order-2 sm:order-1 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={!user || isSubmitting}
                    className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#d4af37] to-amber-500 text-[#0a2a5e] font-black text-sm shadow-lg hover:brightness-105 flex items-center justify-center space-x-2 transition-all order-1 sm:order-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Регистрация в базе...</span>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Подать заявку на участие</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
