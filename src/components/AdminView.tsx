import React, { useState, useEffect } from 'react';
import { PortalDatabase, savePortalDB, getPortalDB, addNotificationAndNotifyTelegram, deleteNews, deleteEvent, saveNewsToFirestore, saveEventToFirestore, deletePublication, savePublicationToFirestore, updateUserRole, getRoleTitle, canAccessAdmin, updateSnilApplicationStatus, savePublicationCertificateToFirestore, triggerCertificateGeneration } from '../services/storage';
import { PublicationCertificateModal } from './PublicationCertificateModal';
import { isInIframe } from '../lib/iframeUtils';
import { CustomUser, Publication, ResearchApplication, ResearchTask, MerchOrder, PublicationCertificate, SnilApplication } from '../types';
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
  Pencil,
  Plus,
  Trash2,
  ShoppingBag,
  PackageCheck,
  CheckCircle,
  Award,
  Printer,
  Search,
  Download
} from 'lucide-react';

interface AdminViewProps {
  db: PortalDatabase;
  user: CustomUser;
  onRefresh: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ db, user, onRefresh }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'pubs' | 'apps' | 'snil_apps' | 'tasks' | 'broadcast' | 'merch' | 'banner' | 'news' | 'events' | 'pub_certs' | 'system'>('pubs');
  const [userSearch, setUserSearch] = useState('');
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [adminViewingPubCert, setAdminViewingPubCert] = useState<PublicationCertificate | null>(null);
  const [iframeWarning, setIframeWarning] = useState(false);
  const [certFilterMonth, setCertFilterMonth] = useState<string>('all');
  const [certFilterYear, setCertFilterYear] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    record_book_id: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    role: 'student' as any,
    group: '',
    faculty: 'ФЭМ',
    department: '',
    password: ''
  });
  
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    confirmText: 'Да'
  });

  const showConfirm = (message: string, onConfirm: () => void, confirmText: string = 'Да') => {
    setConfirmModalState({ isOpen: true, message, onConfirm, confirmText });
  };
  
  useEffect(() => console.log('User role:', user.role), [user]);
  const isCoordinatorOrAdmin = canAccessAdmin(user);
  
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
    bg_gradient_from: '#052e16',
    bg_gradient_via: 'blue-900',
    bg_gradient_to: '#0d3b84',
    accent_color: '#10b981',
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
    bg_gradient_to: '#10b981',
    text_color: '#052e16',
    tag_bg: '#052e16',
    tag_text_color: '#ffffff',
    button_text: 'Подать заявку СНИЛ',
    button_bg: '#052e16',
    button_text_color: '#10b981',
    button_link: 'snil_1'
  };
  const [secondaryBannerForm, setSecondaryBannerForm] = useState(initialSecondaryBanner);

  // Форма новостей
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    is_pinned: false,
    image_url: '',
    attachments: [] as { title: string; url: string }[]
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
  
  const snilApplications = (db.snil_applications || []).filter(app => {
    if (user.role === 'admin' || user.role === 'coordinator') return app.status === 'подана';
    if (user.role === 'snil_head') return app.status === 'подана' && app.snil_id === user.managed_snil_id;
    return false;
  });

  const handleSaveBanner = () => {
    db.feed_banner = { ...bannerForm };
    db.secondary_banner = { ...secondaryBannerForm };
    savePortalDB(db);
    onRefresh();
    alert('Баннеры успешно обновлены');
  };

  const handleApprovePub = async (pub: Publication) => {
    setProcessingIds(prev => new Set(prev).add(pub.id));
    
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: pub.user_record_book,
      title: 'Публикация верифицирована СНО',
      message: `Ваша работа «${pub.title}» верифицирована. Вам начислены рейтинговые баллы!`,
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString()
    });
    
    const db = getPortalDB();
    const pubIdx = db.publications.findIndex(p => p.id === pub.id);
    if (pubIdx !== -1) {
      db.publications[pubIdx].is_confirmed = true;
      savePortalDB(db);
    }

    // Also auto-generate and register the publication certificate so the student immediately receives it
    try {
      await triggerCertificateGeneration(pub.id);
    } catch (err) {
      console.error("Error auto-generating certificate in handleApprovePub:", err);
    }

    try {
      await savePublicationToFirestore({ ...pub, is_confirmed: true });
    } catch (e) {
      console.error(e);
    }
    
    onRefresh();

    setTimeout(() => {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(pub.id);
        return next;
      });
    }, 500);
  };

  const handleRejectPub = async (pubId: string, studentRecord: string, title: string) => {
    setProcessingIds(prev => new Set(prev).add(pubId));
    await deletePublication(pubId);
    onRefresh();
    
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: studentRecord,
      title: 'Публикация отклонена СНО',
      message: `Работа «${title}» отклонена модератором (неверные данные издания или дубликат)`,
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString()
    });

    setTimeout(() => {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(pubId);
        return next;
      });
    }, 500);
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
    savePortalDB(db);
    onRefresh();
  };

  const handleReviewSnilApp = (app: SnilApplication, newStatus: 'принята' | 'отклонена') => {
    updateSnilApplicationStatus(app.id, newStatus);
    
    addNotificationAndNotifyTelegram({
      id: 'notif_' + Date.now(),
      user_record_book: app.student_record_book,
      title: newStatus === 'принята' ? 'Вы приняты в СНИЛ!' : 'Заявка в СНИЛ отклонена',
      message: newStatus === 'принята' 
        ? `Поздравляем! Ваша заявка в «${app.snil_name}» одобрена. Теперь вы участник лаборатории!`
        : `К сожалению, ваша заявка в «${app.snil_name}» была отклонена руководителем.`,
      type: newStatus === 'принята' ? 'success' : 'warning',
      is_read: false,
      created_at: new Date().toISOString()
    });
    
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

    savePortalDB(db);
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

  const handleSaveNews = async () => {
    if (!newsForm.title || !newsForm.content) {
      alert('Заполните обязательные поля');
      return;
    }
    
    if (editingNewsId) {
      const idx = db.news.findIndex(n => n.id === editingNewsId);
      if (idx !== -1) {
        db.news[idx] = {
          ...db.news[idx],
          title: newsForm.title,
          content: newsForm.content,
          is_pinned: newsForm.is_pinned,
          image_url: newsForm.image_url,
          attachments: newsForm.attachments
        };
        savePortalDB(db);
        try {
          await saveNewsToFirestore(db.news[idx]);
        } catch (e) {
          console.error("Failed to sync news to Firestore", e);
        }
        setEditingNewsId(null);
        setNewsForm({ title: '', content: '', is_pinned: false, image_url: '' });
        onRefresh();
        alert('Новость успешно обновлена!');
      }
    } else {
      const newNews = {
        id: 'news_' + Date.now(),
        title: newsForm.title,
        content: newsForm.content,
        author_record_book: user.record_book_id,
        author_name: `${user.last_name} ${user.first_name}`,
        is_pinned: newsForm.is_pinned,
        created_at: new Date().toISOString(),
        image_url: newsForm.image_url,
        attachments: newsForm.attachments,
        published_to_telegram: false
      };
      db.news.push(newNews);
      
      savePortalDB(db);
      try {
        await saveNewsToFirestore(newNews);
      } catch (e) {
        console.error("Failed to sync news to Firestore", e);
      }
      setNewsForm({ title: '', content: '', is_pinned: false, image_url: '', attachments: [] });
      onRefresh();
      alert('Новость успешно добавлена!');
    }
  };

  const handleDeleteNews = async (id: string) => {
    const allowedRoles = ['admin', 'coordinator', 'snil_head'];
    if (!allowedRoles.includes(user.role)) {
      alert('У вас нет прав для удаления новостей.');
      return;
    }

    showConfirm('Удалить новость?', async () => {
      try {
        await deleteNews(id);
        onRefresh();
        alert('Новость успешно удалена!');
      } catch (error) {
        console.error(error);
        alert('Ошибка при удалении новости: ' + (error instanceof Error ? error.message : String(error)));
      }
    }, 'Удалить');
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.start_date || !eventForm.end_date) {
      alert('Заполните обязательные поля');
      return;
    }

    const newEvent = {
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
    };
    db.events.push(newEvent);

    savePortalDB(db);
    try {
      await saveEventToFirestore(newEvent);
    } catch (e) {
      console.error("Failed to sync event to Firestore", e);
    }
    setEventForm({
      title: '', type: 'конференция', description: '', organizer: '', start_date: '', end_date: '', registration_deadline: '', location: '', max_participants: 100
    });
    onRefresh();
    alert('Мероприятие успешно добавлено!');
  };

  const handleDeleteEvent = async (id: string) => {
    const allowedRoles = ['admin', 'coordinator', 'snil_head'];
    if (!allowedRoles.includes(user.role)) {
      alert('У вас нет прав для удаления мероприятий.');
      return;
    }

    showConfirm('Удалить мероприятие?', async () => {
      try {
        await deleteEvent(id);
        onRefresh();
        alert('Мероприятие успешно удалено!');
      } catch (error) {
        console.error(error);
        alert('Ошибка при удалении мероприятия: ' + (error instanceof Error ? error.message : String(error)));
      }
    }, 'Удалить');
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Баннер панели управления */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-[#052e16] rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-green-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-green-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Shield className="w-4 h-4" />
            <span>Деканат / Совет СНО ФЭМ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Панель администратора науки</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed opacity-90">
            Верификация электронных портфолио, модерация тезисов докладов, управление поручениями СНИЛ и общефакультетские оповещения.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 font-mono text-xs text-center w-full md:w-auto">
          <p className="text-emerald-300 font-bold">Ваша роль: {user.role.toUpperCase()}</p>
          <p className="text-[11px] text-slate-300 mt-1">Доступ к реестрам ФЭМ открыт</p>
        </div>
      </div>

      {/* Вкладки админки */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveAdminTab('pubs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'pubs' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Модерация публикаций</span>
          <span className="px-1.5 py-0.2 rounded bg-green-100 text-green-800 font-mono">{pendingPubs.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('apps')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'apps' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Заявки на доклады</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-100/50 text-amber-800 font-mono">{pendingApps.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('snil_apps')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'snil_apps' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Users className="w-4 h-4" />
          <span>Заявки в СНИЛ</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">{snilApplications.length}</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('tasks')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'tasks' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Назначить задачу СНИЛ</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('broadcast')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'broadcast' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Bell className="w-4 h-4" />
          <span>Факультетская рассылка</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('merch')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'merch' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Заказы сувениров</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">
            {db.orders.filter(o => o.status === 'pending').length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('banner')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'banner' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Главный баннер</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('news')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'news' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Новости и Анонсы</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('events')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'events' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Мероприятия</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('pub_certs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'pub_certs' ? 'bg-[#052e16] text-[#10b981]' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Award className="w-4 h-4" />
          <span>Справки (Труды)</span>
        </button>

        {(user.role === 'admin' || user.role === 'coordinator' || user.group === 'Система' || user.group === 'ADMIN-ROOT') && (
          <button
            onClick={() => setActiveAdminTab('system')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${activeAdminTab === 'system' ? 'bg-green-900 text-white' : 'hover:bg-slate-100 text-green-600'}`}
          >
            <Shield className="w-4 h-4" />
            <span>Система и Роли</span>
          </button>
        )}
      </div>

      {/* Контент 1: Модерация работ */}
      {activeAdminTab === 'pubs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#052e16]">Очередь верификации статей и тезисов студентов</h3>
          {pendingPubs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p>Очередь пуста. Все публикации студентов проверены!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPubs.filter(pb => !processingIds.has(pb.id)).map(pb => {
                const authorUser = db.users.find(u => u.record_book_id === pb.user_record_book);
                return (
                  <div key={pb.id} className="p-5 rounded-2xl border border-emerald-200 bg-blue-50/50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 font-mono text-xs">
                        <span className="bg-[#052e16] text-[#10b981] px-2 py-0.5 rounded font-bold">Студент: {authorUser ? `${authorUser.last_name} ${authorUser.first_name}` : pb.user_record_book}</span>
                        <span className="text-slate-500">Зачётка № {pb.user_record_book}</span>
                      </div>
                      <h4 className="font-extrabold text-base text-[#052e16] mt-1">{pb.title} ({pb.type}, {pb.year} г.)</h4>
                      <p className="text-xs text-slate-700">Издание / Журнал: <strong>{pb.journal}</strong></p>
                      {pb.supervisor_name && (
                        <p className="text-xs text-slate-600">
                          🎓 Научный руководитель: <strong>{pb.supervisor_name}</strong> {pb.supervisor_position && `(${pb.supervisor_position})`}
                        </p>
                      )}
                      {pb.link && <a href={pb.link} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs font-mono inline-block mt-1">Ссылка на публикацию в репозитории →</a>}
                    </div>

                    <div className="flex space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => showConfirm(`Вы действительно хотите подтвердить и верифицировать публикацию «${pb.title}»? Студенту будут начислены рейтинговые баллы.`, () => handleApprovePub(pb), 'Подтвердить')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" /> <span>Подтвердить</span>
                      </button>
                      <button
                        onClick={() => showConfirm(`Вы действительно хотите отклонить и удалить публикацию «${pb.title}»?`, () => handleRejectPub(pb.id, pb.user_record_book, pb.title), 'Отклонить')}
                        className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-bold text-xs rounded-xl flex items-center space-x-1"
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
          <h3 className="text-lg font-bold text-[#052e16]">Заявки студентов на выступления в конференциях</h3>
          {pendingApps.length === 0 ? (
            <p className="text-slate-400 py-8 text-center">Новых необработанных заявок нет.</p>
          ) : (
            <div className="space-y-3">
              {pendingApps.map(ap => (
                <div key={ap.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Событие: {ap.event_title}</span>
                    <h4 className="font-extrabold text-base text-[#052e16] mt-0.5">Доклад: «{ap.topic}»</h4>
                    <p className="text-xs text-slate-600 mt-1 font-mono">Студент: <strong>{ap.student_name}</strong> (Зачётка № {ap.student_record_book})</p>
                  </div>

                  <div className="flex space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleReviewApp(ap, 'принята')}
                      className="px-4 py-2 bg-emerald-900 text-[#10b981] font-bold text-xs rounded-xl shadow hover:bg-emerald-800"
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

      {/* Контент 2.1: Заявки в СНИЛ */}
      {activeAdminTab === 'snil_apps' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#052e16]">Заявки на вступление в научные лаборатории (СНИЛ)</h3>
          {snilApplications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p>Новых заявок на вступление в СНИЛ нет.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snilApplications.map(ap => {
                const student = db.users.find(u => u.record_book_id === ap.student_record_book);
                return (
                  <div key={ap.id} className="p-5 rounded-2xl border border-emerald-200 bg-blue-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <UserAvatar user={student || { first_name: '?', last_name: 'Студент' }} size="md" />
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Лаборатория: {ap.snil_name}</span>
                        <h4 className="font-extrabold text-base text-[#052e16]">
                          {student ? `${student.last_name} ${student.first_name}` : ap.student_record_book}
                        </h4>
                        <div className="flex items-center space-x-3 mt-0.5">
                          <span className="text-xs text-slate-500 font-mono">Зачётка: {ap.student_record_book}</span>
                          {student && <span className="text-xs text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-100">{student.group}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleReviewSnilApp(ap, 'принята')}
                        className="px-5 py-2.5 bg-green-600 text-white font-black text-xs rounded-xl shadow-md hover:bg-green-700 flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Принять в СНИЛ</span>
                      </button>
                      <button
                        onClick={() => handleReviewSnilApp(ap, 'отклонена')}
                        className="px-5 py-2.5 bg-white text-green-600 border border-green-100 font-black text-xs rounded-xl hover:bg-red-50"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Контент 3: Назначение поручений СНИЛ */}
      {activeAdminTab === 'tasks' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
          <h3 className="text-lg font-bold text-[#052e16] mb-2">Назначение исследовательской задачи студенту</h3>
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
                  {db.snils.map(snil => (
                    <option key={snil.id} value={snil.name}>{snil.name}</option>
                  ))}
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

            <button type="submit" className="w-full py-3.5 bg-[#052e16] text-[#10b981] font-extrabold text-sm rounded-xl shadow-lg hover:brightness-110">
              Выдать поручение исследователю
            </button>
          </form>
        </div>
      )}

      {/* Контент 4: Общефакультетская рассылка */}
      {activeAdminTab === 'broadcast' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
          <h3 className="text-lg font-bold text-[#052e16] mb-2 flex items-center space-x-2">
            <Send className="w-5 h-5 text-[#10b981]" />
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

            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-red-800 to-[#052e16] text-white font-extrabold text-sm rounded-xl shadow-lg hover:brightness-110 flex items-center justify-center space-x-2">
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
            <h3 className="text-lg font-bold text-[#052e16]">Реестр заказов сувенирной продукции СНО</h3>
            <div className="flex items-center space-x-4 text-xs font-bold text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                <span>Новые: {db.orders.filter(o => o.status === 'pending').length}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
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
                      <div className="font-medium text-[#052e16]">{order.itemName}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">{order.points} баллов</div>
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'pending' && <span className="text-emerald-600 font-bold bg-blue-50/50 px-2 py-1 rounded text-[10px] uppercase">Ожидает</span>}
                      {order.status === 'ready' && <span className="text-emerald-600 font-bold bg-blue-50 px-2 py-1 rounded text-[10px] uppercase">Готов</span>}
                      {order.status === 'received' && <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-[10px] uppercase">Получен</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order, 'ready')}
                            className="p-2 text-emerald-600 hover:bg-blue-50 rounded-lg transition-colors"
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
          <h3 className="text-lg font-bold text-[#052e16]">Настройки главного баннера</h3>
          
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
              <input type="checkbox" id="show_secondary_banner" checked={secondaryBannerForm.show} onChange={(e) => setSecondaryBannerForm({...secondaryBannerForm, show: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-slate-300" />
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
                <p className="text-emerald-100 text-sm sm:text-base leading-relaxed opacity-90">
                  {bannerForm.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  {bannerForm.button1_text && (
                    <button style={{ backgroundColor: bannerForm.accent_color, color: '#052e16' }} className="px-5 py-2.5 rounded-xl font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all">
                      <span>{bannerForm.button1_text}</span>
                    </button>
                  )}
                  {bannerForm.button2_text && (
                    <button className="px-4 py-2.5 rounded-xl bg-blue-950/80 hover:bg-emerald-900 border border-emerald-400/30 font-semibold flex items-center space-x-2 transition-all text-xs sm:text-sm">
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
            <h3 className="text-lg font-bold text-[#052e16] mb-4">Добавить новость или анонс</h3>
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
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Вложения (ссылки)</label>
                {newsForm.attachments?.map((att, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Название" value={att.title} onChange={(e) => { const atts = [...newsForm.attachments]; atts[idx].title = e.target.value; setNewsForm({...newsForm, attachments: atts}); }} className="w-1/2 p-2 rounded-lg border border-slate-200 text-sm" />
                    <input type="text" placeholder="URL" value={att.url} onChange={(e) => { const atts = [...newsForm.attachments]; atts[idx].url = e.target.value; setNewsForm({...newsForm, attachments: atts}); }} className="w-1/2 p-2 rounded-lg border border-slate-200 text-sm" />
                    <button onClick={() => { const atts = newsForm.attachments.filter((_, i) => i !== idx); setNewsForm({...newsForm, attachments: atts}); }} className="text-green-500 hover:text-green-700">Удалить</button>
                  </div>
                ))}
                <button onClick={() => setNewsForm({...newsForm, attachments: [...newsForm.attachments, {title: '', url: ''}]})} className="text-emerald-600 hover:text-emerald-800 text-sm font-bold">+ Добавить вложение</button>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_pinned" checked={newsForm.is_pinned} onChange={(e) => setNewsForm({...newsForm, is_pinned: e.target.checked})} className="w-4 h-4 text-emerald-600 rounded border-slate-300" />
                <label htmlFor="is_pinned" className="text-sm font-semibold text-slate-700">Закрепить новость (важное)</label>
              </div>
              <button onClick={handleSaveNews} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>{editingNewsId ? 'Сохранить изменения' : 'Опубликовать новость'}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-[#052e16] mb-4">Управление существующими новостями</h3>
            <div className="space-y-4">
              {db.news.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Новостей пока нет.</p>
              ) : (
                db.news.map(news => (
                  <div key={news.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-emerald-300 transition-colors gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {news.is_pinned && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Закреп</span>}
                        <h4 className="font-bold text-slate-800">{news.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{news.content}</p>
                      <p className="text-xs text-slate-400">{new Date(news.created_at).toLocaleString('ru-RU')} • Автор: {news.author_name}</p>
                    </div>
                    <button onClick={() => { setEditingNewsId(news.id); setNewsForm({title: news.title, content: news.content, is_pinned: news.is_pinned, image_url: news.image_url || '', attachments: news.attachments || []}); }} className="p-2 text-emerald-500 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteNews(news.id)} className="p-2 text-green-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
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
            <h3 className="text-lg font-bold text-[#052e16] mb-4">Добавить новое мероприятие</h3>
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
            <h3 className="text-lg font-bold text-[#052e16] mb-4">Управление мероприятиями</h3>
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
                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-green-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeAdminTab === 'pub_certs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-black text-[#052e16]">Журнал справок</h3>
              <p className="text-sm text-slate-500 mt-1">Реестр выданных справок о наличии научных публикаций</p>
            </div>
            
            <div className="flex items-center space-x-3 print:hidden">
              <select 
                value={certFilterMonth}
                onChange={e => setCertFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
              >
                <option value="all">Все месяцы</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i.toString()}>{new Date(2000, i).toLocaleString('ru-RU', { month: 'long' })}</option>
                ))}
              </select>
              <select 
                value={certFilterYear}
                onChange={e => setCertFilterYear(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
              >
                <option value="all">Все годы</option>
                {Array.from(new Set((db.publication_certificates || []).map(c => new Date(c.issue_date).getFullYear()))).map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const filteredCerts = (db.publication_certificates || [])
                    .filter(cert => {
                      const d = new Date(cert.issue_date);
                      if (certFilterMonth !== 'all' && d.getMonth().toString() !== certFilterMonth) return false;
                      if (certFilterYear !== 'all' && d.getFullYear().toString() !== certFilterYear) return false;
                      return true;
                    });
                  
                  const headers = ['Номер', 'Дата', 'Студент', 'Зачетка', 'Публикация', 'Журнал', 'Год'];
                  const csvContent = [
                    headers.join(','),
                    ...filteredCerts.map(c => [
                      c.number,
                      new Date(c.issue_date).toLocaleDateString('ru-RU'),
                      `"${c.user_name}"`,
                      c.user_record_book,
                      `"${c.publication_title}"`,
                      `"${c.publication_journal}"`,
                      c.publication_year
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.setAttribute('download', `certificates_report_${certFilterMonth}_${certFilterYear}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-emerald-700 flex items-center justify-center space-x-2 transition-colors"
                title="Экспорт в CSV для Excel"
              >
                <Download className="w-4 h-4" />
                <span>Экспорт CSV</span>
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-700 flex items-center justify-center space-x-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Распечатать журнал</span>
              </button>
            </div>
          </div>

          {iframeWarning && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-amber-800 dark:text-amber-400 text-sm print:hidden">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Ограничения предпросмотра</span>
              </div>
              <p>
                В режиме предпросмотра скачивание и печать могут быть заблокированы. 
                Пожалуйста, откройте приложение в новой вкладке браузера (кнопка в правом верхнем углу окна), чтобы распечатать журнал.
              </p>
            </div>
          )}

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">№ Справки</th>
                  <th className="px-4 py-3">Дата выдачи</th>
                  <th className="px-4 py-3">Студент</th>
                  <th className="px-4 py-3">Зачетная книжка</th>
                  <th className="px-4 py-3">Публикация</th>
                  <th className="px-4 py-3 text-right print:hidden">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(db.publication_certificates || [])
                  .filter(cert => {
                    const d = new Date(cert.issue_date);
                    if (certFilterMonth !== 'all' && d.getMonth().toString() !== certFilterMonth) return false;
                    if (certFilterYear !== 'all' && d.getFullYear().toString() !== certFilterYear) return false;
                    return true;
                  })
                  .map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-[#052e16]">{cert.number}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{new Date(cert.issue_date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-4 font-medium text-slate-800">{cert.user_name}</td>
                    <td className="px-4 py-4 font-mono text-xs">{cert.user_record_book}</td>
                    <td className="px-4 py-4 max-w-xs truncate" title={cert.publication_title}>{cert.publication_title}</td>
                    <td className="px-4 py-4 text-right print:hidden">
                      <button
                        onClick={() => setAdminViewingPubCert(cert)}
                        className="p-2 text-emerald-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Просмотр и печать справки"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!db.publication_certificates || db.publication_certificates.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                      Журнал пуст. Выданных справок пока нет.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения */}
      {confirmModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Подтверждение</h3>
            <p className="text-slate-600 mb-6">{confirmModalState.message}</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  confirmModalState.onConfirm();
                  setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
              >
                {confirmModalState.confirmText || 'Да'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'system' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-green-600" />
                  <span>Управление ролями и доступом</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Просмотр всех зарегистрированных пользователей и назначение административных полномочий.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск по ФИО или № зачётки..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16] dark:focus:ring-[#10b981] w-full md:w-64 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 bg-[#052e16] dark:bg-[#10b981] text-white dark:text-slate-900 rounded-xl text-sm font-bold flex items-center space-x-2 hover:opacity-90 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="px-4 py-4">Пользователь</th>
                    <th className="px-4 py-4">№ Зачётки</th>
                    <th className="px-4 py-4">Группа</th>
                    <th className="px-4 py-4">Роль в системе</th>
                    <th className="px-4 py-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {db.users.filter(u => 
                    `${u.last_name} ${u.first_name}`.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.record_book_id.toLowerCase().includes(userSearch.toLowerCase())
                  ).sort((a, b) => {
                    const roleOrder = { 'admin': 0, 'coordinator': 1, 'snil_head': 2, 'activist': 3, 'student': 4 };
                    return (roleOrder[a.role as keyof typeof roleOrder] || 99) - (roleOrder[b.role as keyof typeof roleOrder] || 99);
                  }).map(u => (
                    <tr key={u.record_book_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar user={u} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{u.last_name} {u.first_name}</p>
                            <p className="text-[10px] text-slate-500">{u.faculty}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-bold text-[#052e16] dark:text-emerald-400">{u.record_book_id}</td>
                      <td className="px-4 py-4 text-xs font-medium">{u.group}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                          u.role === 'admin' ? 'bg-green-600 text-white shadow-red-200' :
                          u.role === 'coordinator' ? 'bg-emerald-600 text-[#052e16] shadow-amber-200' :
                          u.role === 'snil_head' ? 'bg-purple-600 text-white shadow-purple-200' :
                          u.role === 'activist' ? 'bg-teal-600 text-white shadow-teal-200' :
                          'bg-emerald-600 text-white shadow-blue-200'
                        }`}>
                          {getRoleTitle(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <select
                            value={u.role}
                            onChange={(e) => {
                              if (confirm(`Вы уверены, что хотите изменить роль пользователя ${u.last_name} на ${e.target.value}?`)) {
                                updateUserRole(u.record_book_id, e.target.value as any);
                                onRefresh();
                              }
                            }}
                            className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="student">Студент-исследователь</option>
                            <option value="activist">Активист СНО ФЭМ</option>
                            <option value="snil_head">Руководитель СНИЛ</option>
                            <option value="coordinator">Координатор ФЭМ</option>
                            <option value="admin">Администратор сайта</option>
                          </select>
                          {u.record_book_id !== '00000001' && (
                            <button
                              onClick={() => {
                                if (confirm(`Вы уверены, что хотите полностью удалить пользователя ${u.last_name} ${u.first_name}?`)) {
                                  const storageDb = getPortalDB();
                                  storageDb.users = storageDb.users.filter(x => x.record_book_id !== u.record_book_id);
                                  savePortalDB(storageDb);
                                  onRefresh();
                                }
                              }}
                              className="p-1 text-green-600 hover:text-green-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {adminViewingPubCert && (
        <PublicationCertificateModal
          certificate={adminViewingPubCert}
          publication={db.publications.find(p => p.id === adminViewingPubCert.publication_id) || null}
          user={db.users.find(u => u.record_book_id === adminViewingPubCert.user_record_book) || null}
          onClose={() => setAdminViewingPubCert(null)}
          onGenerate={(pubId, gender) => {
            // Admin doesn't typically generate, but we provide the signature to avoid TS errors
            console.log("Admin clicked generate for", pubId, gender);
          }}
        />
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-slate-800 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Добавление нового пользователя</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Номер зачётки / Студ. билета *</label>
                <input
                  type="text"
                  required
                  placeholder="Например, 2301042"
                  value={newUserForm.record_book_id}
                  onChange={(e) => setNewUserForm({ ...newUserForm, record_book_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Фамилия *</label>
                  <input
                    type="text"
                    required
                    placeholder="Иванов"
                    value={newUserForm.last_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Имя *</label>
                  <input
                    type="text"
                    required
                    placeholder="Иван"
                    value={newUserForm.first_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Отчество (при наличии)</label>
                <input
                  type="text"
                  placeholder="Иванович"
                  value={newUserForm.middle_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, middle_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Роль в системе *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16] text-slate-800 dark:text-white font-medium"
                  >
                    <option value="student">Студент-исследователь</option>
                    <option value="activist">Активист СНО ФЭМ</option>
                    <option value="snil_head">Руководитель СНИЛ</option>
                    <option value="coordinator">Координатор ФЭМ</option>
                    <option value="admin">Администратор сайта</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Учебная группа</label>
                  <input
                    type="text"
                    placeholder="Например, 23ДКС-1"
                    value={newUserForm.group}
                    onChange={(e) => setNewUserForm({ ...newUserForm, group: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Кафедра / Структурное подразделение</label>
                <input
                  type="text"
                  placeholder="Кафедра экономики промышленных предприятий"
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Пароль для входа *</label>
                <input
                  type="password"
                  required
                  placeholder="Минимум 4 символа"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#052e16]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserForm({
                    record_book_id: '',
                    last_name: '',
                    first_name: '',
                    middle_name: '',
                    role: 'student',
                    group: '',
                    faculty: 'ФЭМ',
                    department: '',
                    password: ''
                  });
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const { record_book_id, last_name, first_name, password } = newUserForm;
                  if (!record_book_id.trim() || !last_name.trim() || !first_name.trim() || !password.trim()) {
                    alert('Заполните все обязательные поля (*)');
                    return;
                  }
                  if (db.users.some(u => u.record_book_id === record_book_id.trim())) {
                    alert('Пользователь с таким номером зачётки уже зарегистрирован!');
                    return;
                  }

                  const newUserObj: CustomUser = {
                    record_book_id: record_book_id.trim(),
                    last_name: last_name.trim(),
                    first_name: first_name.trim(),
                    middle_name: newUserForm.middle_name.trim() || undefined,
                    role: newUserForm.role,
                    group: newUserForm.group.trim() || 'Система',
                    course: 4,
                    faculty: newUserForm.faculty.trim() || 'ФЭМ',
                    department: newUserForm.department.trim() || 'Деканат',
                    scientific_interests: [],
                    created_at: new Date().toISOString(),
                    password: password.trim()
                  };

                  const storageDb = getPortalDB();
                  storageDb.users.push(newUserObj);
                  savePortalDB(storageDb);

                  onRefresh();
                  setShowAddUserModal(false);
                  setNewUserForm({
                    record_book_id: '',
                    last_name: '',
                    first_name: '',
                    middle_name: '',
                    role: 'student',
                    group: '',
                    faculty: 'ФЭМ',
                    department: '',
                    password: ''
                  });
                }}
                className="px-4 py-2 bg-[#052e16] dark:bg-[#10b981] text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print, nav, aside, header, footer, button, .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .bg-white, .bg-slate-50 {
            background-color: white !important;
          }
          .shadow-sm, .shadow-xl, .shadow-2xl {
            box-shadow: none !important;
          }
          .rounded-3xl, .rounded-2xl, .rounded-xl {
            border-radius: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}} />
    </div>
  );
};
