import React, { useState } from 'react';
import { PortalDatabase, savePortalDB, addNotificationAndNotifyTelegram } from '../services/storage';
import { CustomUser, Publication, ResearchApplication, ResearchTask, MerchOrder } from '../types';
import { UserAvatar } from './UserAvatar';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Users, 
  FileText, 
  BookOpen, 
  Briefcase, 
  Send, 
  AlertCircle,
  Plus,
  Trash2,
  ShoppingBag,
  PackageCheck,
  CheckCircle
} from 'lucide-react';

interface AdminViewProps {
  db: PortalDatabase;
  user: CustomUser;
  onRefresh: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ db, user, onRefresh }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'pubs' | 'apps' | 'tasks' | 'broadcast' | 'merch' | 'banner' | 'news' | 'events'>('pubs');
  
  // Форма рассылки уведомлений
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'success' | 'warning'>('info');

  // Форма назначения задачи СНИЛ
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStudent, setTaskStudent] = useState('');
  const [taskSnil, setTaskSnil] = useState('СНИЛ «Маркетинг инноваций»');
  const [taskDeadline, setTaskDeadline] = useState('2026-05-15');

  // Форма баннера
  const initialBanner = db.feed_banner || {
    show: true,
    tag_text: 'Студенческая наука БГЭУ',
    title_main: 'Цифровой портал исследователя ',
    title_highlight: 'ФЭМ',
    description: 'Единая среда для генерации идей, участия в конференциях, подачи заявок на гранты СНИЛ и формирования верифицированного портфолио исследователя.',
    bg_gradient_from: '#0a2a5e',
    bg_gradient_via: 'blue-900',
    bg_gradient_to: '#0d3b84',
    accent_color: '#d4af37',
    button1_text: 'Загрузить стартовые анонсы ФЭМ (Демо)',
    button1_link: '#',
    button2_text: 'СНО ФЭМ',
    button2_link: 'https://t.me/snofem'
  };
  const [bannerForm, setBannerForm] = useState(initialBanner);
  
  // Форма дополнительного баннера (Конкурс)
  const initialSecondaryBanner = db.secondary_banner || {
    show: true,
    tag_text: 'Конкурс БГЭУ',
    title: 'Лучшая СНИЛ БГЭУ 2026',
    description: 'Приём отчётов лабораторий факультета экономики и менеджмента за прошедший год открыт до 15 мая.',
    bg_gradient_from: '#f59e0b', // amber-500
    bg_gradient_to: '#d4af37',
    text_color: '#0a2a5e',
    tag_bg: '#0a2a5e',
    tag_text_color: '#ffffff',
    button_text: 'Подать заявку СНИЛ',
    button_bg: '#0a2a5e',
    button_text_color: '#d4af37',
    button_link: 'snil_1'
  };
  const [secondaryBannerForm, setSecondaryBannerForm] = useState(initialSecondaryBanner);

  // Форма новостей
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    is_pinned: false,
    image_url: ''
  });

  // Форма мероприятий
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'конференция' as 'конференция' | 'форум' | 'семинар' | 'хакатон' | 'олимпиада',
    description: '',
    organizer: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    location: '',
    max_participants: 100,
  });

  const pendingPubs = db.publications.filter(p => !p.is_confirmed);
  const pendingApps = db.applications.filter(a => a.status === 'на_рассмотрении');

  const handleSaveBanner = () => {
    db.feed_banner = { ...bannerForm };
    db.secondary_banner = { ...secondaryBannerForm };
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
    alert('Баннеры успешно обновлены');
  };

  const handleApprovePub = (pub: Publication) => {
    pub.is_confirmed = true;
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: pub.user_record_book,
      title: 'Публикация подтверждена ВАК/Деканатом',
      message: `Ваша работа «${pub.title}» верифицирована. Вам начислены рейтинговые баллы!`,
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
  };

  const handleRejectPub = (pubId: string, studentRecord: string, title: string) => {
    db.publications = db.publications.filter(p => p.id !== pubId);
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: studentRecord,
      title: 'Отклонена заявка на публикацию',
      message: `Работа «${title}» отклонена модератором (неверные данные издания или дубликат)`,
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
  };

  const handleReviewApp = (app: ResearchApplication, newStatus: 'принята' | 'отклонена') => {
    app.status = newStatus;
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: app.student_record_book,
      title: `Заявка на конференцию ${newStatus}`,
      message: `Ваша заявка с докладом «${app.topic}» на событие «${app.event_title}» получила статус: ${newStatus.toUpperCase()}`,
      type: newStatus === 'принята' ? 'success' : 'warning',
      is_read: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    // Рассылаем всем пользователям в базе
    db.users.forEach(u => {
      addNotificationAndNotifyTelegram({
        id: 'notif_' + u.record_book_id + '_' + Date.now(),
        user_record_book: u.record_book_id,
        title: `📢 ${broadcastTitle}`,
        message: broadcastMessage,
        type: broadcastType,
        is_read: false,
        created_at: new Date().toISOString()
      });
    });

    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    setBroadcastTitle('');
    setBroadcastMessage('');
    alert('Уведомление успешно отправлено всем студентам ФЭМ!');
    onRefresh();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskStudent.trim()) return;

    const targetUser = db.users.find(u => `${u.last_name} ${u.first_name}`.toLowerCase().includes(taskStudent.toLowerCase()) || u.record_book_id === taskStudent.trim());
    
    if (!targetUser) {
      alert('Студент с таким ФИО или номером зачётки не найден!');
      return;
    }

    const newTask: ResearchTask = {
      id: 'task_' + Date.now(),
      snil_id: 'gen_snil_coordinator',
      title: taskTitle,
      description: taskDesc || 'Исследовательское поручение в лаборатории ФЭМ',
      snil_name: taskSnil,
      assigned_to_record_book: targetUser.record_book_id,
      assigned_to_name: `${targetUser.last_name} ${targetUser.first_name}`,
      status: 'в_работе',
      deadline: taskDeadline,
      created_at: new Date().toISOString()
    };

    db.tasks.unshift(newTask);
    savePortalDB(db);
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: targetUser.record_book_id,
      title: 'Новая задача от руководителя СНИЛ',
      message: `Вам поручена задача «${taskTitle}» в ${taskSnil}`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    setTaskTitle('');
    setTaskDesc('');
    setTaskStudent('');
    alert(`Задача назначена студенту ${targetUser.last_name} ${targetUser.first_name}`);
    onRefresh();
  };

  const handleUpdateOrderStatus = (order: MerchOrder, newStatus: MerchOrder['status']) => {
    order.status = newStatus;
    savePortalDB(db);
    
    let title = '';
    let message = '';
    
    if (newStatus === 'ready') {
      title = 'Ваш сувенир готов к выдаче!';
      message = `Ваш заказ «${order.itemName}» ожидает вас в деканате (Корпус 4, каб. 314). Не забудьте зачётку!`;
    } else if (newStatus === 'received') {
      title = 'Сувенир получен';
      message = `Вы получили «${order.itemName}». Спасибо за вашу научную активность на ФЭМ!`;
    }

    if (title) {
      addNotificationAndNotifyTelegram({
        id: 'notif_' + Date.now(),
        user_record_book: order.userRecordBook,
        title,
        message,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    onRefresh();
  };

  const handleAddNews = () => {
    if (!newsForm.title || !newsForm.content) {
      alert('Заполните обязательные поля');
      return;
    }
    
    db.news.push({
      id: 'news_' + Date.now(),
      title: newsForm.title,
      content: newsForm.content,
      author_record_book: user.record_book,
      author_name: `${user.last_name} ${user.first_name}`,
      is_pinned: newsForm.is_pinned,
      created_at: new Date().toISOString(),
      image_url: newsForm.image_url,
      published_to_telegram: false
    });
    
    savePortalDB(db);
    setNewsForm({ title: '', content: '', is_pinned: false, image_url: '' });
    onRefresh();
    alert('Новость успешно добавлена!');
  };

  const handleDeleteNews = (id: string) => {
    if (confirm('Удалить новость?')) {
      db.news = db.news.filter(n => n.id !== id);
      savePortalDB(db);
      onRefresh();
    }
  };

  const handleAddEvent = () => {
    if (!eventForm.title || !eventForm.description || !eventForm.start_date || !eventForm.end_date) {
      alert('Заполните обязательные поля');
      return;
    }

    db.events.push({
      id: 'event_' + Date.now(),
      title: eventForm.title,
      type: eventForm.type as any,
      description: eventForm.description,
      organizer: eventForm.organizer || 'ФЭМ',
      start_date: eventForm.start_date,
      end_date: eventForm.end_date,
      registration_deadline: eventForm.registration_deadline || eventForm.start_date,
      location: eventForm.location || 'Уточняется',
      is_active: true,
      max_participants: eventForm.max_participants || 100,
      participant_record_books: [],
      materials_links: [],
      created_at: new Date().toISOString(),
    });

    savePortalDB(db);
    setEventForm({
      title: '', type: 'конференция', description: '', organizer: '', start_date: '', end_date: '', registration_deadline: '', location: '', max_participants: 100
    });
    onRefresh();
    alert('Мероприятие успешно добавлено!');
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Удалить мероприятие?')) {
      db.events = db.events.filter(e => e.id !== id);
      savePortalDB(db);
      onRefresh();
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Баннер панели управления */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-[#0a2a5e] rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Shield className="w-4 h-4" />
            <span>Деканат / Совет СНО ФЭМ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Панель администратора науки</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed opacity-90">
            Верификация электронных портфолио, модерация тезисов докладов, управление поручениями СНИЛ и общефакультетские оповещения.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 font-mono text-xs text-center w-full md:w-auto">
          <p className="text-amber-300 font-bold">Ваша роль: {user.role.toUpperCase()}</p>
          <p className="text-[11px] text-slate-300 mt-1">Доступ к реестрам ФЭМ открыт</p>
        </div>
      </div>

      {/* Вкладки админки */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveAdminTab('pubs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'pubs' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Модерация публикаций</span>
          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-mono">{pendingPubs.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('apps')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'apps' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Заявки на доклады</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">{pendingApps.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('tasks')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'tasks' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Назначить задачу СНИЛ</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('broadcast')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'broadcast' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Bell className="w-4 h-4" />
          <span>Факультетская рассылка</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('merch')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'merch' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Заказы сувениров</span>
          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono">
            {db.orders.filter(o => o.status === 'pending').length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('banner')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'banner' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Главный баннер</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('news')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'news' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Новости и Анонсы</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('events')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'events' ? 'bg-[#0a2a5e] text-[#d4af37]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Мероприятия</span>
        </button>
      </div>

      {/* Контент 1: Модерация работ */}
      {activeAdminTab === 'pubs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0a2a5e]">Очередь верификации статей и тезисов студентов</h3>
          {pendingPubs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p>Очередь пуста. Все публикации студентов проверены!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPubs.map(pb => {
                const authorUser = db.users.find(u => u.record_book_id === pb.user_record_book);
                return (
                  <div key={pb.id} className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 font-mono text-xs">
                        <span className="bg-[#0a2a5e] text-[#d4af37] px-2 py-0.5 rounded font-bold">Студент: {authorUser ? `${authorUser.last_name} ${authorUser.first_name}` : pb.user_record_book}</span>
                        <span className="text-slate-500">Зачётка № {pb.user_record_book}</span>
                      </div>
                      <h4 className="font-extrabold text-base text-[#0a2a5e] mt-1">{pb.title} ({pb.type}, {pb.year} г.)</h4>
                      <p className="text-xs text-slate-700">Издание / Журнал: <strong>{pb.journal}</strong></p>
                      {pb.link && <a href={pb.link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs font-mono inline-block mt-1">Ссылка на публикацию в репозитории →</a>}
                    </div>

                    <div className="flex space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleApprovePub(pb)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" /> <span>Подтвердить</span>
                      </button>
                      <button
                        onClick={() => handleRejectPub(pb.id, pb.user_record_book, pb.title)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-xl flex items-center space-x-1"
                      >
                        <XCircle className="w-4 h-4" /> <span>Отклонить</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Контент 2: Заявки на конференции */}
      {activeAdminTab === 'apps' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#0a2a5e]">Заявки студентов на выступления в конференциях</h3>
          {pendingApps.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">Новых необработанных заявок нет.</p>
          ) : (
            <div className="space-y-3">
              {pendingApps.map(ap => (
                <div key={ap.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Событие: {ap.event_title}</span>
                    <h4 className="font-extrabold text-base text-[#0a2a5e] mt-0.5">Доклад: «{ap.topic}»</h4>
                    <p className="text-xs text-slate-600 mt-1 font-mono">Студент: <strong>{ap.student_name}</strong> (Зачётка № {ap.student_record_book})</p>
                  </div>

                  <div className="flex space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleReviewApp(ap, 'принята')}
                      className="px-4 py-2 bg-blue-900 text-[#d4af37] font-bold text-xs rounded-xl shadow hover:bg-blue-800"
                    >
                      Включить в программу
                    </button>
                    <button
                      onClick={() => handleReviewApp(ap, 'отклонена')}
                      className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Контент 3: Назначение поручений СНИЛ */}
      {activeAdminTab === 'tasks' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
          <h3 className="text-lg font-bold text-[#0a2a5e] mb-2">Назначение исследовательской задачи студенту</h3>
          <p className="text-xs text-slate-500 mb-6">Студент получит мгновенное уведомление в личном кабинете на портале</p>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Краткая формулировка задачи *</label>
              <input type="text" required placeholder="Например: Сбор статистики экспорта ИТ-услуг РБ за 2025 год" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Студент (ФИО или номер зачётной книжки) *</label>
              <input type="text" required placeholder="Например: Невдах Александр или 252601" value={taskStudent} onChange={e => setTaskStudent(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Лаборатория / Кружок</label>
                <select value={taskSnil} onChange={e => setTaskSnil(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium">
                  <option value="СНИЛ «Маркетинг инноваций»">СНИЛ «Маркетинг инноваций»</option>
                  <option value="СНИЛ «Экономика устойчивого развития»">СНИЛ «Экономика устойчивого развития»</option>
                  <option value="СНИЛ «Управление человеческими ресурсами»">СНИЛ «Управление человеческими ресурсами»</option>
                  <option value="Дискуссионный клуб «Экономист»">Дискуссионный клуб «Экономист»</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Дедлайн исполнения</label>
                <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Подробная инструкция</label>
              <textarea rows={3} placeholder="Используйте открытые данные Белстат и отчеты Нацбанка..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-sm"></textarea>
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#0a2a5e] text-[#d4af37] font-extrabold text-sm rounded-xl shadow-lg hover:brightness-110">
              Выдать поручение исследователю
            </button>
          </form>
        </div>
      )}

      {/* Контент 4: Общефакультетская рассылка */}
      {activeAdminTab === 'broadcast' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
          <h3 className="text-lg font-bold text-[#0a2a5e] mb-2 flex items-center space-x-2">
            <Send className="w-5 h-5 text-[#d4af37]" />
            <span>Рассылка важного объявления по ФЭМ</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6">Уведомление появится в колокольчике у всех зарегистрированных студентов и кураторов БГЭУ</p>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Заголовок оповещения *</label>
              <input type="text" required placeholder="Например: Старт приема работ на гранты ректора БГЭУ!" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Важность / Тип</label>
              <select value={broadcastType} onChange={e => setBroadcastType(e.target.value as any)} className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold">
                <option value="info">ℹ️ Информационное (синее)</option>
                <option value="success">🎉 Торжественное / Победы (зеленое)</option>
                <option value="warning">⚠️ Срочное / Дедлайн (красное)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Текст сообщения *</label>
              <textarea rows={4} required placeholder="Уважаемые исследователи ФЭМ! Напоминаем о необходимости загрузить тезисы..." value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border text-sm"></textarea>
            </div>

            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-red-800 to-[#0a2a5e] text-white font-extrabold text-sm rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Отправить рассылку на факультет</span>
            </button>
          </form>
        </div>
      )}

      {/* Контент 5: Заказы сувениров */}
      {activeAdminTab === 'merch' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0a2a5e]">Реестр заказов сувенирной продукции СНО</h3>
            <div className="flex items-center space-x-4 text-xs font-bold text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                <span>Новые: {db.orders.filter(o => o.status === 'pending').length}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Готовы: {db.orders.filter(o => o.status === 'ready').length}</span>
              </span>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Студент</th>
                  <th className="px-6 py-4">Товар</th>
                  <th className="px-6 py-4">Статус</th>
                  <th className="px-6 py-4">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {db.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <UserAvatar size="sm" user={db.users.find(u => u.record_book_id === order.userRecordBook) || { first_name: order.userName.split(' ')[1] || '', last_name: order.userName.split(' ')[0] || '' }} />
                        <div>
                          <div className="font-bold text-slate-900">{order.userName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Зачётка: {order.userRecordBook}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#0a2a5e]">{order.itemName}</div>
                      <div className="text-[10px] text-amber-600 font-bold">{order.points} баллов</div>
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'pending' && <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded text-[10px] uppercase">Ожидает</span>}
                      {order.status === 'ready' && <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded text-[10px] uppercase">Готов</span>}
                      {order.status === 'received' && <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-[10px] uppercase">Получен</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order, 'ready')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Отметить как готовый"
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order, 'received')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Отметить как выданный"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'received' && (
                          <CheckCircle className="w-4 h-4 text-emerald-300" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {db.orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                      Заказов пока нет.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Контент 6: Баннер */}
      {activeAdminTab === 'banner' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#0a2a5e]">Настройки главного баннера</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Тег</label>
              <input type="text" value={bannerForm.tag_text} onChange={(e) => setBannerForm({...bannerForm, tag_text: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Основной заголовок</label>
              <input type="text" value={bannerForm.title_main} onChange={(e) => setBannerForm({...bannerForm, title_main: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Акцент заголовка (выделено цветом)</label>
              <input type="text" value={bannerForm.title_highlight} onChange={(e) => setBannerForm({...bannerForm, title_highlight: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Акцентный цвет (HEX)</label>
              <input type="text" value={bannerForm.accent_color} onChange={(e) => setBannerForm({...bannerForm, accent_color: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Описание</label>
              <textarea rows={3} value={bannerForm.description} onChange={(e) => setBannerForm({...bannerForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Градиент ОТ (Tailwind или HEX)</label>
              <input type="text" value={bannerForm.bg_gradient_from} onChange={(e) => setBannerForm({...bannerForm, bg_gradient_from: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Градиент ДО (Tailwind или HEX)</label>
              <input type="text" value={bannerForm.bg_gradient_to} onChange={(e) => setBannerForm({...bannerForm, bg_gradient_to: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 space-y-4">
            <h4 className="font-bold text-sm text-slate-700">Настройки кнопок</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Текст кнопки 1</label>
                <input type="text" value={bannerForm.button1_text} onChange={(e) => setBannerForm({...bannerForm, button1_text: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ссылка кнопки 1</label>
                <input type="text" value={bannerForm.button1_link} onChange={(e) => setBannerForm({...bannerForm, button1_link: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Текст кнопки 2</label>
                <input type="text" value={bannerForm.button2_text} onChange={(e) => setBannerForm({...bannerForm, button2_text: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ссылка кнопки 2</label>
                <input type="text" value={bannerForm.button2_link} onChange={(e) => setBannerForm({...bannerForm, button2_link: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8 space-y-4">
            <h4 className="font-bold text-lg text-slate-700">Настройки дополнительного баннера (Конкурс)</h4>
            
            <div className="flex items-center space-x-2 mb-4">
              <input type="checkbox" id="show_secondary_banner" checked={secondaryBannerForm.show} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, show: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <label htmlFor="show_secondary_banner" className="text-sm font-semibold text-slate-700">Отображать дополнительный баннер</label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Тег</label>
                <input type="text" value={secondaryBannerForm.tag_text} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, tag_text: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Заголовок</label>
                <input type="text" value={secondaryBannerForm.title} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Описание</label>
                <textarea rows={2} value={secondaryBannerForm.description} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Градиент ОТ (HEX)</label>
                <input type="text" value={secondaryBannerForm.bg_gradient_from} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, bg_gradient_from: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Градиент ДО (HEX)</label>
                <input type="text" value={secondaryBannerForm.bg_gradient_to} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, bg_gradient_to: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Цвет текста (HEX)</label>
                <input type="text" value={secondaryBannerForm.text_color} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, text_color: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Фон тега (HEX)</label>
                <input type="text" value={secondaryBannerForm.tag_bg} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, tag_bg: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Цвет текста тега (HEX)</label>
                <input type="text" value={secondaryBannerForm.tag_text_color} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, tag_text_color: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Текст кнопки</label>
                <input type="text" value={secondaryBannerForm.button_text} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, button_text: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Фон кнопки (HEX)</label>
                <input type="text" value={secondaryBannerForm.button_bg} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, button_bg: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Цвет текста кнопки (HEX)</label>
                <input type="text" value={secondaryBannerForm.button_text_color} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, button_text_color: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ссылка кнопки</label>
                <input type="text" value={secondaryBannerForm.button_link} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, button_link: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-slate-500 mt-1">Оставьте "snil_1" для заявки в СНИЛ или укажите URL ссылку.</p>
              </div>
            </div>
            
            <div className="mt-4">
              <h5 className="font-bold text-slate-500 mb-2 uppercase text-xs tracking-wider">Предпросмотр доп. баннера</h5>
              {secondaryBannerForm.show && (
                <div 
                  className="rounded-3xl p-6 shadow-lg relative overflow-hidden max-w-sm"
                  style={{
                    background: `linear-gradient(to bottom right, ${secondaryBannerForm.bg_gradient_from}, ${secondaryBannerForm.bg_gradient_to})`,
                    color: secondaryBannerForm.text_color
                  }}
                >
                  <div className="relative z-10 space-y-3">
                    <span 
                      className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded"
                      style={{ backgroundColor: secondaryBannerForm.tag_bg, color: secondaryBannerForm.tag_text_color }}
                    >
                      {secondaryBannerForm.tag_text}
                    </span>
                    <h3 className="text-xl font-extrabold leading-tight">{secondaryBannerForm.title}</h3>
                    <p className="text-xs leading-relaxed font-medium opacity-90">
                      {secondaryBannerForm.description}
                    </p>
                    <div className="pt-2">
                      <button 
                        className="px-4 py-2 rounded-xl font-bold text-xs shadow hover:brightness-110 flex items-center space-x-1.5 transition-all"
                        style={{ backgroundColor: secondaryBannerForm.button_bg, color: secondaryBannerForm.button_text_color }}
                      >
                        <span>{secondaryBannerForm.button_text}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveBanner}
            className="mt-6 w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg transition-all"
          >
            Сохранить настройки баннеров
          </button>

          {/* Предпросмотр */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <h4 className="font-bold text-slate-500 mb-4 uppercase text-xs tracking-wider">Предпросмотр</h4>
            <div 
              className="relative rounded-3xl overflow-hidden p-8 sm:p-12 shadow-xl border"
              style={{
                background: `linear-gradient(to right, ${bannerForm.bg_gradient_from}, ${bannerForm.bg_gradient_to})`,
                borderColor: `${bannerForm.accent_color}40` // 40 is hex for 25% opacity
              }}
            >
              <div className="relative z-10 max-w-3xl space-y-4 text-white">
                <div 
                  className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border"
                  style={{ borderColor: bannerForm.accent_color, color: bannerForm.accent_color, backgroundColor: `${bannerForm.accent_color}20` }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{bannerForm.tag_text}</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  {bannerForm.title_main} <span style={{ color: bannerForm.accent_color }} className="underline decoration-amber-400/50">{bannerForm.title_highlight}</span>
                </h1>
                <p className="text-blue-100 text-sm sm:text-base leading-relaxed opacity-90">
                  {bannerForm.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  {bannerForm.button1_text && (
                    <button style={{ backgroundColor: bannerForm.accent_color, color: '#0a2a5e' }} className="px-5 py-2.5 rounded-xl font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all">
                      <span>{bannerForm.button1_text}</span>
                    </button>
                  )}
                  {bannerForm.button2_text && (
                    <button className="px-4 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-400/30 font-semibold flex items-center space-x-2 transition-all text-xs sm:text-sm">
                      <span>{bannerForm.button2_text}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Контент 7: Новости и Анонсы */}
      {activeAdminTab === 'news' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
          <div>
            <h3 className="text-lg font-bold text-[#0a2a5e] mb-4">Добавить новость или анонс</h3>
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Заголовок</label>
                <input type="text" value={newsForm.title} onChange={(e) => setNewsForm({...newsForm, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Укажите броский заголовок новости" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Текст (разрешена разметка)</label>
                <textarea rows={4} value={newsForm.content} onChange={(e) => setNewsForm({...newsForm, content: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Подробный текст новости..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Ссылка на изображение (опционально)</label>
                <input type="text" value={newsForm.image_url} onChange={(e) => setNewsForm({...newsForm, image_url: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_pinned" checked={newsForm.is_pinned} onChange={(e) => setNewsForm({...newsForm, is_pinned: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                <label htmlFor="is_pinned" className="text-sm font-semibold text-slate-700">Закрепить новость (важное)</label>
              </div>
              <button onClick={handleAddNews} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Опубликовать новость</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-[#0a2a5e] mb-4">Управление существующими новостями</h3>
            <div className="space-y-4">
              {db.news.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Новостей пока нет.</p>
              ) : (
                db.news.map(news => (
                  <div key={news.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {news.is_pinned && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Закреп</span>}
                        <h4 className="font-bold text-slate-800">{news.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{news.content}</p>
                      <p className="text-xs text-slate-400">{new Date(news.created_at).toLocaleString('ru-RU')} • Автор: {news.author_name}</p>
                    </div>
                    <button onClick={() => handleDeleteNews(news.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Контент 8: Мероприятия */}
      {activeAdminTab === 'events' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
          <div>
            <h3 className="text-lg font-bold text-[#0a2a5e] mb-4">Добавить новое мероприятие</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Название</label>
                <input type="text" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Тип мероприятия</label>
                <select value={eventForm.type} onChange={(e) => setEventForm({...eventForm, type: e.target.value as any})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="конференция">Конференция</option>
                  <option value="форум">Форум</option>
                  <option value="семинар">Семинар</option>
                  <option value="хакатон">Хакатон</option>
                  <option value="олимпиада">Олимпиада</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Организатор</label>
                <input type="text" value={eventForm.organizer} onChange={(e) => setEventForm({...eventForm, organizer: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="СНО ФЭМ / Деканат" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Место проведения</label>
                <input type="text" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ауд. 410, Корпус 4" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Дата начала</label>
                <input type="date" value={eventForm.start_date} onChange={(e) => setEventForm({...eventForm, start_date: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Дата окончания</label>
                <input type="date" value={eventForm.end_date} onChange={(e) => setEventForm({...eventForm, end_date: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Описание</label>
                <textarea rows={3} value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <button onClick={handleAddEvent} className="mt-6 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-md flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Создать мероприятие</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-[#0a2a5e] mb-4">Управление мероприятиями</h3>
            <div className="space-y-4">
              {db.events.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Мероприятий пока нет.</p>
              ) : (
                db.events.map(event => (
                  <div key={event.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-green-300 transition-colors gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{event.type}</span>
                        <h4 className="font-bold text-slate-800">{event.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500">Организатор: {event.organizer} | Место: {event.location}</p>
                      <p className="text-xs text-slate-400">С {new Date(event.start_date).toLocaleDateString('ru-RU')} по {new Date(event.end_date).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
