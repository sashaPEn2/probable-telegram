export type UserRole = 'student' | 'activist' | 'snil_head' | 'coordinator' | 'admin';

export interface CustomUser {
  record_book_id: string; // Номер зачётки (ключ аутентификации)
  last_name: string;
  first_name: string;
  middle_name?: string;
  role: UserRole;
  managed_snil_id?: string; // ID СНИЛ для руководителя
  group: string; // Например: ДГХ-1, ДЭУ-2
  course: number; // 1-4
  faculty: string; // Факультет
  department: string; // Кафедра
  scientific_interests: string[]; // Научные интересы
  created_at: string;
  telegram_username?: string;
  telegram_user_id?: number;
  avatar_url?: string;
  password?: string;
}

export interface Announcement {
  id: string;
  snil_id: string;
  author_name: string;
  title: string;
  content: string;
  created_at: string;
  is_urgent?: boolean;
}

export interface Publication {
  id: string;
  user_record_book: string;
  author_names: string[];
  title: string;
  type: 'статья' | 'тезисы' | 'монография' | 'учебное_пособие';
  journal: string;
  year: number;
  doi?: string;
  link?: string;
  file_name?: string;
  is_confirmed: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  user_record_book: string;
  title: string;
  event_name: string;
  issue_date: string;
  type: 'диплом_1_степени' | 'диплом_2_степени' | 'диплом_3_степени' | 'сертификат_участника' | 'грамота';
}

export interface ResearchProject {
  id: string;
  user_record_book: string;
  title: string;
  description: string;
  role: string;
  start_date: string;
  end_date?: string;
}

export interface ResearcherPortfolio {
  user_record_book: string;
  publications: Publication[];
  conferences_count: number;
  certificates: Certificate[];
  research_projects: ResearchProject[];
  total_publications: number;
  total_reports: number;
  rating_points: number;
}

export interface SNIL {
  id: string;
  name: string;
  head_record_book: string;
  head_name: string;
  department: string;
  description: string;
  research_directions: string[];
  member_record_books: string[];
  is_active: boolean;
  created_at: string;
  achievements: string[];
  is_best_snil_nominee?: boolean;
}

export type EventType = 
  | 'конференция' 
  | 'семинар' 
  | 'мастер-класс' 
  | 'научный_слэм' 
  | 'круглый_стол' 
  | 'научная_гостиная' 
  | 'форум' 
  | 'олимпиада';

export interface ScientificEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  organizer: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  location: string; // 'Корпус №4, ауд. 310' или 'Онлайн'
  is_active: boolean;
  max_participants: number;
  participant_record_books: string[];
  materials_links: { title: string; url: string }[];
  created_at: string;
}

export type ApplicationStatus = 'черновик' | 'подана' | 'на_рассмотрении' | 'принята' | 'отклонена';

export interface SnilApplication {
  id: string;
  student_record_book: string;
  snil_id: string;
  snil_name: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface ResearchApplication {
  id: string;
  student_record_book: string;
  student_name: string;
  student_group: string;
  event_id: string;
  event_title: string;
  topic: string;
  abstract: string;
  file_name?: string;
  status: ApplicationStatus;
  review_comment?: string;
  created_at: string;
}

export interface SNONews {
  id: string;
  title: string;
  content: string;
  author_record_book: string;
  author_name: string;
  event_id?: string;
  is_pinned: boolean;
  created_at: string;
  image_url?: string;
  published_to_telegram: boolean;
}

export type TaskStatus = 'новая' | 'в_работе' | 'выполнена' | 'проверена';

export interface ResearchTask {
  id: string;
  snil_id: string;
  snil_name: string;
  title: string;
  description: string;
  assigned_to_record_book: string;
  assigned_to_name: string;
  deadline: string;
  status: TaskStatus;
  result_file_name?: string;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  event_name: string;
  date: string;
  image_url: string;
  uploader_name: string;
  type: 'photo' | 'video';
}

export interface Notification {
  id: string;
  user_record_book: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export interface MerchItem {
  id: string;
  name: string;
  points: number;
  image?: string;
  stock: number;
  description: string;
}

export interface MerchOrder {
  id: string;
  userId: string;
  userName: string;
  userRecordBook: string;
  itemId: string;
  itemName: string;
  points: number;
  status: 'pending' | 'ready' | 'received';
  createdAt: string;
}

export interface NIRSReport {
  id: string;
  semester: string;
  total_students: number;
  active_researchers: number;
  total_publications: number;
  conferences_held: number;
  snil_count: number;
  generated_at: string;
  department_stats: { department: string; pubs: number; students: number }[];
}
