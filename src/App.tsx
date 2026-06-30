/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getPortalDB, savePortalDB, fetchPortalDBFromFirestore, PortalDatabase, canAccessAdmin } from './services/storage';
import { migrateLocalStorageToFirestore } from './services/migration';
import { CustomUser } from './types';
import { Navbar } from './components/Navbar';
import { Code2 } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { DjangoCodeModal } from './components/DjangoCodeModal';
import { FeedView } from './components/FeedView';
import { EventsView } from './components/EventsView';
import { SnilView } from './components/SnilView';
import { RatingView } from './components/RatingView';
import { GalleryView } from './components/GalleryView';
import { FAQView } from './components/FAQView';
import { MerchView } from './components/MerchView';
import { SecurityView } from './components/SecurityView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { QuizzesView } from './components/QuizzesView';
import { AnimatePresence, motion } from 'motion/react';
import { doc, updateDoc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db as firestoreDb } from './lib/firebase';

export default function App() {
  const [db, setDb] = useState<PortalDatabase>(getPortalDB());
  const [user, setUser] = useState<CustomUser | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedSnilId, setSelectedSnilId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDjangoModal, setShowDjangoModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('fem_bseu_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Восстанавливаем данные из Firestore и сессию из localStorage
  useEffect(() => {
    fetchPortalDBFromFirestore().then(firestoreDbData => {
      if (firestoreDbData && Object.keys(firestoreDbData).length > 0) {
        setDb(firestoreDbData);
        savePortalDB(firestoreDbData);
      }
    }).catch(console.error);

    const savedUser = localStorage.getItem('fem_bseu_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Синхронизация списка аккаунтов (пользователей) с Firestore в реальном времени
  useEffect(() => {
    try {
      const usersColRef = collection(firestoreDb, 'users');
      const unsubscribe = onSnapshot(usersColRef, (snapshot) => {
        const firestoreUsers: CustomUser[] = [];
        snapshot.forEach((doc) => {
          firestoreUsers.push(doc.data() as CustomUser);
        });
        
        if (firestoreUsers.length > 0) {
          setDb(prevDb => {
            const updatedDb = { ...prevDb };
            const mergedUsers = [...(updatedDb.users || [])];
            
            firestoreUsers.forEach(fUser => {
              const index = mergedUsers.findIndex(u => u.record_book_id === fUser.record_book_id);
              if (index !== -1) {
                mergedUsers[index] = { ...mergedUsers[index], ...fUser };
              } else {
                mergedUsers.push(fUser);
              }
            });
            
            updatedDb.users = mergedUsers;
            savePortalDB(updatedDb);
            
            // Если текущий вошедший пользователь есть в списке, обновим его локально при изменениях
            if (user) {
              const currentUpdated = firestoreUsers.find(u => u.record_book_id === user.record_book_id);
              if (currentUpdated) {
                const hasChanged = JSON.stringify(currentUpdated) !== JSON.stringify(user);
                if (hasChanged) {
                  setUser(currentUpdated);
                  localStorage.setItem('fem_bseu_user', JSON.stringify(currentUpdated));
                }
              }
            }
            
            return updatedDb;
          });
        }
      }, (error) => {
        console.error("Error listening to users in real-time:", error);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to initialize real-time users sync:", e);
    }
  }, [user]);

  // Управление темной темой
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fem_bseu_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fem_bseu_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const handleLogin = async (u: CustomUser) => {
    // Fetch latest user data from Firestore to ensure persistent updates (like Telegram chat ID)
    try {
        const userRef = doc(firestoreDb, 'users', u.record_book_id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const latestUser = userDoc.data() as CustomUser;
            
            // Sync with local database as well!
            const localDb = getPortalDB();
            const index = localDb.users.findIndex(x => x.record_book_id === latestUser.record_book_id);
            if (index !== -1) {
              localDb.users[index] = { ...localDb.users[index], ...latestUser };
            } else {
              localDb.users.push(latestUser);
            }
            savePortalDB(localDb);
            setDb(localDb);

            setUser(latestUser);
            localStorage.setItem('fem_bseu_user', JSON.stringify(latestUser));
        } else {
            // First time user registers, make sure they are persistently created in Firestore!
            await setDoc(userRef, u, { merge: true });

            // Sync with local database as well
            const localDb = getPortalDB();
            const index = localDb.users.findIndex(x => x.record_book_id === u.record_book_id);
            if (index !== -1) {
              localDb.users[index] = { ...localDb.users[index], ...u };
            } else {
              localDb.users.push(u);
            }
            savePortalDB(localDb);
            setDb(localDb);

            setUser(u);
            localStorage.setItem('fem_bseu_user', JSON.stringify(u));
        }
    } catch (error) {
        console.error("Error fetching latest user from Firestore:", error);
        setUser(u);
        localStorage.setItem('fem_bseu_user', JSON.stringify(u));
    }
    setShowLoginModal(false);
    setActiveTab('profile');
  };
  
  const handleUpdateUser = async (updatedUser: CustomUser) => {
    setUser(updatedUser);
    localStorage.setItem('fem_bseu_user', JSON.stringify(updatedUser));
    
    // Sync with local database as well
    try {
      const localDb = getPortalDB();
      const index = localDb.users.findIndex(x => x.record_book_id === updatedUser.record_book_id);
      if (index !== -1) {
        localDb.users[index] = { ...localDb.users[index], ...updatedUser };
      } else {
        localDb.users.push(updatedUser);
      }
      savePortalDB(localDb);
      setDb(localDb);
    } catch (error) {
      console.error("Error updating local db users list:", error);
    }

    // Update Firestore
    try {
        const userRef = doc(firestoreDb, 'users', updatedUser.record_book_id);
        await setDoc(userRef, { ...updatedUser }, { merge: true });
    } catch (error) {
        console.error("Error updating user in Firestore:", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fem_bseu_user');
    setActiveTab('feed');
  };

  const refreshDB = () => {
    setDb(getPortalDB());
  };

  const handleMarkRead = (id?: string) => {
    if (!user) return;
    if (id) {
      const notifications = db.notifications || [];
      const notif = notifications.find(n => n.id === id);
      if (notif) notif.is_read = true;
      db.notifications = notifications;
    } else {
      const notifications = db.notifications || [];
      notifications.filter(n => n.user_record_book === user.record_book_id).forEach(n => n.is_read = true);
      db.notifications = notifications;
    }
    savePortalDB(db);
    refreshDB();
  };

  const handleClearNotifs = () => {
    if (!user) return;
    const notifications = db.notifications || [];
    db.notifications = notifications.filter(n => n.user_record_book !== user.record_book_id);
    savePortalDB(db);
    refreshDB();
  };

  const notificationsList = db.notifications || [];
  const unreadCount = user ? notificationsList.filter(n => n.user_record_book === user.record_book_id && !n.is_read).length : 0;
  const userNotifs = user ? (db.notifications || []).filter(n => n.user_record_book === user.record_book_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f8fafc] dark:bg-[#030712] font-sans text-slate-900 dark:text-slate-100 selection:bg-[#d4af37]/30 transition-colors duration-200 relative z-0">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        notifications={userNotifs}
        onMarkRead={handleMarkRead}
        onClearAll={handleClearNotifs}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {activeTab === 'feed' && (
              <FeedView 
                db={db} 
                user={user} 
                onRefresh={refreshDB} 
                onSelectEvent={(id) => {
                  // Здесь можно добавить логику перехода на вкладку событий с выбранным ID
                  setActiveTab('events');
                }}
                onSelectSnil={(id) => {
                  setSelectedSnilId(id);
                  setActiveTab('snil');
                }} 
              />
            )}
            {activeTab === 'events' && <EventsView db={db} user={user} onRefresh={refreshDB} />}
            {activeTab === 'snil' && (
              <SnilView 
                db={db} 
                user={user} 
                selectedSnilId={selectedSnilId} 
                onClearSelectedSnil={() => setSelectedSnilId(null)}
                onRefresh={refreshDB} 
              />
            )}
            {activeTab === 'rating' && <RatingView db={db} user={user} />}
            {activeTab === 'gallery' && <GalleryView db={db} user={user} onRefresh={refreshDB} />}
            {activeTab === 'quizzes' && <QuizzesView db={db} user={user} onRefresh={refreshDB} />}
            {activeTab === 'faq' && <FAQView />}
            {activeTab === 'merch' && <MerchView db={db} user={user} onRefresh={refreshDB} />}
            {activeTab === 'security' && user && <SecurityView user={user} onRefresh={refreshDB} />}
            
            {activeTab === 'profile' && user && (
              <ProfileView 
                db={db} 
                user={user} 
                onUpdateUser={handleUpdateUser} 
                onRefresh={refreshDB}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'admin' && user && canAccessAdmin(user) && (
              <AdminView db={db} user={user} onRefresh={refreshDB} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Футер портала */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#0a2a5e] flex items-center justify-center">
                <span className="text-[#d4af37] font-bold text-xs">ФЭМ</span>
              </div>
              <span className="font-extrabold text-lg tracking-tighter text-[#0a2a5e] dark:text-blue-400">SNO.PORTAL</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm">
              Информационно-аналитическая платформа Студенческого научного общества Факультета экономики и менеджмента БГЭУ.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">
            <a href="http://fm.bseu.by/deans_office" target="_blank" rel="noreferrer" className="hover:text-[#d4af37] transition-colors">Деканат ФЭМ</a>
            <a href="https://nir.bseu.by/scientific/study/studentscience2.html" target="_blank" rel="noreferrer" className="hover:text-[#d4af37] transition-colors">НИРС БГЭУ</a>
            <a href="http://edoc.bseu.by:8080/" target="_blank" rel="noreferrer" className="hover:text-[#d4af37] transition-colors">Библиотека</a>
            <a href="https://edoc.bseu.by" target="_blank" rel="noreferrer" className="hover:text-[#d4af37] transition-colors">Репозиторий</a>
            <a href="https://t.me/snofembseu" target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">Техподдержка</a>
          </div>

          <div className="text-center md:text-right space-y-3">
            <button
              onClick={() => setShowDjangoModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#0a2a5e] dark:hover:text-[#d4af37] transition-all text-xs font-mono font-bold shadow-sm"
              title="Исходный код Django проекта"
            >
              <Code2 className="w-4 h-4 text-[#d4af37]" />
              <span>Django Backend Source</span>
            </button>
            <div className="pt-2">
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500">© 2026 FEM BSEU SNO</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1 uppercase tracking-widest">Built for Academic Excellence</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Модальные окна */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onLoginSuccess={handleLogin} 
        />
      )}
      
      {showDjangoModal && (
        <DjangoCodeModal 
          onClose={() => setShowDjangoModal(false)} 
        />
      )}


    </div>
  );
}

