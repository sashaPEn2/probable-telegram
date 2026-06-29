import {
  CustomUser,
  Publication,
  Certificate,
  ResearchProject,
  ResearcherPortfolio,
  SNIL,
  ScientificEvent,
  ResearchApplication,
  SNONews,
  ResearchTask,
  GalleryItem,
  Notification,
  NIRSReport,
  UserRole
} from '../types';

const STORAGE_KEY = 'fem_bseu_portal_db_v1';
const CURRENT_USER_KEY = 'fem_bseu_current_user_v1';

export interface PortalDatabase {
  users: CustomUser[];
  publications: Publication[];
  certificates: Certificate[];
  projects: ResearchProject[];
  snils: SNIL[];
  events: ScientificEvent[];
  applications: ResearchApplication[];
  news: SNONews[];
  tasks: ResearchTask[];
  gallery: GalleryItem[];
  notifications: Notification[];
  reports: NIRSReport[];
  merch_orders: MerchOrder[];
}

const INITIAL_DB: PortalDatabase = {
  users: [],
  publications: [],
  certificates: [],
  projects: [],
  snils: [],
  events: [],
  applications: [],
  news: [],
  tasks: [],
  gallery: [],
  notifications: [],
  reports: [],
  merch_orders: []
};

export const MERCH_ITEMS: MerchItem[] = [
  { id: 'm1', name: 'Пластиковая ручка СНО', price: 50, image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=60', description: 'Классическая синяя ручка с логотипом СНО ФЭМ.' },
  { id: 'm2', name: 'Металлическая ручка Premium', price: 150, image_url: 'https://images.unsplash.com/photo-1562240020-ce31ccb0fa7d?w=400&auto=format&fit=crop&q=60', description: 'Тяжелая металлическая ручка в подарочном футляре.' },
  { id: 'm3', name: 'Брелок «День бел науки»', price: 80, image_url: 'https://images.unsplash.com/photo-1619115171439-06c15c81aa8c?w=400&auto=format&fit=crop&q=60', description: 'Лимитированная серия ко Дню белорусской науки.' },
  { id: 'm4', name: 'Брелок СНО стандартный', price: 60, image_url: 'https://images.unsplash.com/photo-1582142839970-2b9e04b60f65?w=400&auto=format&fit=crop&q=60', description: 'Фирменный брелок с гербом факультета.' }
];

export const DEPARTMENTS = [
  'Кафедра экономики и управления предприятиями',
  'Кафедра менеджмента',
  'Кафедра национальной экономики и государственного управления',
  'Кафедра экономической теории',
  'Кафедра экономики труда и бизнес-администрирования'
];

export const GROUPS = ['ДЭУ-1', 'ДЭУ-2', 'ДЭУ-3', 'ДГХ-1', 'ДГХ-2', 'ДМН-1', 'ДМН-2', 'ДМК-1', 'ДЭТ-1'];

export function getPortalDB(): PortalDatabase {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    seedFacultyStarterTemplate();
    const seeded = localStorage.getItem(STORAGE_KEY);
    return seeded ? JSON.parse(seeded) : INITIAL_DB;
  }
  try {
    const db = JSON.parse(data);
    // Если база есть, но пустая (например после очистки кэша), тоже сидим
    if (db.news.length === 0 && db.events.length === 0) {
      seedFacultyStarterTemplate();
      const reseeded = localStorage.getItem(STORAGE_KEY);
      return reseeded ? JSON.parse(reseeded) : INITIAL_DB;
    }
    return db;
  } catch {
    return INITIAL_DB;
  }
}

