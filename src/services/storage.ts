import {
  CustomUser,
  Publication,
  Certificate,
  PublicationCertificate,
  ResearchProject,
  SNIL,
  ScientificEvent,
  ResearchApplication,
  SNONews,
  ResearchTask,
  GalleryItem,
  NIRSReport,
  MerchItem,
  MerchOrder,
  Announcement,
  SnilApplication,
  ApplicationStatus,
  Quiz,
  QuizAttempt,
  FeedBanner,
  SecondaryBanner,
  UserRole,
  Notification
} from '../types';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db as firestoreDb, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ... (keep existing definitions)

export async function fetchPortalDBFromFirestore(): Promise<PortalDatabase> {
  const collections: (keyof PortalDatabase)[] = [
    'users', 'publications', 'certificates', 'projects', 'snils', 'events', 
    'applications', 'news', 'tasks', 'gallery', 'notifications', 'reports', 
    'merch', 'orders', 'announcements', 'snil_applications', 'quizzes', 'quizAttempts'
  ];

  const db: any = {};
  for (const col of collections) {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, col));
      db[col] = querySnapshot.docs.map(doc => doc.data());
    } catch (e) {
      console.error(`Error reading collection ${col}:`, e);
      db[col] = [];
    }
  }

  // Ensure only the administrator account exists in the user list!
  const users = (db.users || []) as CustomUser[];
  const hasAdmin = users.some(u => u.record_book_id === '00000001');

  // Delete all users in Firestore except the admin!
  for (const u of users) {
    if (u.record_book_id !== '00000001') {
      try {
        await deleteDoc(doc(firestoreDb, 'users', u.record_book_id));
      } catch (err) {
        console.error("Error deleting old account:", err);
      }
    }
  }

  // Ensure the admin account is in Firestore
  if (!hasAdmin) {
    const adminUser: CustomUser = {
      record_book_id: '00000001',
      last_name: 'Администратор',
      first_name: 'СНО',
      role: 'admin',
      group: 'Система',
      course: 4,
      faculty: 'ФЭМ',
      department: 'Деканат',
      scientific_interests: ['Управление СНО', 'Информационные технологии в науке'],
      created_at: new Date().toISOString(),
      password: 'admin'
    };
    try {
      await setDoc(doc(firestoreDb, 'users', '00000001'), adminUser);
      db.users = [adminUser];
    } catch (err) {
      console.error("Error creating admin account:", err);
    }
  } else {
    db.users = users.filter(u => u.record_book_id === '00000001');
  }

  // Also update our memory cache
  memoryDb = { ...memoryDb, ...db };

  return db as PortalDatabase;
}

export async function savePortalDBToFirestore(dbData: PortalDatabase): Promise<void> {
  // Implementation...
}
const STORAGE_KEY = 'fem_bseu_portal_db_v1';
const CURRENT_USER_KEY = 'fem_bseu_user';

export interface PortalDatabase {
  users: CustomUser[];
  publications: Publication[];
  certificates: Certificate[];
  publication_certificates: PublicationCertificate[];
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
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  feed_banner?: FeedBanner;
  secondary_banner?: SecondaryBanner;
}

const INITIAL_DB: PortalDatabase = {
  users: [],
  publications: [],
  certificates: [],
  publication_certificates: [],
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
  snil_applications: [],
  quizzes: [],
  quizAttempts: []
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
    '26ДКС-1', '26ДКС-2', '26ДКП-1', '26ДКП-2', '26ДКЭ', '26ДКТ', 
    '26ДКХ-1', '26ДКХ-2', '26ДКУ', '26ДКР'
  ],
  2: [
    '25ДКС-1', '25ДКС-2', '25ДКП-1', '25ДКП-2', '25ДКЭ', '25ДКТ', 
    '25ДКА-1', '25ДКА-2', '25ДКУ', '25ДКР'
  ],
  3: [
    '24ДКС-1', '24ДКС-2', '24ДКП-1', '24ДКП-2', '24ДКЭ', '24ДКТ', 
    '24ДКА-1', '24ДКА-2', '24ДКУ', '24ДКР'
  ],
  4: [
    '23ДКС-1', '23ДКС-2', '23ДКП-1', '23ДКП-2', '23ДКЭ', '23ДКТ', 
    '23ДКА-1', '23ДКА-2', '23ДКУ', '23ДКР'
  ]
};

