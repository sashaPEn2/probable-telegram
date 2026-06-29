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
  UserRole,
  MerchItem,
  MerchOrder,
  Announcement,
  SnilApplication
} from '../types';

const STORAGE_KEY = 'fem_bseu_portal_db_v1';

async function notifyTelegram(record_book_id: string, title: string, message: string, type: Notification['type']): Promise<void> {
  try {
    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_book_id, title, message, type })
    });
  } catch {
    // Silent fail for client-only environments / local dev
  }
}

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
  merch: MerchItem[];
  orders: MerchOrder[];
  announcements: Announcement[];
  snil_applications: SnilApplication[];
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
  merch: [],
  orders: [],
  announcements: [],
  snil_applications: []
};

export const DEPARTMENTS = [
  'Кафедра экономики промышленных предприятий',
  'Кафедра национальной экономики и государственного управления',
  'Кафедра организации и управления',
  'Кафедра экономики АПК и природопользования'
];

export const FACULTIES = ['ФЭМ'];

export const GROUPS_BY_COURSE: Record<number, string[]> = {
  1: [
    '26 DKKS 1', '26 DKKS 2', '26 DKP 1', '26 DKP 2', '26 DK E', '26 DK T', 
    '26 DKH 1', '26 DKH 2', '26 DKU', '26 DKR'
  ],
  2: [
    '25 DKKS 1', '25 DKKS 2', '25 DKP 1', '25 DKP 2', '25 DK E', '25 DK T', 
    '25 DKA 1', '25 DKA 2', '25 DKU', '25 DKR'
  ],
  3: [
    '24 DKKS 1', '24 DKKS 2', '24 DKP 1', '24 DKP 2', '24 DK E', '24 DK T', 
    '24 DKA 1', '24 DKA 2', '24 DKU', '24 DKR'
  ],
  4: [
    '23 DKKS 1', '23 DKKS 2', '23 DKP 1', '23 DKP 2', '23 DK E', '23 DK T', 
    '23 DKA 1', '23 DKA 2', '23 DKU', '23 DKR'
  ]
};

export const GROUPS = Object.values(GROUPS_BY_COURSE).flat();

