import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PortalDatabase, calculateResearcherStats, DEPARTMENTS, GROUPS, addNotificationAndNotifyTelegram, notifySnilMembers, getRoleTitle } from '../services/storage';
import { TelegramSettings } from './TelegramSettings';
import { CertificateModal } from './CertificateModal';
import { PublicationCertificateModal } from './PublicationCertificateModal';
import { UserAvatar } from './UserAvatar';
import { AvatarModal } from './AvatarModal';
import { CustomUser, Publication, Certificate, ResearchProject, PublicationCertificate } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { withSafeColorsForHtml2Canvas } from '../lib/pdfUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Award, 
  Trophy,
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
  FlaskConical,
  Check,
  Shield,
  Globe,
  Users,
  Settings,
  ChevronRight,
  UserCircle,
  Info
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
import { addAnnouncement, deleteAnnouncement, deletePublication, addMemberToSnil, removeMemberFromSnil, addAchievementToSnil, removeAchievementFromSnil, getPortalDB, savePortalDB, savePublicationCertificateToFirestore } from '../services/storage';

interface ProfileViewProps {
  db: PortalDatabase;
  user: CustomUser;
  onUpdateUser: (updated: CustomUser) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  db,
  user,
  onUpdateUser,
  onRefresh,
  onLogout
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
  const [tempIsPrivate, setTempIsPrivate] = useState(user.is_private || false);
  const [tempGender, setTempGender] = useState<'male' | 'female' | undefined>(user.gender);
  const [tempInterests, setTempInterests] = useState<string[]>(user.scientific_interests || []);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  const [newInterest, setNewInterest] = useState('');
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);
  const [viewingPubCert, setViewingPubCert] = useState<{pub: Publication, cert: PublicationCertificate | null} | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleSaveProfile = () => {
    const updated = { 
      ...user, 
      group: tempGroup, 
      department: tempDepartment, 
      is_private: tempIsPrivate, 
      gender: tempGender,
      scientific_interests: tempInterests
    };
    
    // Update in local DB
    const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
    if (dbUser) {
        dbUser.group = tempGroup;
        dbUser.department = tempDepartment;
        dbUser.is_private = tempIsPrivate;
        dbUser.gender = tempGender;
        dbUser.scientific_interests = tempInterests;
    }
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    
    onUpdateUser(updated);
    setIsEditingProfile(false);
    onRefresh();
  };

  const handleAddInterestToTemp = () => {
    if (!newInterest.trim()) return;
    if (tempInterests.includes(newInterest.trim())) {
      setNewInterest('');
      return;
    }
    setTempInterests([...tempInterests, newInterest.trim()]);
    setNewInterest('');
  };

  const handleRemoveInterestFromTemp = (interest: string) => {
    setTempInterests(tempInterests.filter(i => i !== interest));
  };

  const handleSaveAvatar = (newAvatarUrl: string) => {
    const updated = { ...user, avatar_url: newAvatarUrl };
    const dbUser = db.users.find(u => u.record_book_id === user.record_book_id);
    if (dbUser) {
        dbUser.avatar_url = newAvatarUrl;
    }
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onUpdateUser(updated);
    setShowAvatarModal(false);
  };

  // SNIL Management State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [isAnnUrgent, setIsAnnUrgent] = useState(false);
  const [studentRecordBookToAdd, setStudentRecordBookToAdd] = useState('');
  const [mgmtMessage, setMgmtMessage] = useState({ text: '', type: '' });
  const [newSnilAchievement, setNewSnilAchievement] = useState('');
  
  const myPubs = useMemo(() => (db.publications || []).filter(p => p.user_record_book === user.record_book_id), [db.publications, user.record_book_id]);
  const myApps = useMemo(() => (db.applications || []).filter(a => a.student_record_book === user.record_book_id), [db.applications, user.record_book_id]);
  const myCerts = useMemo(() => (db.certificates || []).filter(c => c.user_record_book === user.record_book_id), [db.certificates, user.record_book_id]);
  const myPubCerts = useMemo(() => (db.publication_certificates || []).filter(c => c.user_record_book === user.record_book_id), [db.publication_certificates, user.record_book_id]);

  const handleOpenPubCert = (pub: Publication) => {
    const existingCert = myPubCerts.find(c => c.publication_id === pub.id);
    setViewingPubCert({ pub, cert: existingCert || null });
  };

  const handleGeneratePubCert = async (pubId: string, gender?: 'male' | 'female') => {
    if (!viewingPubCert || !viewingPubCert.pub) return;
    
    // Update user gender if provided during generation
    if (gender && !user.gender) {
      onUpdateUser({ ...user, gender });
    }

    // Generate a unique number
    const certNumber = Math.floor(10000 + Math.random() * 90000).toString();
    
    const newCert: PublicationCertificate = {
      id: 'pub_cert_' + Date.now(),
      number: certNumber,
      user_record_book: user.record_book_id,
      user_name: `${user.last_name} ${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''}`,
      publication_id: pubId,
      publication_title: viewingPubCert.pub.title,
      publication_type: viewingPubCert.pub.type,
      publication_journal: viewingPubCert.pub.journal,
      publication_year: viewingPubCert.pub.year,
      issue_date: new Date().toISOString(),
      status: 'issued'
    };
    
    const portalDb = getPortalDB();
    if (!portalDb.publication_certificates) {
      portalDb.publication_certificates = [];
    }
    
    // Support regeneration by removing old certificate for this publication
    portalDb.publication_certificates = portalDb.publication_certificates.filter(c => c.publication_id !== pubId);
    portalDb.publication_certificates.push(newCert);
    savePortalDB(portalDb);
    
    try {
      await savePublicationCertificateToFirestore(newCert);
    } catch (error) {
      console.error(error);
    }
    
    setViewingPubCert({ pub: viewingPubCert.pub, cert: newCert });
    onRefresh();
  };
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

  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mySnil || !newSnilAchievement.trim()) return;
    addAchievementToSnil(mySnil.id, newSnilAchievement.trim());
    setNewSnilAchievement('');
    onRefresh();
  };

  const handleRemoveAchievement = (index: number) => {
    if (!mySnil) return;
    if (window.confirm('Вы уверены, что хотите удалить это научное достижение?')) {
      removeAchievementFromSnil(mySnil.id, index);
      onRefresh();
    }
  };

  const generateSnilReport = async () => {
    if (!reportRef.current || !mySnil) return;
    setIsGeneratingReport(true);
    try {
      let canvas: HTMLCanvasElement | null = null;
      await withSafeColorsForHtml2Canvas(reportRef.current, async () => {
        canvas = await html2canvas(reportRef.current!, { scale: 2, useCORS: true });
      });
      if (!canvas) throw new Error("Canvas render failed");
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
      // Ensure fonts are loaded
      await document.fonts.ready;
      
      // Scroll to top to ensure clean capture
      const scrollPos = window.scrollY;
      window.scrollTo(0, 0);

      let canvas: HTMLCanvasElement | null = null;
      await withSafeColorsForHtml2Canvas(pdfTemplateRef.current, async () => {
        canvas = await html2canvas(pdfTemplateRef.current!, {
          scale: 3, // Higher resolution for better quality
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
          allowTaint: true
        });
      });
      
      // Restore scroll position
      window.scrollTo(0, scrollPos);

      if (!canvas) throw new Error("Canvas render failed");
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      let pageNumber = 1;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Subsequent pages
      while (heightLeft > 0) {
        position = -(pdfHeight * pageNumber);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        pageNumber++;
      }

      pdf.save(`Портфолио_студента_исследователя_${user.last_name}.pdf`);
    } catch (error) {
      console.error('Portfolio PDF Export Error:', error);
      alert('Ошибка при генерации портфолио. Пожалуйста, попробуйте позже.');
    } finally {
      setIsExporting(false);
    }
  };

  const generateSnoApplication = async () => {
    if (!snoApplicationRef.current) return;
    setIsGeneratingApplication(true);
    
    try {
      let canvas: HTMLCanvasElement | null = null;
      await withSafeColorsForHtml2Canvas(snoApplicationRef.current, async () => {
        canvas = await html2canvas(snoApplicationRef.current!, {
          scale: 3, // Higher quality for text
          useCORS: true,
          backgroundColor: '#ffffff'
        });
      });
      if (!canvas) throw new Error("Canvas render failed");
      
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

      showToast('Заявление успешно сгенерировано и скачано! Координатор СНО уведомлен.', 'success');
    } catch (error) {
      console.error('Application PDF Error:', error);
      showToast('Ошибка при генерации заявления.', 'error');
    } finally {
      setIsGeneratingApplication(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none"
          >
            <div className={`p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 pointer-events-auto ${
              toast.type === 'success' 
                ? 'border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/10' 
                : toast.type === 'error'
                  ? 'border-green-200 dark:border-green-800/80 text-green-800 dark:text-green-300 shadow-red-500/10'
                  : 'border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 shadow-blue-500/10'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              {toast.type === 'error' && <ShieldAlert className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {toast.type === 'info' && <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              <span className="flex-1 leading-normal">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Профиль карточка исследователя */}
      <div className="bg-gradient-to-r from-[#052e16] via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-[#10b981]/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#10b981]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto">
          <div 
            onClick={() => setShowAvatarModal(true)}
            className="relative group cursor-pointer w-16 sm:w-24 h-16 sm:h-24 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl hover:scale-105 transition-all flex-shrink-0 mx-auto sm:mx-0"
            title="Изменить аватар"
          >
            <UserAvatar size="2xl" user={user} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold text-[#10b981] font-mono text-center px-1">
              <Sparkles className="w-4 h-4 mb-1" />
              <span>ИЗМЕНИТЬ</span>
            </div>
          </div>
          <div className="space-y-1 w-full text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
              <span className={`px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider border ${
                user.role === 'admin' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                user.role === 'coordinator' ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' :
                user.role === 'snil_head' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                user.role === 'activist' ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {getRoleTitle(user.role)}
              </span>
              <span className="px-2 sm:px-3 py-0.5 rounded-full bg-[#10b981] text-[#052e16] font-bold text-[9px] sm:text-xs uppercase tracking-wider whitespace-nowrap">
                Зачётка № {user.record_book_id}
              </span>
              <span className="text-[9px] sm:text-xs font-mono bg-blue-950 px-2 py-0.5 rounded text-emerald-300 flex items-center gap-2 whitespace-nowrap">
                Группа: {user.group}
              </span>
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight leading-tight">{user.last_name} {user.first_name}</h1>
            <div className="text-emerald-200 text-[10px] sm:text-sm opacity-90 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {user.faculty} • {user.department}
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsEditingProfile(true)} 
            className="flex items-center justify-center gap-2 bg-white/10 text-white border border-white/20 text-xs sm:text-sm px-4 py-2.5 rounded-xl hover:bg-white/20 transition-all font-bold shadow-lg w-full sm:w-auto group"
          >
            <Settings className="w-4 h-4 text-[#10b981] group-hover:rotate-90 transition-transform duration-500" /> Настройки
          </button>

          {user.role === 'student' && (
            <button
              onClick={() => {
                if (myPubs.length < 2) {
                  alert("Для вступления в СНО необходимо иметь 2+ научные публикации (статьи или тезисы докладов). Пока у вас: " + myPubs.length);
                  return;
                }
                generateSnoApplication();
              }}
              disabled={isGeneratingApplication}
              className={`px-4 py-2 rounded-xl ${myPubs.length < 2 ? 'bg-slate-500/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-blue-600/20'} text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-70 w-full sm:w-auto`}
            >
              {isGeneratingApplication ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
              <div className="flex flex-col items-start text-left leading-none">
                <span>Вступить в СНО</span>
                <span className="text-[9px] opacity-70 mt-0.5">Нужно 2+ публикации</span>
              </div>
            </button>
          )}

          <button
            onClick={exportPortfolioToPdf}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-emerald-500 text-[#052e16] font-extrabold text-xs sm:text-sm shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all group disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto sm:col-span-2 lg:col-span-1"
            title="Выгрузить полный отчет о научной активности"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Генерация...' : 'Портфолио студента-исследователя'}</span>
          </button>

          {showLogoutConfirm ? (
            <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-2 rounded-xl w-full sm:w-auto">
              <span className="text-xs font-bold text-green-400">Выйти?</span>
              <button
                onClick={onLogout}
                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-black shadow-sm transition-colors"
              >
                Да
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Нет
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center justify-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 text-xs sm:text-sm px-4 py-2.5 rounded-xl hover:bg-green-500/20 transition-all font-bold shadow-lg w-full sm:w-auto group"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> Выйти
            </button>
          )}
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
          <div className="flex items-center justify-between pb-6 mb-8" style={{ borderBottom: '2px solid #052e16' }}>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: '#052e16' }}>SNO.PORTAL</h1>
              <p className="text-xs font-bold text-[#64748b]">БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ ЭКОНОМИЧЕСКИЙ УНИВЕРСИТЕТ</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Электронный документ</p>
              <p className="text-xs font-black text-[#10b981]">ФАКУЛЬТЕТ ЭКОНОМИКИ И МЕНЕДЖМЕНТА</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-[#0f172a] mb-2 uppercase tracking-tight">ЭЛЕКТРОННОЕ ПОРТФОЛИО ИССЛЕДОВАТЕЛЯ</h2>
            <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
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
              <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-center" style={{ color: '#052e16' }}>Научный статус</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Публикации</span>
                  <span className="text-sm font-black text-[#052e16]">{myPubs.length}</span>
                </div>
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Доклады</span>
                  <span className="text-sm font-black text-[#052e16]">{myApps.length}</span>
                </div>
                {mySnilMembership && (
                  <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">СНИЛ</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Участник</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Рейтинг ФЭМ</span>
                  <span className="text-sm font-black text-[#10b981]">{stats.ratingPoints}</span>
                </div>
              </div>
            </div>
          </div>

          {user.scientific_interests.length > 0 && (
            <div className="mb-10">
              <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Научные интересы</h3>
              <div className="flex flex-wrap gap-2">
                {user.scientific_interests.map(interest => (
                  <span key={interest} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200 uppercase tracking-wide">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Список опубликованных научных работ</h3>
            <div className="space-y-4">
              {myPubs.length > 0 ? myPubs.map((p, idx) => (
                <div key={p.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: '#052e16' }}>{idx + 1}.</span> {p.title}
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
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Участие в научных мероприятиях</h3>
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
                    <span className="text-[9px] font-black uppercase" style={{ color: '#10b981' }}>{a.status}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#94a3b8] italic">Заявки на конференции отсутствуют</p>
              )}
            </div>
          </div>

          {(mySnilMembership || mySnilApps.length > 0) && (
            <div className="mb-10">
              <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Участие в деятельности СНИЛ</h3>
              <div className="space-y-4">
                {mySnilMembership && (
                  <div className="p-4 rounded-xl border border-blue-50" style={{ backgroundColor: '#f0f9ff' }}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-[#0369a1]">{mySnilMembership.name}</p>
                      <span className="text-[9px] font-black text-[#0ea5e9] uppercase tracking-widest">Действующий участник</span>
                    </div>
                    <p className="text-[10px] text-[#64748b] leading-relaxed mb-3">{mySnilMembership.description}</p>
                    <div className="flex items-center space-x-2">
                       <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                         {user.role === 'snil_head' ? 'Руководитель СНИЛ' : 'Член СНИЛ'}
                       </span>
                       <span className="text-[9px] font-bold text-slate-400">Зачислено: {new Date(mySnilMembership.created_at || Date.now()).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                )}
                {mySnilApps.map(app => (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-100 border-dashed">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Заявка на вступление: {app.snil_name}</p>
                        <p className="text-[10px] text-slate-500 italic mt-1">«{app.motivation_letter.substring(0, 100)}...»</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                          app.status === 'pending' ? 'bg-slate-100 text-slate-600' : 
                          app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {app.status === 'pending' ? 'На рассмотрении' : (app.status === 'approved' ? 'Одобрено' : 'Отклонено')}
                        </span>
                        <p className="text-[8px] text-slate-400 mt-1 font-bold">{new Date(app.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myTasks.length > 0 && (
            <div className="mb-10">
              <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Индивидуальные научные задачи</h3>
              <div className="space-y-3">
                {myTasks.map((t, idx) => (
                  <div key={t.id} className="p-3 rounded-xl border border-slate-50 flex items-center justify-between" style={{ backgroundColor: '#fafafa' }}>
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{t.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{t.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${
                        t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-emerald-100/50 text-emerald-700'
                      }`}>
                        {t.status === 'completed' ? 'Выполнено' : 'В работе'}
                      </span>
                      {t.due_date && <p className="text-[8px] text-slate-400 mt-1 font-bold">Срок: {new Date(t.due_date).toLocaleDateString('ru-RU')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-lg font-black text-[#1e293b] mb-4 pl-3 uppercase tracking-tight" style={{ borderLeft: '4px solid #052e16' }}>Достижения и сертификаты</h3>
            <div className="space-y-4">
              {myCerts.length > 0 ? myCerts.map((c, idx) => (
                <div key={c.id} className="p-4 rounded-xl border border-[#f1f5f9]" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-[#1e293b] leading-tight">
                      <span className="mr-2" style={{ color: '#052e16' }}>{idx + 1}.</span> {c.title}
                    </p>
                    <span className="text-[9px] font-black text-[#94a3b8] uppercase ml-4 flex-shrink-0">{new Date(c.issue_date).getFullYear()} г.</span>
                  </div>
                  <p className="text-[10px] text-[#64748b] font-medium mb-1">
                    <span className="font-bold uppercase mr-1" style={{ color: '#475569' }}>Мероприятие:</span> {c.event_name}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                      {c.type.replace(/_/g, ' ')}
                    </span>
                    <button 
                      onClick={() => setViewingCert(c)}
                      className="text-[10px] font-black text-[#052e16] hover:text-emerald-800 uppercase tracking-widest flex items-center space-x-1 border border-[#052e16]/20 px-2.5 py-1 rounded bg-white hover:bg-[#052e16]/5 transition-all"
                    >
                      <span>Смотреть</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
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
      <div className="mb-4 sm:mb-6">
        <TelegramSettings user={user} onUpdate={onUpdateUser} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <DashStat title="Публикации" value={myPubs.length} desc={`${stats.totalPubs} верифицировано`} highlight />
        <DashStat title="Доклады" value={myApps.length} desc="конференции БГЭУ" />
        <DashStat 
          title="СНИЛ" 
          value={mySnilMembership ? 'Участник' : (mySnilApps.length > 0 ? 'Заявка' : 'Нет')} 
          desc={mySnilMembership ? mySnilMembership.name : (mySnilApps[0]?.snil_name || 'Не зачислен')} 
          highlight={!!mySnilMembership}
        />
        <DashStat title="Задачи" value={myTasks.length} desc="поручения" />
      </div>

      {/* График научной активности */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-emerald-100 tracking-tight">Научная активность</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-tight">Динамика публикаций и заявок</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
             <div className="flex items-center space-x-1.5">
               <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#10b981]"></div>
               <span className="text-slate-500 dark:text-slate-400">Труды</span>
             </div>
             <div className="flex items-center space-x-1.5">
               <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-600"></div>
               <span className="text-slate-500 dark:text-slate-400">Заявки</span>
             </div>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                stroke="#10b981" 
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
              <h3 className="text-xl font-bold text-[#052e16] dark:text-emerald-300 flex items-center space-x-2">
                <GraduationCap className="w-6 h-6 text-[#10b981]" />
                <span>Электронный реестр публикаций исследователя</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Все труды автоматически отправляются координатору науки ФЭМ для верификации</p>
            </div>
            <button
              onClick={() => setShowAddPub(!showAddPub)}
              className="px-4 py-2 rounded-xl bg-[#052e16] text-[#10b981] font-bold text-xs shadow hover:bg-emerald-900 transition-colors flex items-center space-x-1 self-start"
            >
              <Plus className="w-4 h-4" /> <span>Добавить труд</span>
            </button>
          </div>

          {/* Форма добавления работы */}
          {showAddPub && (
            <form onSubmit={handleAddPublication} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-inner space-y-4 animate-fadeIn transition-colors">
              <h4 className="font-bold text-sm text-[#052e16] dark:text-emerald-300">Регистрация нового научного труда</h4>
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
                  <label className="block text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Сборник / Научное издание *</label>
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
                <button type="submit" className="px-6 py-3 bg-[#10b981] text-[#052e16] font-bold text-sm rounded-xl shadow hover:brightness-105 transition-all order-1 sm:order-2">Сохранить в портфолио</button>
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
                <div key={pb.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#052e16] dark:hover:border-emerald-700 bg-slate-50/50 dark:bg-slate-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-400 font-bold uppercase">{pb.type}</span>
                      <span className="text-slate-500 dark:text-slate-400">{pb.year} г.</span>
                      {pb.is_confirmed ? (
                        <span className="text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" /> <span>Верифицировано СНО</span>
                        </span>
                      ) : (
                        <span className="text-amber-800 dark:text-emerald-500 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3" /> <span>На рассмотрении координатора</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-[#052e16] dark:text-emerald-200 leading-snug">{pb.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">📖 Издание: <strong>{pb.journal}</strong></p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenPubCert(pb)}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={pb.is_confirmed ? "Справка о наличии публикации" : "Ожидайте верификации СНО"}
                      disabled={!pb.is_confirmed}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {pb.link && (
                      <a href={pb.link} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-blue-50 dark:hover:bg-emerald-900/30 transition-all" title="Открыть ссылку">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={async () => {
                        await deletePublication(pb.id);
                        onRefresh();
                      }}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
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
              <h3 className="text-xl font-bold text-[#052e16] flex items-center space-x-2">
                <Award className="w-6 h-6 text-[#10b981]" />
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
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Award className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.issue_date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1 leading-snug">{c.title}</h4>
                  <p className="text-xs text-slate-500 mb-3">{c.event_name}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      c.type.startsWith('диплом') ? 'bg-emerald-100/50 text-emerald-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {c.type.replace(/_/g, ' ')}
                    </span>
                    <button 
                      onClick={() => setViewingCert(c)}
                      className="text-emerald-600 hover:text-emerald-800 transition-colors flex items-center space-x-1 border border-emerald-100 bg-blue-50/50 hover:bg-emerald-100/50 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                      title="Посмотреть электронный диплом/сертификат"
                    >
                      <span>Просмотр</span>
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
            <h3 className="text-xl font-bold text-[#052e16] dark:text-emerald-300 flex items-center space-x-2">
              <FlaskConical className="w-6 h-6 text-[#10b981]" />
              <span>Заявления на вступление в СНИЛ</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySnilApps.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 col-span-2 italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">У вас нет активных заявлений в СНИЛ.</p>
              ) : (
                mySnilApps.map(app => (
                  <div key={app.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex justify-between items-center group hover:border-[#052e16] transition-all">
                    <div>
                      <h4 className="font-black text-[#052e16] dark:text-white uppercase text-[10px] tracking-widest mb-1">СНИЛ «{app.snil_name}»</h4>
                      <p className="text-[10px] text-slate-400">Подано: {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      app.status === 'принята' ? 'bg-green-100 text-green-700' : 
                      app.status === 'отклонена' ? 'bg-green-100 text-green-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 border-t border-slate-100 dark:border-slate-800 pt-8">
            <h3 className="text-xl font-bold text-[#052e16] dark:text-emerald-300 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-[#10b981]" />
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
                  <div key={ap.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm hover:border-emerald-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 uppercase">
                        <span>{new Date(ap.created_at).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>ID: {ap.id.slice(-8)}</span>
                      </div>
                      <h4 className="font-bold text-[#052e16] dark:text-emerald-200">{ap.event_title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Тема: «{ap.topic}»</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ap.status === 'принята' ? 'bg-green-100 text-green-700' : 
                        ap.status === 'отклонена' ? 'bg-green-100 text-green-700' : 
                        'bg-emerald-100/50 text-emerald-700'
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
          <h3 className="text-lg font-bold text-[#052e16]">Мои исследовательские поручения в СНИЛ</h3>
          {myTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Вам пока не назначено задач от руководителей лабораторий.</p>
          ) : (
            <div className="space-y-3">
              {myTasks.map(t => (
                <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-teal-600 font-bold uppercase">{t.snil_name}</span>
                    <h4 className="font-bold text-sm text-[#052e16]">{t.title}</h4>
                    <p className="text-xs text-slate-600">{t.description}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${t.status === 'выполнена' ? 'bg-green-100 text-green-800' : 'bg-emerald-100 text-emerald-800'}`}>
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
                <div className="flex items-center space-x-3 text-[#052e16] dark:text-emerald-300">
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-emerald-500 transition-all dark:text-white"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={isAnnUrgent}
                        onChange={e => setIsAnnUrgent(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-[#052e16] focus:ring-[#052e16]"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#052e16] transition-colors">Отметить как срочное</span>
                    </label>
                    <button type="submit" className="px-8 py-3 bg-[#052e16] text-[#10b981] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-900 shadow-lg transition-all active:scale-95">
                      Опубликовать
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcements List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-[#052e16] dark:text-emerald-300 uppercase tracking-tight">Ваши публикации</h3>
                <div className="space-y-4">
                  {mySnilAnnouncements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Вы еще не размещали объявлений.</p>
                  ) : (
                    mySnilAnnouncements.map(ann => (
                      <div key={ann.id} className={`p-5 rounded-2xl border ${ann.is_urgent ? 'bg-blue-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'} flex justify-between items-start gap-4`}>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {ann.is_urgent && <span className="px-2 py-0.5 rounded bg-emerald-200/50 text-amber-800 text-[9px] font-black uppercase">Срочно</span>}
                            <span className="text-[10px] font-bold text-slate-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-[#052e16] dark:text-white">{ann.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.content}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            await deleteAnnouncement(ann.id);
                            onRefresh();
                          }}
                          className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Achievements Management Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 text-[#052e16] dark:text-emerald-300">
                  <Trophy className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Достижения и результаты СНИЛ</h3>
                </div>

                <form onSubmit={handleAddAchievement} className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    placeholder="Например: Разработка новой экономической модели или патент"
                    value={newSnilAchievement}
                    onChange={e => setNewSnilAchievement(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-emerald-500 transition-all dark:text-white"
                  />
                  <button type="submit" className="px-5 py-3 bg-[#052e16] text-[#10b981] font-black rounded-xl hover:bg-emerald-900 transition-all flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs uppercase tracking-widest">Добавить</span>
                  </button>
                </form>

                <div className="space-y-3">
                  {(!mySnil.achievements || mySnil.achievements.length === 0) ? (
                    <p className="text-sm text-slate-400 text-center py-6">Достижения и результаты вашей лаборатории еще не добавлены.</p>
                  ) : (
                    mySnil.achievements.map((ach, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 gap-4">
                        <div className="flex items-start space-x-2.5">
                          <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{ach}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveAchievement(index)}
                          className="p-1.5 text-slate-400 hover:text-green-500 transition-colors flex-shrink-0"
                          title="Удалить достижение"
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
                <div className="flex items-center space-x-3 text-[#052e16] dark:text-emerald-300">
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:border-emerald-500 transition-all dark:text-white font-mono"
                  />
                  {mgmtMessage.text && (
                    <div className={`text-[10px] font-bold px-3 py-2 rounded-lg ${mgmtMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-700'}`}>
                      {mgmtMessage.text}
                    </div>
                  )}
                  <button type="submit" className="w-full py-3.5 bg-[#10b981] text-[#052e16] font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg transition-all active:scale-95">
                    Добавить в состав
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-[#052e16] dark:text-emerald-300 uppercase tracking-tight">Участники</h3>
                  <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 px-2 py-1 rounded-lg">{mySnilMembers.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {mySnilMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">В вашей СНИЛ пока нет участников.</p>
                  ) : (
                    mySnilMembers.map(member => (
                      <div key={member.record_book_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center space-x-3">
                          <UserAvatar size="sm" user={member} />
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
                          className="p-1.5 text-slate-300 hover:text-green-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Report Generation */}
              <div className="bg-gradient-to-br from-[#052e16] to-emerald-900 rounded-3xl p-8 text-white shadow-xl space-y-6 border border-[#10b981]/30">
                <BarChart3 className="w-10 h-10 text-[#10b981]" />
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight">Отчетность СНИЛ</h3>
                  <p className="text-xs text-emerald-200/70 leading-relaxed">
                    Сгенерируйте официальный отчет об активности вашей лаборатории за текущий период для подачи в деканат.
                  </p>
                </div>
                <button 
                  onClick={generateSnilReport}
                  disabled={isGeneratingReport}
                  className="w-full py-4 bg-[#10b981] text-[#052e16] font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
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
              <div className="bg-[#052e16] p-8 rounded-3xl text-white flex justify-between items-center mb-10 border-b-4 border-[#10b981]">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[#10b981] text-[10px] font-black uppercase tracking-widest">
                    <FlaskConical className="w-5 h-5" />
                    <span>SSO Portal • FEM BSEU</span>
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter">ОТЧЕТ АКТИВНОСТИ СНИЛ</h1>
                  <p className="text-sm font-bold text-emerald-200 opacity-80 uppercase tracking-widest">Информационно-аналитическая система SNO.PORTAL</p>
                </div>
                <div className="text-right">
                  <p className="text-[40px] font-black text-[#10b981] leading-none mb-1">2026</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Семестр II</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-[#052e16] border-l-4 border-[#10b981] pl-3 uppercase">О лаборатории</h2>
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
                  <p className="text-xs font-black text-[#052e16] uppercase tracking-widest">Статистика участников</p>
                  <div className="text-5xl font-black text-[#10b981]">{mySnilMembers.length}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Активных исследователей</p>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h2 className="text-lg font-black text-[#052e16] border-l-4 border-[#10b981] pl-3 uppercase">Показатели эффективности</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Публикации</p>
                    <p className="text-2xl font-black text-[#052e16]">14</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-amber-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Доклады</p>
                    <p className="text-2xl font-black text-[#052e16]">28</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Проекты</p>
                    <p className="text-2xl font-black text-[#052e16]">3</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <h2 className="text-lg font-black text-[#052e16] border-l-4 border-[#10b981] pl-3 uppercase">Недавние объявления</h2>
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
            <h3 className="text-lg font-bold text-[#052e16] dark:text-emerald-300">Теги научных интересов</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Используются системой для персональной рекомендации конференций и подбора команд СНИЛ</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {user.scientific_interests.map(intr => (
              <span key={intr} className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-emerald-200 font-medium text-xs flex items-center space-x-2 border border-emerald-100 dark:border-emerald-900 shadow-sm transition-colors">
                <span>💡 {intr}</span>
              </span>
            ))}
            {user.scientific_interests.length === 0 && (
              <p className="text-sm text-slate-400 italic">Научные интересы не указаны. Нажмите «Настройки», чтобы добавить их.</p>
            )}
          </div>
          
          <button 
            onClick={() => {
              setTempInterests([...user.scientific_interests]);
              setIsEditingProfile(true);
            }}
            className="mt-4 px-6 py-3 bg-emerald-600/10 text-emerald-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600/20 transition-all"
          >
            Редактировать интересы
          </button>
        </div>
      )}

      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          recipientUser={user}
          onClose={() => setViewingCert(null)}
        />
      )}

      {showAvatarModal && (
        <AvatarModal
          currentAvatar={user.avatar_url}
          userName={`${user.first_name} ${user.last_name}`}
          onClose={() => setShowAvatarModal(false)}
          onSave={handleSaveAvatar}
        />
      )}

      {viewingPubCert && (
        <PublicationCertificateModal
          certificate={viewingPubCert.cert}
          publication={viewingPubCert.pub}
          user={user}
          onClose={() => setViewingPubCert(null)}
          onGenerate={handleGeneratePubCert}
        />
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto" onClick={() => setIsEditingProfile(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-2xl shadow-2xl relative flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[95vh] sm:max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                    <UserCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Настройки</h2>
                    <p className="text-[10px] sm:text-sm text-slate-500">Управляйте своими данными</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 sm:space-y-8 flex-1 scrollbar-none">
                {/* Academic Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <GraduationCap className="w-5 h-5" />
                    <h3 className="font-black uppercase text-xs tracking-widest">Академические данные</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Группа</label>
                      <div className="relative group">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                        <select 
                          value={tempGroup} 
                          onChange={e => setTempGroup(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-800 dark:text-white font-bold"
                        >
                          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Ваш пол</label>
                      <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <button 
                          onClick={() => setTempGender('male')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all ${tempGender === 'male' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Мужской
                        </button>
                        <button 
                          onClick={() => setTempGender('female')}
                          className={`flex-1 py-3 rounded-xl font-bold transition-all ${tempGender === 'female' ? 'bg-white dark:bg-slate-700 shadow-md text-pink-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Женский
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Кафедра</label>
                    <div className="relative group">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                      <select 
                        value={tempDepartment} 
                        onChange={e => setTempDepartment(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none text-slate-800 dark:text-white font-bold"
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Interests Section */}
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-black uppercase text-xs tracking-widest">Научные интересы</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Добавить интерес..."
                        value={newInterest}
                        onChange={e => setNewInterest(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterestToTemp())}
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-emerald-600 outline-none text-sm"
                      />
                      <button 
                        onClick={handleAddInterestToTemp}
                        className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tempInterests.map(interest => (
                        <span key={interest} className="px-3 py-1.5 bg-blue-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
                          {interest}
                          <button onClick={() => handleRemoveInterestFromTemp(interest)} className="hover:text-green-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {tempInterests.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-2">Список интересов пуст</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy Section */}
                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Shield className="w-5 h-5" />
                    <h3 className="font-black uppercase text-xs tracking-widest">Приватность</h3>
                  </div>

                  <div 
                    onClick={() => setTempIsPrivate(!tempIsPrivate)}
                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${tempIsPrivate ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tempIsPrivate ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {tempIsPrivate ? <Shield className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Приватный профиль</p>
                        <p className="text-xs text-slate-500">Скрыть мои данные из общего рейтинга</p>
                      </div>
                    </div>
                    <div className={`w-14 h-8 rounded-full relative transition-all duration-300 ${tempIsPrivate ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${tempIsPrivate ? 'left-7' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-emerald-900/10 p-6 rounded-[2rem] flex gap-4 border border-emerald-100 dark:border-emerald-900/30">
                  <Info className="w-6 h-6 text-emerald-600 shrink-0" />
                  <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                    Данные о вашей группе и кафедре используются для участия в командных рейтингах. Выбор пола необходим для автоматической подстановки окончаний в официальных справках («студенту»/«студентке»).
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-3 sm:gap-4 shrink-0">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm sm:text-base"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-[2] py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-700 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Save className="w-5 h-5" />
                  Сохранить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const DashStat: React.FC<{ title: string; value: number | string; desc: string; highlight?: boolean }> = ({ title, value, desc, highlight }) => (
  <div className={`p-5 rounded-2xl border transition-all ${
    highlight 
      ? 'bg-[#052e16] dark:bg-emerald-900/40 border-[#10b981]/40 text-white' 
      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-emerald-100 shadow-sm'
  }`}>
    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-emerald-300' : 'text-slate-400 dark:text-slate-500'}`}>{title}</p>
    <p className={`text-2xl font-black font-mono ${highlight ? 'text-white' : 'text-[#052e16] dark:text-[#10b981]'}`}>{value}</p>
    <p className={`text-[10px] mt-1 font-medium ${highlight ? 'text-emerald-200 opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>{desc}</p>
  </div>
);

const SubTabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2.5 px-4 py-3.5 rounded-xl transition-all whitespace-nowrap min-h-[44px] ${
      active 
        ? 'bg-[#052e16] text-[#10b981] shadow-lg scale-[1.02]' 
        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95'
    }`}
  >
    {icon}
    <span className="font-bold text-xs sm:text-sm">{label}</span>
    {count > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
        active ? 'bg-[#10b981] text-[#052e16]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      }`}>
        {count}
      </span>
    )}
  </button>
);