export const GROUPS = Object.values(GROUPS_BY_COURSE).flat();

let memoryDb: PortalDatabase = { ...INITIAL_DB };
let hasSeeded = false;

export function getPortalDB(): PortalDatabase {
  if (!hasSeeded) {
    seedFacultyStarterTemplate();
    hasSeeded = true;
  }
  return memoryDb;
}

export function savePortalDB(db: PortalDatabase): void {
  const collections: (keyof PortalDatabase)[] = [
    'users', 'publications', 'certificates', 'publication_certificates', 'projects', 'snils', 'events', 
    'applications', 'news', 'tasks', 'gallery', 'notifications', 'reports', 
    'merch', 'orders', 'announcements', 'snil_applications', 'quizzes', 'quizAttempts'
  ];

  collections.forEach(colKey => {
    const oldItems = (memoryDb[colKey] as any[]) || [];
    const newItems = (db[colKey] as any[]) || [];

    // Find added or updated items
    newItems.forEach((newItem: any) => {
      if (!newItem) return;
      const id = newItem.id || newItem.record_book_id;
      if (!id) return;
      
      const oldItem = oldItems.find((o: any) => (o.id || o.record_book_id) === id);
      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        // Item was added or modified, write to Firestore!
        const docRef = doc(firestoreDb, colKey as string, id);
        setDoc(docRef, { ...newItem }, { merge: true }).catch(err => {
          console.error(`Error syncing ${colKey}/${id} to Firestore:`, err);
        });
      }
    });

    // Find deleted items
    oldItems.forEach((oldItem: any) => {
      if (!oldItem) return;
      const id = oldItem.id || oldItem.record_book_id;
      if (!id) return;
      const stillExists = newItems.some((n: any) => (n.id || n.record_book_id) === id);
      if (!stillExists) {
        // Item was deleted, delete from Firestore!
        const docRef = doc(firestoreDb, colKey as string, id);
        deleteDoc(docRef).catch(err => {
          console.error(`Error deleting ${colKey}/${id} from Firestore:`, err);
        });
      }
    });
  });

  memoryDb = { ...db };
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
    
    addNotificationAndNotifyTelegram({
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
    user.last_name = trimmedLast;
    user.first_name = trimmedFirst;
    savePortalDB(db);
  }

  // Also write to Firestore directly to make sure we persist it and support real-time across devices!
  try {
    const userRef = doc(firestoreDb, 'users', user.record_book_id);
    setDoc(userRef, { ...user }, { merge: true }).catch(err => {
      console.error("Error writing registered user to Firestore:", err);
    });
  } catch (error) {
    console.error("Firestore error in loginUser:", error);
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
    case 'coordinator': return 'Координатор ФЭМ';
    case 'admin': return 'Администратор сайта';
    default: return 'Студент';
  }
}

export function canAccessAdmin(user: CustomUser | null): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' || 
    user.role === 'coordinator' || 
    user.role === 'activist' || 
    user.role === 'snil_head' ||
    user.group === 'Система' ||
    user.group === 'ADMIN-ROOT' ||
    user.group === 'COORDINATOR-FEM'
  );
}

