import React, { useState, useMemo, useRef } from 'react';
import { PortalDatabase, calculateResearcherStats, DEPARTMENTS, GROUPS, addNotificationAndNotifyTelegram, notifySnilMembers } from '../services/storage';
import { TelegramSettings } from './TelegramSettings';
import { CustomUser, Publication, Certificate, ResearchProject } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  User, 
  Award, 
  BookOpen, 
  Loader2, 
  Plus, 
  Download, 
  LogOut, 
  Edit3, 
  Save,
  FileText,
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
  Megaphone,
  UserPlus,
  BarChart3,
  Search,
  X,
  FlaskConical
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { addAnnouncement, deleteAnnouncement, addMemberToSnil, removeMemberFromSnil, getPortalDB } from '../services/storage';

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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pubs' | 'apps' | 'tasks' | 'interests' | 'certs' | 'snil_mgmt'>('overview');
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingApplication, setIsGeneratingApplication] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const snoApplicationRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempGroup, setTempGroup] = useState(user.group);
  const [tempDepartment, setTempDepartment] = useState(user.department);

  const handleSaveProfile = () => {
    const updated = { ...user, group: tempGroup, department: tempDepartment };
    const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
    if (dbUser) {
        dbUser.group = tempGroup;
        dbUser.department = tempDepartment;
    }
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onUpdateUser(updated);
    setIsEditingProfile(false);
  };

  // SNIL Management State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [isAnnUrgent, setIsAnnUrgent] = useState(false);
  const [studentRecordBookToAdd, setStudentRecordBookToAdd] = useState('');
  const [mgmtMessage, setMgmtMessage] = useState({ text: '', type: '' });
  
  const myPubs = useMemo(() => (db.publications || []).filter(p => p.user_record_book === user.record_book_id), [db.publications, user.record_book_id]);
  const myApps = useMemo(() => (db.applications || []).filter(a => a.student_record_book === user.record_book_id), [db.applications, user.record_book_id]);
  const myCerts = useMemo(() => (db.certificates || []).filter(c => c.user_record_book === user.record_book_id), [db.certificates, user.record_book_id]);
  const mySnilMembership = useMemo(() => (db.snils || []).find(s => s.member_record_books.includes(user.record_book_id)), [db.snils, user.record_book_id]);
  const mySnilApps = useMemo(() => (db.snil_applications || []).filter(a => a.student_record_book === user.record_book_id), [db.snil_applications, user.record_book_id]);
  
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

  const myTasks = useMemo(() => (db.tasks || []).filter(t => t.assigned_to_record_book === user.record_book_id), [db.tasks, user.record_book_id]);
  const stats = calculateResearcherStats(user.record_book_id);

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
    addNotificationAndNotifyTelegram({
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

  const mySnil = useMemo(() => {
    if (user.role !== 'snil_head' || !user.managed_snil_id) return null;
    return db.snils.find(s => s.id === user.managed_snil_id);
  }, [db.snils, user.managed_snil_id, user.role]);

  const mySnilAnnouncements = useMemo(() => {
    if (!mySnil) return [];
    return (db.announcements || []).filter(a => a.snil_id === mySnil.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [db.announcements, mySnil]);

  const mySnilMembers = useMemo(() => {
    if (!mySnil) return [];
    return (db.users || []).filter(u => (mySnil.member_record_books || []).includes(u.record_book_id));
  }, [db.users, mySnil]);

  const handleAddAnn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mySnil || !annTitle.trim() || !annContent.trim()) return;
    addAnnouncement({
      snil_id: mySnil.id,
      author_name: `${user.last_name} ${user.first_name}`,
      title: annTitle,
      content: annContent,
      is_urgent: isAnnUrgent
    });
    
    notifySnilMembers(mySnil.id, `📢 ${annTitle}`, annContent);
    
    setAnnTitle('');
    setAnnContent('');
    setIsAnnUrgent(false);
    onRefresh();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mySnil || !studentRecordBookToAdd.trim()) return;
    const result = addMemberToSnil(mySnil.id, studentRecordBookToAdd.trim());
    setMgmtMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) setStudentRecordBookToAdd('');
    setTimeout(() => setMgmtMessage({ text: '', type: '' }), 3000);
    onRefresh();
  };

  const generateSnilReport = async () => {
    if (!reportRef.current || !mySnil) return;
    setIsGeneratingReport(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Отчет_СНИЛ_${mySnil.name}_${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setIsGeneratingReport(false);
    }
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
      addNotificationAndNotifyTelegram({
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
      <div className="bg-gradient-to-r from-[#0a2a5e] via-blue-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-[#d4af37]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-6 relative z-10">
          <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#d4af37] to-amber-500 p-1 flex-shrink-0 shadow-xl">
            <div className="w-full h-full bg-[#0a2a5e] rounded-[22px] flex items-center justify-center text-3xl font-extrabold text-[#d4af37]">
              {user.first_name[0]}{user.last_name[0]}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-[#d4af37] text-[#0a2a5e] font-bold text-xs uppercase tracking-wider">
                Зачётка № {user.record_book_id}
              </span>
              <span className="text-xs font-mono bg-blue-950 px-2 py-0.5 rounded text-blue-300 flex items-center gap-2">
                Группа: 
                {isEditingProfile ? (
                    <select className="bg-blue-900 text-white p-1 rounded" value={tempGroup} onChange={e => setTempGroup(e.target.value)}>
                        {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                ) : user.group}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{user.last_name} {user.first_name}</h1>
            <div className="text-blue-200 text-xs sm:text-sm opacity-90 flex flex-wrap items-center gap-2">
                {user.faculty} • 
                {isEditingProfile ? (
                    <select className="bg-blue-900 text-white p-1 rounded" value={tempDepartment} onChange={e => setTempDepartment(e.target.value)}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                ) : user.department}
                
                <div className="flex gap-2 ml-2">
                    {isEditingProfile ? (
                        <button onClick={handleSaveProfile} className="flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700">
                            <Save className="w-3 h-3" /> Сохранить
                        </button>
                    ) : (
                        <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700">
                            <Edit3 className="w-3 h-3" /> Редактировать
                        </button>
                    )}
                    <button onClick={() => signOut(auth)} className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700">
                        <LogOut className="w-3 h-3" /> Выйти
                    </button>
                </div>
            </div>
            
          </div>
        </div>

        {/* Кнопка экспорта в PDF */}
        <div className="relative z-10 w-full md:w-auto flex flex-wrap gap-2">
          {user.role === 'student' && (
            <button
              onClick={() => {
                if (myPubs.length < 2) {
                  alert("Чтобы подать заявку и заявление на вступление в СНО, нужно иметь как минимум две публикации: две статьи или два доклада");
                  return;
                }
                generateSnoApplication();
              }}
              disabled={isGeneratingApplication}
              className={`px-3 py-2 rounded-lg ${myPubs.length < 2 ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center space-x-1.5 transition-all disabled:opacity-70`}
            >
              {isGeneratingApplication ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{myPubs.length < 2 ? 'Нужно 2+ публикации' : (isGeneratingApplication ? 'Генерация...' : 'Вступить в СНО')}</span>
            </button>
          )}

          <button
            onClick={exportPortfolioToPdf}
            disabled={isExporting}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-amber-500 text-[#0a2a5e] font-extrabold text-xs sm:text-sm shadow-sm hover:brightness-110 flex items-center justify-center space-x-1.5 transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            )}
            <span>{isExporting ? 'Генерация...' : 'Экспорт PDF'}</span>
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
          <div className="flex items-center justify-between pb-6 mb-8" style={{ borderBottom: '2px solid #0a2a5e' }}>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: '#0a2a5e' }}>SNO.PORTAL</h1>
              <p className="text-xs font-bold text-[#64748b]">БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Электронный документ</p>
              <p className="text-xs font-black text-[#d4af37]">ФАКУЛЬТЕТ ЭКОНОМИКИ И МЕНЕДЖМЕНТА</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-2 uppercase tracking-tight">ЭЛЕКТРОННОЕ ПОРТФОЛИО ИССЛЕДОВАТЕЛЯ</h2>
            <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: '#d4af37' }}></div>
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
                <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Факультет / Кафедра</p>
                <p className="text-sm font-bold text-[#334155]">{user.faculty} / {user.department}</p>
              </div>
            </div>
            <div className="rounded-2xl p-6 border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-center" style={{ color: '#0a2a5e' }}>Научный статус</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Публикации</span>
                  <span className="text-sm font-black text-[#0a2a5e]">{myPubs.length}</span>
                </div>
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Доклады</span>
                  <span className="text-sm font-black text-[#0a2a5e]">{myApps.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Рейтинг ФЭМ</span>
                  <span className="text-sm font-black text-[#d4af37]">{stats.ratingPoints}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #0a2a5e' }}>Список опубликованных научных работ</h3>
            <div className="space-y-4">
              {myPubs.length > 0 ? myPubs.map((p, idx) => (
                <div key={p.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: '#0a2a5e' }}>{idx + 1}.</span> {p.title}
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
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #0a2a5e' }}>Достижения и сертификаты</h3>
            <div className="space-y-4">
              {myCerts.length > 0 ? myCerts.map((c, idx) => (
                <div key={c.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: '#0a2a5e' }}>{idx + 1}.</span> {c.title}
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

      {/* Дашборд показателей (4 карточки) */}
      <div className="mb-6">
        <TelegramSettings user={user} onUpdate={onUpdateUser} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashStat title="Публикации" value={myPubs.length} desc={`${stats.totalPubs} верифицировано`} highlight />
        <DashStat title="Доклады" value={myApps.length} desc="конференции БГЭУ" />
        <DashStat 
          title="СНИЛ" 
          value={mySnilMembership ? 'Участник' : (mySnilApps.length > 0 ? 'Заявка' : 'Нет')} 
          desc={mySnilMembership ? mySnilMembership.name : (mySnilApps[0]?.snil_name || 'Не зачислен')} 
          highlight={!!mySnilMembership}
        />
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
        {user.role === 'snil_head' && (
          <SubTabBtn active={activeSubTab === 'snil_mgmt'} onClick={() => setActiveSubTab('snil_mgmt')} icon={<ShieldAlert className="w-5 h-5" />} label="Управление СНИЛ" />
        )}
      </div>

      {/* Вкладка 1: Публикации портфолио */}
      {activeSubTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-[#0a2a5e] dark:text-blue-300 flex items-center space-x-2">
                <GraduationCap className="w-6 h-6 text-[#d4af37]" />
                <span>Электронный реестр публикаций исследователя</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Все труды автоматически отправляются координатору науки ФЭМ для верификации</p>
            </div>
            <button
              onClick={() => setShowAddPub(!showAddPub)}
              className="px-4 py-2 rounded-xl bg-[#0a2a5e] text-[#d4af37] font-bold text-xs shadow hover:bg-blue-900 transition-colors flex items-center space-x-1 self-start"
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

      {/* Вкладка 3: Заявки на события и СНИЛ */}
      {activeSubTab === 'apps' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-8 animate-fadeIn transition-colors">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#0a2a5e] dark:text-blue-300 flex items-center space-x-2">
              <FlaskConical className="w-6 h-6 text-[#d4af37]" />
              <span>Заявления на вступление в СНИЛ</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySnilApps.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 col-span-2 italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">У вас нет активных заявлений в СНИЛ.</p>
              ) : (
                mySnilApps.map(app => (
                  <div key={app.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex justify-between items-center group hover:border-[#0a2a5e] transition-all">
                    <div>
                      <h4 className="font-black text-[#0a2a5e] dark:text-white uppercase text-[10px] tracking-widest mb-1">СНИЛ «{app.snil_name}»</h4>
                      <p className="text-[10px] text-slate-400">Подано: {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      app.status === 'принята' ? 'bg-green-100 text-green-700' : 
                      app.status === 'отклонена' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 border-t border-slate-100 dark:border-slate-800 pt-8">
            <h3 className="text-xl font-bold text-[#0a2a5e] dark:text-blue-300 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-[#d4af37]" />
              <span>Мои заявки на участие в конференциях</span>
            </h3>
            <div className="space-y-4">
              {myApps.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Вы ещё не подавали заявок на конференции.</p>
                </div>
              ) : (
                myApps.map(ap => (
                  <div key={ap.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm hover:border-blue-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase">
                        <span>{new Date(ap.created_at).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>ID: {ap.id.slice(-8)}</span>
                      </div>
                      <h4 className="font-bold text-[#0a2a5e] dark:text-blue-200">{ap.event_title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Тема: «{ap.topic}»</p>
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
                ))
              )}
            </div>
          </div>
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

      {/* Вкладка 5: Управление СНИЛ (для руководителей) */}
      {activeSubTab === 'snil_mgmt' && mySnil && (
        <div className="space-y-8 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Forms */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Announcements Form */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-[#0a2a5e] dark:text-blue-300">
                  <Megaphone className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Разместить объявление</h3>
                </div>
                
                <form onSubmit={handleAddAnn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Заголовок объявления</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Например: Срочное собрание СНИЛ"
                      value={annTitle}
                      onChange={e => setAnnTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Содержание</label>
                    <textarea 
                      required 
                      rows={4}
                      placeholder="Текст сообщения для участников вашей лаборатории..."
                      value={annContent}
                      onChange={e => setAnnContent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-blue-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={isAnnUrgent}
                        onChange={e => setIsAnnUrgent(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-[#0a2a5e] focus:ring-[#0a2a5e]"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#0a2a5e] transition-colors">Отметить как срочное</span>
                    </label>
                    <button type="submit" className="px-8 py-3 bg-[#0a2a5e] text-[#d4af37] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-900 shadow-lg transition-all active:scale-95">
                      Опубликовать
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcements List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-[#0a2a5e] dark:text-blue-300 uppercase tracking-tight">Ваши публикации</h3>
                <div className="space-y-4">
                  {mySnilAnnouncements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Вы еще не размещали объявлений.</p>
                  ) : (
                    mySnilAnnouncements.map(ann => (
                      <div key={ann.id} className={`p-5 rounded-2xl border ${ann.is_urgent ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'} flex justify-between items-start gap-4`}>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {ann.is_urgent && <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-800 text-[9px] font-black uppercase">Срочно</span>}
                            <span className="text-[10px] font-bold text-slate-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-[#0a2a5e] dark:text-white">{ann.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.content}</p>
                        </div>
                        <button 
                          onClick={() => {
                            deleteAnnouncement(ann.id);
                            onRefresh();
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Members and Stats */}
            <div className="space-y-8">
              
              {/* Add Member Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-[#0a2a5e] dark:text-blue-300">
                  <UserPlus className="w-6 h-6" />
                  <h3 className="text-lg font-black uppercase tracking-tight">Добавить участника</h3>
                </div>
                
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Введите номер зачетной книжки студента, подавшего заявление, чтобы добавить его в состав вашей СНИЛ.
                </p>

                <form onSubmit={handleAddMember} className="space-y-3">
                  <input 
                    type="text" 
                    required 
                    placeholder="Номер зачётки (8 цифр)"
                    value={studentRecordBookToAdd}
                    onChange={e => setStudentRecordBookToAdd(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-blue-500 transition-all dark:text-white font-mono"
                  />
                  {mgmtMessage.text && (
                    <div className={`text-[10px] font-bold px-3 py-2 rounded-lg ${mgmtMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {mgmtMessage.text}
                    </div>
                  )}
                  <button type="submit" className="w-full py-3.5 bg-[#d4af37] text-[#0a2a5e] font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg transition-all active:scale-95">
                    Добавить в состав
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-[#0a2a5e] dark:text-blue-300 uppercase tracking-tight">Участники</h3>
                  <span className="text-xs font-black bg-blue-100 dark:bg-blue-900/50 text-blue-700 px-2 py-1 rounded-lg">{mySnilMembers.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {mySnilMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">В вашей СНИЛ пока нет участников.</p>
                  ) : (
                    mySnilMembers.map(member => (
                      <div key={member.record_book_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0a2a5e] text-[#d4af37] flex items-center justify-center text-[10px] font-black">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 leading-tight">{member.last_name} {member.first_name[0]}.</p>
                            <p className="text-[9px] font-mono text-slate-400">{member.record_book_id}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            removeMemberFromSnil(mySnil.id, member.record_book_id);
                            onRefresh();
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Report Generation */}
              <div className="bg-gradient-to-br from-[#0a2a5e] to-blue-900 rounded-3xl p-8 text-white shadow-xl space-y-6 border border-[#d4af37]/30">
                <BarChart3 className="w-10 h-10 text-[#d4af37]" />
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight">Отчетность СНИЛ</h3>
                  <p className="text-xs text-blue-200/70 leading-relaxed">
                    Сгенерируйте официальный отчет об активности вашей лаборатории за текущий период для подачи в деканат.
                  </p>
                </div>
                <button 
                  onClick={generateSnilReport}
                  disabled={isGeneratingReport}
                  className="w-full py-4 bg-[#d4af37] text-[#0a2a5e] font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isGeneratingReport ? 'Подготовка...' : 'Сформировать отчет'}</span>
                </button>
              </div>

            </div>
          </div>

          {/* Hidden Report Template */}
          <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
            <div ref={reportRef} className="w-[800px] p-12 bg-white text-slate-900 font-sans" style={{ backgroundColor: '#ffffff' }}>
              {/* Branded Banner */}
              <div className="bg-[#0a2a5e] p-8 rounded-3xl text-white flex justify-between items-center mb-10 border-b-4 border-[#d4af37]">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[#d4af37] text-[10px] font-black uppercase tracking-widest">
                    <FlaskConical className="w-5 h-5" />
                    <span>SSO Portal • FEM BSEU</span>
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter">ОТЧЕТ АКТИВНОСТИ СНИЛ</h1>
                  <p className="text-sm font-bold text-blue-200 opacity-80 uppercase tracking-widest">Информационно-аналитическая система SNO.PORTAL</p>
                </div>
                <div className="text-right">
                  <p className="text-[40px] font-black text-[#d4af37] leading-none mb-1">2026</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Семестр II</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-[#0a2a5e] border-l-4 border-[#d4af37] pl-3 uppercase">О лаборатории</h2>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Наименование:</p>
                    <p className="text-lg font-black text-slate-800">СНИЛ «{mySnil.name}»</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Руководитель:</p>
                    <p className="text-sm font-bold text-slate-700">{mySnil.head_name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Кафедра:</p>
                    <p className="text-sm font-bold text-slate-700">{mySnil.department}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center items-center space-y-4">
                  <p className="text-xs font-black text-[#0a2a5e] uppercase tracking-widest">Статистика участников</p>
                  <div className="text-5xl font-black text-[#d4af37]">{mySnilMembers.length}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Активных исследователей</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h2 className="text-lg font-black text-[#0a2a5e] border-l-4 border-[#d4af37] pl-3 uppercase">Показатели эффективности</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Публикации</p>
                    <p className="text-2xl font-black text-[#0a2a5e]">14</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Доклады</p>
                    <p className="text-2xl font-black text-[#0a2a5e]">28</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Проекты</p>
                    <p className="text-2xl font-black text-[#0a2a5e]">3</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h2 className="text-lg font-black text-[#0a2a5e] border-l-4 border-[#d4af37] pl-3 uppercase">Недавние объявления</h2>
                <div className="space-y-3">
                  {mySnilAnnouncements.slice(0, 3).map(ann => (
                    <div key={ann.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                      <div className="flex justify-between mb-1">
                        <p className="text-xs font-bold text-slate-800">{ann.title}</p>
                        <p className="text-[9px] font-mono text-slate-400">{new Date(ann.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{ann.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-end">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <p>Документ сформирован системой SNO.PORTAL</p>
                  <p>Дата генерации: {new Date().toLocaleString()}</p>
                </div>
                <div className="flex space-x-12">
                  <div className="text-center">
                    <div className="w-24 h-12 border-b border-slate-300 mb-1"></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Руководитель</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-12 border-b border-slate-300 mb-1"></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Печать СНИЛ</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

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