export function savePortalDB(db: PortalDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function getCurrentUser(): CustomUser | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CustomUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Аутентификация по номеру зачётки + Фамилия + Имя
export function loginUser(recordBook: string, lastName: string, firstName: string, group: string = 'ДЭУ-1'): CustomUser {
  const db = getPortalDB();
  const trimmedId = recordBook.trim();
  const trimmedLast = lastName.trim();
  const trimmedFirst = firstName.trim();

  let user = db.users.find(u => u.record_book_id.toLowerCase() === trimmedId.toLowerCase());

  if (!user) {
    // Если пользователя нет в базе — регистрируем как Студента-исследователя
    // Если в базе вообще нет пользователей, первый вошедший может стать Админом
    const isFirstUserInSystem = db.users.length <= 1; // Учитываем координатора из сида
    
    user = {
      record_book_id: trimmedId,
      last_name: trimmedLast,
      first_name: trimmedFirst,
      role: isFirstUserInSystem ? 'admin' : 'student',
      group: group,
      course: 2,
      department: DEPARTMENTS[0],
      scientific_interests: ['Экономика знаний', 'Цифровые инновации', 'Финансовый менеджмент'],
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    
    // Создаем приветственное уведомление
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_record_book: user.record_book_id,
      title: 'Добро пожаловать в Цифровой портал ФЭМ!',
      message: `Вы зарегистрированы в системе с ролью «${getRoleTitle(user.role)}». Заполните научное портфолио!`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    savePortalDB(db);
  } else {
    // Обновляем ФИО на случай опечатки ранее
    user.last_name = trimmedLast;
    user.first_name = trimmedFirst;
    savePortalDB(db);
  }

  setCurrentUser(user);
  return user;
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function getRoleTitle(role: UserRole): string {
  switch (role) {
    case 'student': return 'Студент-исследователь';
    case 'activist': return 'Активист СНО ФЭМ';
    case 'snil_head': return 'Руководитель СНИЛ';
    case 'coordinator': return 'Координатор науки факультета';
    case 'admin': return 'Администратор системы';
  }
}

export function updateUserRole(recordBook: string, newRole: UserRole): boolean {
  const db = getPortalDB();
  const user = db.users.find(u => u.record_book_id === recordBook);
  if (!user) return false;
  user.role = newRole;
  savePortalDB(db);
  
  // Обновляем текущую сессию если это мы
  const current = getCurrentUser();
  if (current && current.record_book_id === recordBook) {
    current.role = newRole;
    setCurrentUser(current);
  }
  return true;
}

// Вычисление рейтинга и индекса Хирша
export function calculateResearcherStats(recordBook: string): {
  hIndex: number;
  totalPubs: number;
  totalReports: number;
  conferencesCount: number;
  ratingPoints: number;
} {
  const db = getPortalDB();
  const pubs = db.publications.filter(p => p.user_record_book === recordBook && p.is_confirmed);
  const apps = db.applications.filter(a => a.student_record_book === recordBook && (a.status === 'принята' || a.status === 'на_рассмотрении'));
  const certs = db.certificates.filter(c => c.user_record_book === recordBook);

  const totalPubs = pubs.length;
  const totalReports = apps.length;
  const conferencesCount = new Set(apps.map(a => a.event_id)).size;

  // Простой расчет индекса Хирша (симуляция по количеству статей)
  let hIndex = 0;
  if (totalPubs >= 4) hIndex = 3;
  else if (totalPubs >= 2) hIndex = 2;
  else if (totalPubs >= 1) hIndex = 1;

  // Баллы рейтинга ФЭМ БГЭУ
  // Статья = 15 баллов, Тезисы = 8 баллов, Доклад = 10 баллов, Диплом 1 степени = 30 баллов
  let points = 0;
  pubs.forEach(p => {
    if (p.type === 'статья') points += 15;
    else if (p.type === 'монография') points += 40;
    else if (p.type === 'учебное_пособие') points += 25;
    else points += 8; // тезисы
  });
  points += totalReports * 10;
  certs.forEach(c => {
    if (c.type === 'диплом_1_степени') points += 30;
    else if (c.type === 'диплом_2_степени') points += 20;
    else if (c.type === 'диплом_3_степени') points += 15;
    else points += 5;
  });

  return { hIndex, totalPubs, totalReports, conferencesCount, ratingPoints: points };
}

// Генерация стартового шаблона ФЭМ (по запросу администратора, чтобы не было пустой базы при первом просмотре)
export function seedFacultyStarterTemplate(): void {
  const data = localStorage.getItem(STORAGE_KEY);
  let db: PortalDatabase;
  try {
    db = data ? JSON.parse(data) : { ...INITIAL_DB };
  } catch {
    db = { ...INITIAL_DB };
  }
  
  if (db.news && db.news.length > 0) return; // Уже есть данные

  // Инициализируем массивы если они undefined
  db.users = db.users || [];
  db.news = db.news || [];
  db.events = db.events || [];
  db.snils = db.snils || [];
  db.gallery = db.gallery || [];
  db.notifications = db.notifications || [];
  db.publications = db.publications || [];
  db.applications = db.applications || [];
  db.tasks = db.tasks || [];
  db.certificates = db.certificates || [];
  db.projects = db.projects || [];
  db.reports = db.reports || [];

  const adminUser = getCurrentUser() || {
    record_book_id: '99900011',
    last_name: 'Координатор',
    first_name: 'ФЭМ',
    role: 'coordinator',
    group: 'Сотрудник',
    course: 4,
    department: DEPARTMENTS[0],
    scientific_interests: ['Организация науки'],
    created_at: new Date().toISOString()
  };

  if (!db.users.some(u => u.record_book_id === adminUser.record_book_id)) {
    db.users.push(adminUser as CustomUser);
  }

  // Новость СНО
  db.news.push({
    id: 'news_1',
    title: 'Ежегодная Декада студенческой науки БГЭУ стартует в марте!',
    content: 'Студенческое научное общество ФЭМ приглашает всех студентов-исследователей принять участие в секциях Декады студенческой науки. Победители получат возможность публикации в сборнике БГЭУ с индексацией в РИНЦ.',
    author_record_book: adminUser.record_book_id,
    author_name: 'СНО ФЭМ Деканат',
    is_pinned: true,
    created_at: new Date().toISOString(),
    published_to_telegram: true,
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'
  });

  // Научное мероприятие
  db.events.push({
    id: 'ev_1',
    title: 'Международная конференция «Экономика и управление в XXI веке»',
    type: 'конференция',
    description: 'Пленарное заседание и работа секций по направлениям цифровизации экономики, менеджмента инноваций и устойчивого развития.',
    organizer: 'Деканат ФЭМ и СНО ФЭМ',
    start_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
    registration_deadline: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    location: 'Корпус №4, ауд. 310 / Онлайн',
    is_active: true,
    max_participants: 120,
    participant_record_books: [],
    materials_links: [
      { title: 'Требования к оформлению тезисов (DOCX)', url: '#' },
      { title: 'Информационное письмо БГЭУ (PDF)', url: '#' }
    ],
    created_at: new Date().toISOString()
  });

  // Лаборатория СНИЛ
  db.snils.push({
    id: 'snil_1',
    name: 'СНИЛ «Цифровая экономика и бизнес-аналитика»',
    head_record_book: adminUser.record_book_id,
    head_name: 'доц. Петров А.В.',
    department: 'Кафедра экономики и управления предприятиями',
    description: 'Исследование больших данных, моделирование бизнес-процессов предприятий Республики Беларусь, внедрение искусственного интеллекта в экономику.',
    research_directions: ['Big Data в экономике', 'Интеллектуальные системы управления', 'Цифровая трансформация предприятий'],
    member_record_books: [adminUser.record_book_id],
    is_active: true,
    created_at: new Date().toISOString(),
    achievements: ['Победитель конкурса «Лучшая СНИЛ БГЭУ 2024»', '3 гранта Министерства образования РБ'],
    is_best_snil_nominee: true
  });

  // Галерея
  db.gallery.push({
    id: 'gal_1',
    title: 'Открытие Научной гостиной ФЭМ',
    event_name: 'Встреча с экспертами Парка высоких технологий',
    date: new Date().toISOString().split('T')[0],
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
    uploader_name: 'СНО ФЭМ Медиа',
    type: 'photo'
  });

  savePortalDB(db);
}

// Генерация файла .ics для календаря
export function generateIcsCalendar(event: ScientificEvent): void {
  const startDateFormatted = event.start_date.replace(/-/g, '') + 'T090000Z';
  const endDateFormatted = event.end_date.replace(/-/g, '') + 'T170000Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FEM BSEU Scientific Portal//RU',
    'BEGIN:VEVENT',
    `UID:event_${event.id}_${Date.now()}@snofembseu.by`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startDateFormatted}`,
    `DTEND:${endDateFormatted}`,
    `SUMMARY:${event.title} [БГЭУ ФЭМ]`,
    `DESCRIPTION:${event.description}\\nОрганизатор: ${event.organizer}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `event_${event.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