export function updateUserRole(recordBook: string, newRole: UserRole): boolean {
  const db = getPortalDB();
  const user = db.users.find(u => u.record_book_id === recordBook);
  if (!user) return false;
  user.role = newRole;
  savePortalDB(db);
  
  // Also write the updated role to Firestore to make it available in real-time across devices!
  try {
    const userRef = doc(firestoreDb, 'users', recordBook);
    setDoc(userRef, { role: newRole }, { merge: true }).catch(err => {
      console.error("Error updating role in Firestore:", err);
    });
  } catch (error) {
    console.error("Firestore error in updateUserRole:", error);
  }
  
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
    if (c.custom_points !== undefined) {
      points += c.custom_points;
    } else if (c.type === 'диплом_1_степени') points += 30;
    else if (c.type === 'диплом_2_степени') points += 20;
    else if (c.type === 'диплом_3_степени') points += 15;
    else points += 5;
  });

  return { totalPubs, totalReports, conferencesCount, ratingPoints: points };
}

// Генерация стартового шаблона ФЭМ (по запросу администратора, чтобы не было пустой базы при первом просмотре)
export function seedFacultyStarterTemplate(): void {
  // Инициализируем массивы в memoryDb
  const db = memoryDb;
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

  // Migrate group names to new Russian format
  db.users.forEach(u => {
    if (u.group && (u.group.includes('DK') || u.group.includes(' '))) {
      if (u.role === 'student') {
        u.group = u.group
          .replace('DKKS', 'ДКС-')
          .replace('DKP', 'ДКП-')
          .replace('DK E', 'ДКЭ')
          .replace('DK T', 'ДКТ')
          .replace('DKH', 'ДКХ-')
          .replace('DKA', 'ДКА-')
          .replace('DKU', 'ДКУ')
          .replace('DKR', 'ДКР')
          .replace(/\s+/g, '');
      }
    }
  });

  if (db.users.length > 0 && db.users.some(u => u.record_book_id === '00000001')) {
    // If we already have seeded, do not overwrite completely
    return;
  }

  // Set users to contain ONLY the system administrator account
  const adminUser: CustomUser = {
    record_book_id: '00000001',
    last_name: 'Администратор',
    first_name: 'СНО',
    role: 'admin',
    group: 'Система',
    course: 4,
    faculty: 'ФЭМ',
    department: 'Деканат',
    scientific_interests: ['Управление СНО', 'Информационные технологии в науке'],
    created_at: new Date().toISOString(),
    password: 'admin'
  };

  db.users = [adminUser];

  // Try to sync admin user to Firestore instantly
  try {
    const adminRef = doc(firestoreDb, 'users', adminUser.record_book_id);
    setDoc(adminRef, adminUser, { merge: true }).catch(err => {
      console.error("Error writing admin account to Firestore during seeding:", err);
    });
  } catch (err) {
    console.error("Firestore seeding error:", err);
  }

  if (db.merch.length === 0) {
    db.merch.push(
      { id: 'm1', name: 'Пластиковая ручка СНО ФЭМ', points: 20, stock: 100, description: 'Классическая синяя ручка с логотипом СНО ФЭМ.' },
      { id: 'm2', name: 'Металлическая ручка Premium', points: 50, stock: 20, description: 'Элегантная металлическая ручка для важных научных записей.' },
      { id: 'm3', name: 'Брелок СНО «День бел. науки»', points: 35, stock: 50, description: 'Лимитированная серия ко Дню белорусской науки.' },
      { id: 'm4', name: 'Брелок СНО стандартный', points: 30, stock: 80, description: 'Фирменный акриловый брелок с символикой факультета.' }
    );
  }

  // Новость СНО
  if (!db.news.find(n => n.id === 'news_1')) {
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
  }

  // Научное мероприятие
  if (!db.events.find(e => e.id === 'ev_1')) {
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
  }

  // СНИЛ ФЭМ БГЭУ (4 Лаборатории)
  db.snils = [
    {
      id: 'snil_ekos',
      name: '«ЭКОС»',
      head_record_book: '00000001',
      head_name: 'Администратор СНО',
      department: 'Кафедра экономики АПК и природопользования',
      description: 'Исследование проблем экономики природопользования и устойчивого развития аграрного сектора. Руководитель: к.э.н., доцент кафедры экономики АПК и природопользования.',
      research_directions: ['Экономика природопользования', 'Устойчивое развитие АПК'],
      member_record_books: [],
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Разработка методики оценки эко-эффективности'],
      is_best_snil_nominee: false
    },
    {
      id: 'snil_innovatika',
      name: '«Инноватика»',
      head_record_book: '00000001',
      head_name: 'Администратор СНО',
      department: 'Кафедра экономики промышленных предприятий',
      description: 'Изучение инновационных процессов в промышленности и механизмов управления инновационным развитием. Руководитель: старший преподаватель кафедры экономики промышленных предприятий.',
      research_directions: ['Управление инновациями', 'Промышленная политика', 'Цифровые инновации'],
      member_record_books: [],
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Лучшая СНИЛ БГЭУ 2026 (ГКК)', 'Патент на систему управления инновациями'],
      is_best_snil_nominee: true
    },
    {
      id: 'snil_agroeconomics',
      name: '«Агроэкономика»',
      head_record_book: '00000001',
      head_name: 'Администратор СНО',
      department: 'Кафедра экономики АПК и природопользования',
      description: 'Научные исследования в области экономики агропромышленного комплекса и сельских территорий. Руководитель: к.э.н., доцент кафедры экономики АПК и природопользования.',
      research_directions: ['Аграрная экономика', 'Развитие сельских территорий'],
      member_record_books: [],
      is_active: true,
      created_at: new Date().toISOString(),
      achievements: ['Грант на исследование экспорта АПК'],
      is_best_snil_nominee: false
    },
    {
      id: 'snil_macrovision',
      name: '«MacroVision»',
      head_record_book: '00000001',
      head_name: 'Администратор СНО',
      department: 'Кафедра национальной экономики и государственного управления',
      description: 'Макроэкономическое прогнозирование и анализ инструментов государственного управления. Руководители: старшие преподаватели кафедры национальной экономики и государственного управления.',
      research_directions: ['Макроэкономика', 'Государственное управление'],
      member_record_books: [],
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
      author_name: 'Администратор СНО',
      title: 'Собрание СНИЛ «Инноватика»',
      content: 'Уважаемые участники СНИЛ, собрание состоится в четверг в 14:00 в ауд. 402. Будем обсуждать подготовку к Декаде науки.',
      created_at: new Date().toISOString(),
      is_urgent: true
    });
  }

  // Галерея
  if (db.gallery.length === 0) {
    db.gallery.push({
      id: 'gal_1',
      title: 'Открытие Научной гостиной ФЭМ',
      event_name: 'Встреча с экспертами Парка высоких технологий',
      date: new Date().toISOString().split('T')[0],
      image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
      uploader_name: 'СНО ФЭМ Медиа',
      type: 'photo'
    });
  }

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
  savePortalDB(db);
  
  // Уведомление пользователю
  addNotificationAndNotifyTelegram({
    id: 'notif_' + Date.now(),
    user_record_book: user.record_book_id,
    title: 'Заказ сувенира оформлен',
    message: `Вы обменяли ${item.points} баллов на «${item.name}». Получить сувенир можно в деканате (Корпус 4, каб. 314) у зам. декана.`,
    type: 'success',
    is_read: false,
    created_at: new Date().toISOString()
  });

  return { success: true, message: 'Заказ успешно оформлен! Инструкции отправлены в уведомления.' };
}