export function getPortalDB(): PortalDatabase {
  // Always check for migration/seeding needs
  seedFacultyStarterTemplate();

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return INITIAL_DB;
  }
  try {
    const db = JSON.parse(data) as PortalDatabase;
    
    // Ensure all collections exist (for backward compatibility with older local storage)
    const collections: (keyof PortalDatabase)[] = [
      'users', 'publications', 'certificates', 'projects', 'snils', 'events', 
      'applications', 'news', 'tasks', 'gallery', 'notifications', 'reports', 
      'merch', 'orders', 'announcements', 'snil_applications'
    ];
    
    let updated = false;
    collections.forEach(key => {
      if (!db[key]) {
        (db as any)[key] = [];
        updated = true;
      }
    });

    if (updated) {
      if (db.merch.length === 0) {
        db.merch.push(
          { id: 'm1', name: 'Пластиковая ручка СНО ФЭМ', points: 20, stock: 100, description: 'Классическая синяя ручка с логотипом СНО ФЭМ.' },
          { id: 'm2', name: 'Металлическая ручка Premium', points: 50, stock: 20, description: 'Элегантная металлическая ручка для важных научных записей.' },
          { id: 'm3', name: 'Брелок СНО «День бел. науки»', points: 35, stock: 50, description: 'Лимитированная серия ко Дню белорусской науки.' },
          { id: 'm4', name: 'Брелок СНО стандартный', points: 30, stock: 80, description: 'Фирменный акриловый брелок с символикой факультета.' }
        );
      }
      savePortalDB(db);
    }

    // Если база есть, но пустая (например после очистки кэша), тоже сидим
    if (db.news.length === 0 && db.events.length === 0) {
      seedFacultyStarterTemplate();
      const reseeded = localStorage.getItem(STORAGE_KEY);
      return reseeded ? JSON.parse(reseeded) : db;
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
function getCourseFromGroup(group: string): number {
  if (group.startsWith('26')) return 1;
  if (group.startsWith('25')) return 2;
  if (group.startsWith('24')) return 3;
  if (group.startsWith('23')) return 4;
  return 1; // Default
}

export function loginUser(
  recordBook: string, 
  lastName: string, 
  firstName: string, 
  group: string = '26 DKKS 1',
  faculty: string = 'ФЭМ',
  department: string = DEPARTMENTS[0]
): CustomUser {
  const db = getPortalDB();
  const trimmedId = recordBook.trim();
  const trimmedLast = lastName.trim();
  const trimmedFirst = firstName.trim();

  let user = db.users.find(u => u.record_book_id.toLowerCase() === trimmedId.toLowerCase());

  if (!user) {
    const isFirstUserInSystem = db.users.length <= 1;
    
    user = {
      record_book_id: trimmedId,
      last_name: trimmedLast,
      first_name: trimmedFirst,
      role: isFirstUserInSystem ? 'admin' : 'student',
      group: group,
      course: getCourseFromGroup(group),
      faculty: faculty,
      department: department,
      scientific_interests: ['Экономика знаний', 'Цифровые инновации', 'Финансовый менеджмент'],
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    
    const notif = {
      id: 'notif_' + Date.now(),
      user_record_book: user.record_book_id,
      title: 'Добро пожаловать в Цифровой портал ФЭМ!',
      message: `Вы зарегистрированы в системе с ролью «${getRoleTitle(user.role)}». Заполните научное портфолио!`,
      type: 'info' as const,
      is_read: false,
      created_at: new Date().toISOString()
    };
    db.notifications.push(notif);
    notifyTelegram(user.record_book_id, notif.title, notif.message, notif.type);

    savePortalDB(db);

  } else {
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

// Вычисление рейтинга
export function calculateResearcherStats(recordBook: string): {
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

  return { totalPubs, totalReports, conferencesCount, ratingPoints: points };
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
  db.merch = db.merch || [];
  db.orders = db.orders || [];
  db.announcements = db.announcements || [];
  db.snil_applications = db.snil_applications || [];

  if (db.news && db.news.length > 0) {
    // Migration: ensure new SNILs are present and old ones are gone
    const currentSnils = db.snils;
    const snilNames = currentSnils.map(s => s.name);
    const requiredSnils = ['«ЭКОС»', '«Инноватика»', '«Агроэкономика»', '«Макровижен»'];
    const snilLeaderAgro = currentSnils.find(s => s.id === 'snil_agroeconomics')?.head_name || '';
    const hasSupervisors = db.users.some(u => u.role === 'snil_head');
    const hasCorrectSnils = requiredSnils.every(name => snilNames.includes(name)) && 
                           currentSnils.length === 4 && 
                           snilLeaderAgro.includes('Соболь') &&
                           hasSupervisors;
    
    if (!hasCorrectSnils) {
      db.snils = []; // Reset SNILs to force new ones below
      db.users = db.users.filter(u => u.role !== 'snil_head'); // Reset supervisors
    } else {
      return; // Already have news and SNILs/Supervisors are correct
    }
  }

  if (db.merch.length === 0) {
    db.merch.push(
      { id: 'm1', name: 'Пластиковая ручка СНО ФЭМ', points: 20, stock: 100, description: 'Классическая синяя ручка с логотипом СНО ФЭМ.' },
      { id: 'm2', name: 'Металлическая ручка Premium', points: 50, stock: 20, description: 'Элегантная металлическая ручка для важных научных записей.' },
      { id: 'm3', name: 'Брелок СНО «День бел. науки»', points: 35, stock: 50, description: 'Лимитированная серия ко Дню белорусской науки.' },
      { id: 'm4', name: 'Брелок СНО стандартный', points: 30, stock: 80, description: 'Фирменный акриловый брелок с символикой факультета.' }
    );
  }

  // Создаем руководителей СНИЛ
  const supervisors: CustomUser[] = [
    {
      record_book_id: '88800101',
      last_name: 'Заставновская',
      first_name: 'Анастасия',
      middle_name: 'Владимировна',
      role: 'snil_head',
      managed_snil_id: 'snil_ekos',
      group: 'СНИЛ ЭКОС',
      course: 4,
      faculty: 'ФЭМ',
      department: 'Кафедра экономики АПК и природопользования',
      scientific_interests: ['Экономика природопользования'],
      created_at: new Date().toISOString(),
      password: 'snil'
    },
    {
      record_book_id: '88800102',
      last_name: 'Давыдова',
      first_name: 'Ольга',
      middle_name: 'Григорьевна',
      role: 'snil_head',
      managed_snil_id: 'snil_innovatika',
      group: 'СНИЛ Инноватика',
      course: 4,
      faculty: 'ФЭМ',
      department: 'Кафедра экономики промышленных предприятий',
      scientific_interests: ['Инновации'],
      created_at: new Date().toISOString(),
      password: 'snil'
    },
    {
      record_book_id: '88800103',
      last_name: 'Соболь',
      first_name: 'Кирилл',
      middle_name: 'Николаевич',
      role: 'snil_head',
      managed_snil_id: 'snil_agroeconomics',
      group: 'СНИЛ Агроэкономика',
      course: 4,
      faculty: 'ФЭМ',
      department: 'Кафедра экономики АПК и природопользования',
      scientific_interests: ['Агроэкономика'],
      created_at: new Date().toISOString(),
      password: 'snil'
    },
    {
      record_book_id: '88800104',
      last_name: 'Точко',
      first_name: 'Анна',
      middle_name: 'Николаевна',
      role: 'snil_head',
      managed_snil_id: 'snil_macrovision',
      group: 'СНИЛ Макровижен',
      course: 4,
      faculty: 'ФЭМ',
      department: 'Кафедра национальной экономики и государственного управления',
      scientific_interests: ['Макроэкономика'],
      created_at: new Date().toISOString(),
      password: 'snil'
    }
  ];

  supervisors.forEach(s => {
    if (!db.users.some(u => u.record_book_id === s.record_book_id)) {
      db.users.push(s);
    }
  });

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

  // СНИЛ ФЭМ БГЭУ (4 Лаборатории)
  db.snils = [
    {
      id: 'snil_ekos',
      name: '«ЭКОС»',
      head_record_book: '88800101',
      head_name: 'к.э.н., доцент Заставновская Анастасия Владимировна',
      department: 'Кафедра экономики АПК и природопользования',
      description: 'Исследование проблем экономики природопользования и устойчивого развития аграрного сектора. Руководитель: к.э.н., доцент кафедры экономики АПК и природопользования.',
      research_directions: ['Экономика природопользования', 'Устойчивое развитие АПК'],
      member_record_books: Array.from({ length: 25 }, (_, i) => `student_ekos_${i + 1}`),
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Разработка методики оценки эко-эффективности'],
      is_best_snil_nominee: false
    },
    {
      id: 'snil_innovatika',
      name: '«Инноватика»',
      head_record_book: '88800102',
      head_name: 'старший преподаватель Давыдова Ольга Григорьевна',
      department: 'Кафедра экономики промышленных предприятий',
      description: 'Изучение инновационных процессов в промышленности и механизмов управления инновационным развитием. Руководитель: старший преподаватель кафедры экономики промышленных предприятий.',
      research_directions: ['Управление инновациями', 'Промышленная политика', 'Цифровые инновации'],
      member_record_books: Array.from({ length: 30 }, (_, i) => `student_innov_${i + 1}`),
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Лучшая СНИЛ БГЭУ 2026 (ГКК)', 'Патент на систему управления инновациями'],
      is_best_snil_nominee: true
    },
    {
      id: 'snil_agroeconomics',
      name: '«Агроэкономика»',
      head_record_book: '88800103',
      head_name: 'к.э.н., доцент Соболь Кирилл Николаевич',
      department: 'Кафедра экономики АПК и природопользования',
      description: 'Научные исследования в области экономики агропромышленного комплекса и сельских территорий. Руководитель: к.э.н., доцент кафедры экономики АПК и природопользования.',
      research_directions: ['Аграрная экономика', 'Развитие сельских территорий'],
      member_record_books: Array.from({ length: 25 }, (_, i) => `student_agro_${i + 1}`),
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Грант на исследование экспорта АПК'],
      is_best_snil_nominee: false
    },
    {
      id: 'snil_macrovision',
      name: '«Макровижен»',
      head_record_book: '88800104',
      head_name: 'Точко Анна Николаевна, Маркидонова А. В.',
      department: 'Кафедра национальной экономики и государственного управления',
      description: 'Макроэкономическое прогнозирование и анализ инструментов государственного управления. Руководители: старшие преподаватели кафедры национальной экономики и государственного управления.',
      research_directions: ['Макроэкономика', 'Государственное управление'],
      member_record_books: Array.from({ length: 30 }, (_, i) => `student_macro_${i + 1}`),
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Лучший аналитический обзор 2023'],
      is_best_snil_nominee: false
    }
  ];

  // Начальные объявления
  if (db.announcements.length === 0) {
    db.announcements.push({
      id: 'ann_1',
      snil_id: 'snil_innovatika',
      author_name: 'Давыдова Ольга Григорьевна',
      title: 'Собрание СНИЛ «Инноватика»',
      content: 'Уважаемые участники СНИЛ, собрание состоится в четверг в 14:00 в ауд. 402. Будем обсуждать подготовку к Декаде науки.',
      created_at: new Date().toISOString(),
      is_urgent: true
    });
  }

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

export function placeMerchOrder(user: CustomUser, item: MerchItem): { success: boolean; message: string } {
  const db = getPortalDB();
  const stats = calculateResearcherStats(user.record_book_id);
  
  // Проверка баллов
  if (stats.ratingPoints < item.points) {
    return { success: false, message: 'Недостаточно баллов рейтинга для обмена.' };
  }

  // Проверка наличия
  const dbItem = db.merch.find(i => i.id === item.id);
  if (!dbItem || dbItem.stock <= 0) {
    return { success: false, message: 'К сожалению, товар закончился на складе.' };
  }

  // Создание заказа
  const order: MerchOrder = {
    id: 'ord_' + Date.now(),
    userId: user.record_book_id,
    userRecordBook: user.record_book_id,
    userName: `${user.last_name} ${user.first_name}`,
    itemId: item.id,
    itemName: item.name,
    points: item.points,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.orders.push(order);
  dbItem.stock -= 1;
  
  // Уведомление пользователю
  const notif = {
    id: 'notif_' + Date.now(),
    user_record_book: user.record_book_id,
    title: 'Заказ сувенира оформлен',
    message: `Вы обменяли ${item.points} баллов на «${item.name}». Получить сувенир можно в деканате (Корпус 4, каб. 314) у зам. декана.`,
    type: 'success' as const,
    is_read: false,
    created_at: new Date().toISOString()
  };
  db.notifications.push(notif);
  notifyTelegram(user.record_book_id, notif.title, notif.message, notif.type);

  savePortalDB(db);

  return { success: true, message: 'Заказ успешно оформлен! Инструкции отправлены в уведомления.' };
}

export function updateUserPassword(recordBook: string, newPassword: string): { success: boolean; message: string } {
  const db = getPortalDB();
  const userIndex = db.users.findIndex(u => u.record_book_id === recordBook);
  
  if (userIndex === -1) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  db.users[userIndex].password = newPassword;
  
  // Also update current session if it's the same user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.record_book_id === recordBook) {
    currentUser.password = newPassword;
    sessionStorage.setItem('current_portal_user', JSON.stringify(currentUser));
  }

  savePortalDB(db);
  return { success: true, message: 'Пароль успешно изменен.' };
}

export function addAnnouncement(announcement: Omit<Announcement, 'id' | 'created_at'>): void {
  const db = getPortalDB();
  const newAnn: Announcement = {
    ...announcement,
    id: 'ann_' + Date.now(),
    created_at: new Date().toISOString()
  };
  db.announcements.push(newAnn);
  savePortalDB(db);
}

export function deleteAnnouncement(id: string): void {
  const db = getPortalDB();
  db.announcements = db.announcements.filter(a => a.id !== id);
  savePortalDB(db);
}

export function addMemberToSnil(snilId: string, recordBook: string): { success: boolean; message: string } {
  const db = getPortalDB();
  const snilIndex = db.snils.findIndex(s => s.id === snilId);
  
  if (snilIndex === -1) return { success: false, message: 'СНИЛ не найден' };
  
  if (db.snils[snilIndex].member_record_books.includes(recordBook)) {
    return { success: false, message: 'Студент уже является участником' };
  }
  
  db.snils[snilIndex].member_record_books.push(recordBook);
  
  // Send notification to student
  const notif = {
    id: 'notif_' + Date.now(),
    user_record_book: recordBook,
    title: 'Вы приняты в СНИЛ',
    message: `Поздравляем! Руководитель СНИЛ «${db.snils[snilIndex].name}» добавил вас в список участников.`,
    type: 'success' as const,
    is_read: false,
    created_at: new Date().toISOString()
  };
  db.notifications.push(notif);
  notifyTelegram(recordBook, notif.title, notif.message, notif.type);
  
  savePortalDB(db);
  return { success: true, message: 'Студент успешно добавлен' };

}

export function removeMemberFromSnil(snilId: string, recordBook: string): void {
  const db = getPortalDB();
  const snilIndex = db.snils.findIndex(s => s.id === snilId);
  if (snilIndex !== -1) {
    db.snils[snilIndex].member_record_books = db.snils[snilIndex].member_record_books.filter(id => id !== recordBook);
    savePortalDB(db);
  }
}

export function createSnilApplication(snilId: string, snilName: string, studentRecordBook: string): void {
  const db = getPortalDB();
  db.snil_applications = db.snil_applications || [];
  
  // Check if already exists
  if (db.snil_applications.some(a => a.snil_id === snilId && a.student_record_book === studentRecordBook)) {
    return;
  }
  
  const newApp: SnilApplication = {
    id: 'snil_app_' + Date.now(),
    student_record_book: studentRecordBook,
    snil_id: snilId,
    snil_name: snilName,
    status: 'подана',
    created_at: new Date().toISOString()
  };
  
  db.snil_applications.push(newApp);
  savePortalDB(db);
}