export function updateUserPassword(recordBook: string, newPassword: string): { success: boolean; message: string } {
  const db = getPortalDB();
  const userIndex = db.users.findIndex(u => u.record_book_id === recordBook);
  
  if (userIndex === -1) {
    return { success: false, message: 'Пользователь не найден.' };
  }

  db.users[userIndex].password = newPassword;
  
  // Also write the updated password to Firestore to make it available in real-time across devices!
  try {
    const userRef = doc(firestoreDb, 'users', recordBook);
    setDoc(userRef, { password: newPassword }, { merge: true }).catch(err => {
      console.error("Error updating password in Firestore:", err);
    });
  } catch (error) {
    console.error("Firestore error in updateUserPassword:", error);
  }

  // Also update current session if it's the same user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.record_book_id === recordBook) {
    currentUser.password = newPassword;
    sessionStorage.setItem('current_portal_user', JSON.stringify(currentUser));
    localStorage.setItem('fem_bseu_user', JSON.stringify(currentUser)); // Sync primary user state in localStorage
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

export async function savePublicationToFirestore(pub: Publication): Promise<void> {
  const docRef = doc(firestoreDb, 'publications', pub.id);
  await setDoc(docRef, pub, { merge: true });
}

export async function savePublicationCertificateToFirestore(cert: PublicationCertificate): Promise<void> {
  const docRef = doc(firestoreDb, 'publication_certificates', cert.id);
  await setDoc(docRef, cert, { merge: true });
}

export async function deletePublication(id: string): Promise<void> {
  const db = getPortalDB();
  db.publications = db.publications.filter(p => p.id !== id);
  savePortalDB(db);

  const docRef = doc(firestoreDb, 'publications', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Не удалось удалить публикацию из Firestore:', error);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = getPortalDB();
  db.announcements = db.announcements.filter(a => a.id !== id);
  savePortalDB(db);

  const docRef = doc(firestoreDb, 'announcements', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Не удалось удалить объявление из Firestore:', error);
  }
}

export async function saveNewsToFirestore(news: SNONews): Promise<void> {
  const docRef = doc(firestoreDb, 'news', news.id);
  await setDoc(docRef, news, { merge: true });
}

export async function saveEventToFirestore(event: ScientificEvent): Promise<void> {
  const docRef = doc(firestoreDb, 'events', event.id);
  await setDoc(docRef, event, { merge: true });
}

export async function deleteNews(id: string): Promise<{ success: boolean; message: string }> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Пользователь не авторизован.');
  }

  const allowedRoles = ['admin', 'coordinator', 'snil_head'];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new Error('У вас нет прав для удаления новостей.');
  }

  // Сначала обновляем локальную базу для мгновенного отклика в интерфейсе
  const db = getPortalDB();
  db.news = db.news.filter(n => n.id !== id);
  savePortalDB(db);

  // Пытаемся удалить из Firestore, но перехватываем ошибку, чтобы она не блокировала локальное действие
  const docRef = doc(firestoreDb, 'news', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Не удалось удалить новость из Firestore, но она удалена локально:', error);
  }

  return { success: true, message: 'Новость успешно удалена.' };
}

export async function deleteEvent(id: string): Promise<{ success: boolean; message: string }> {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Пользователь не авторизован.');
  }

  const allowedRoles = ['admin', 'coordinator', 'snil_head'];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new Error('У вас нет прав для удаления мероприятий.');
  }

  // Сначала обновляем локальную базу для мгновенного отклика в интерфейсе
  const db = getPortalDB();
  db.events = db.events.filter(e => e.id !== id);
  savePortalDB(db);

  // Пытаемся удалить из Firestore, но перехватываем ошибку, чтобы она не блокировала локальное действие
  const docRef = doc(firestoreDb, 'events', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Не удалось удалить мероприятие из Firestore, но оно удалено локально:', error);
  }

  return { success: true, message: 'Мероприятие успешно удалено.' };
}

export function addMemberToSnil(snilId: string, recordBook: string): { success: boolean; message: string } {
  const db = getPortalDB();
  const snilIndex = db.snils.findIndex(s => s.id === snilId);
  
  if (snilIndex === -1) return { success: false, message: 'СНИЛ не найден' };
  
  if (db.snils[snilIndex].member_record_books.includes(recordBook)) {
    return { success: false, message: 'Студент уже является участником' };
  }
  
  db.snils[snilIndex].member_record_books.push(recordBook);
  savePortalDB(db);
  
  // Send notification to student
  addNotificationAndNotifyTelegram({
    id: 'notif_' + Date.now(),
    user_record_book: recordBook,
    title: 'Вы приняты в СНИЛ',
    message: `Поздравляем! Руководитель СНИЛ «${db.snils[snilIndex].name}» добавил вас в список участников.`,
    type: 'success',
    is_read: false,
    created_at: new Date().toISOString()
  });
  
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

export function addAchievementToSnil(snilId: string, achievement: string): void {
  const db = getPortalDB();
  const snilIndex = db.snils.findIndex(s => s.id === snilId);
  if (snilIndex !== -1) {
    db.snils[snilIndex].achievements = db.snils[snilIndex].achievements || [];
    db.snils[snilIndex].achievements.push(achievement);
    savePortalDB(db);
  }
}

export function removeAchievementFromSnil(snilId: string, index: number): void {
  const db = getPortalDB();
  const snilIndex = db.snils.findIndex(s => s.id === snilId);
  if (snilIndex !== -1) {
    db.snils[snilIndex].achievements = db.snils[snilIndex].achievements || [];
    db.snils[snilIndex].achievements = db.snils[snilIndex].achievements.filter((_, i) => i !== index);
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

export function updateSnilApplicationStatus(appId: string, newStatus: ApplicationStatus): void {
  const db = getPortalDB();
  db.snil_applications = db.snil_applications || [];
  const app = db.snil_applications.find(a => a.id === appId);
  if (!app) return;
  
  app.status = newStatus;
  
  if (newStatus === 'принята') {
    addMemberToSnil(app.snil_id, app.student_record_book);
  }
  
  savePortalDB(db);
}

export function notifySnilMembers(snilId: string, title: string, message: string): void {
  const db = getPortalDB();
  const snil = db.snils.find(s => s.id === snilId);
  if (!snil) return;

  snil.member_record_books.forEach(recordBook => {
    addNotificationAndNotifyTelegram({
      id: 'notif_' + recordBook + '_' + Date.now(),
      user_record_book: recordBook,
      title: title,
      message: message,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });
  });
}

export function addNotificationAndNotifyTelegram(notification: Notification): void {
  const db = getPortalDB();
  db.notifications.push(notification);
  savePortalDB(db);

  const userRecordBook = notification.user_record_book;

  // Define helper function to send post request
  const sendToTelegram = (chatId: string) => {
    fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chatId,
        message: `📢 ${notification.title}\n\n${notification.message}`
      })
    }).catch(err => console.error("Error sending notification via Telegram API:", err));
  };

  // 1. Support general broadcast for 'all' users
  if (userRecordBook === 'all') {
    db.users.forEach(u => {
      if (u.telegram_chat_id) {
        sendToTelegram(u.telegram_chat_id);
      }
    });
  } else {
    // 1. Get from local storage cache
    const localUser = db.users.find(u => u.record_book_id === userRecordBook);
    const localChatId = localUser?.telegram_chat_id;
    if (localChatId) {
      sendToTelegram(localChatId);
    }

    // 2. Fetch the latest profile from Firestore as well to find the real-time up-to-date Telegram Chat ID
    try {
      const userRef = doc(firestoreDb, 'users', userRecordBook);
      getDoc(userRef).then(userDoc => {
        if (userDoc.exists()) {
          const firestoreUser = userDoc.data() as CustomUser;
          const firestoreChatId = firestoreUser.telegram_chat_id;
          if (firestoreChatId && firestoreChatId !== localChatId) {
            sendToTelegram(firestoreChatId);
          }
        }
      }).catch(e => {
        console.error("Error fetching recipient from Firestore for Telegram notification:", e);
      });
    } catch (e) {
      console.error("Firestore not initialized or accessible in background context:", e);
    }
  }
}
