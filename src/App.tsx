/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getPortalDB, savePortalDB, PortalDatabase } from './services/storage';
import { CustomUser } from './types';
import { Navbar } from './components/Navbar';
import { Code2 } from 'lucide-react';
import { LoginModal } from './components/LoginModal';
import { DjangoCodeModal } from './components/DjangoCodeModal';
import { NotificationsModal } from './components/NotificationsModal';
import { FeedView } from './components/FeedView';
import { EventsView } from './components/EventsView';
import { SnilView } from './components/SnilView';
import { RatingView } from './components/RatingView';
import { GalleryView } from './components/GalleryView';
import { FAQ } from './components/FAQ';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { ShopView } from './components/ShopView';
import { AnimatePresence, motion } from 'motion/react';

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

  // Пытаемся восстановить сессию из localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('fem_bseu_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

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

  const handleLogin = (u: CustomUser) => {
    setUser(u);
    localStorage.setItem('fem_bseu_user', JSON.stringify(u));
    setShowLoginModal(false);
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
      const notif = db.notifications.find(n => n.id === id);
      if (notif) notif.is_read = true;
    } else {
      db.notifications.filter(n => n.user_record_book === user.record_book_id).forEach(n => n.is_read = true);
    }
    savePortalDB(db);
    refreshDB();
  };

  const handleClearNotifs = () => {
    if (!user) return;
    db.notifications = db.notifications.filter(n => n.user_record_book !== user.record_book_id);
    savePortalDB(db);
    refreshDB();
  };

  const unreadCount = user ? db.notifications.filter(n => n.user_record_book === user.record_book_id && !n.is_read).length : 0;
  const userNotifs = user ? db.notifications.filter(n => n.user_record_book === user.record_book_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f8fafc] dark:bg-[#030712] font-sans text-slate-900 dark:text-slate-100 selection:bg-brand-gold/30 transition-colors duration-200">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        onNotifClick={() => setShowNotifModal(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {activeTab === 'shop' && <ShopView user={user} onRefresh={refreshDB} />}
            {activeTab === 'faq' && <FAQ />}
            
            {activeTab === 'profile' && user && (
              <ProfileView 
                db={db} 
                user={user} 
                onUpdateUser={setUser} 
                onRefresh={refreshDB} 
              />
            )}

            {activeTab === 'admin' && user && (user.role === 'coordinator' || user.role === 'admin') && (
              <AdminView db={db} user={user} onRefresh={refreshDB} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Футер портала */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center">
                <span className="text-brand-gold font-bold text-xs">ФЭМ</span>
              </div>
              <span className="font-extrabold text-lg tracking-tighter text-brand-blue dark:text-blue-400">SNO.PORTAL</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm">
              Информационно-аналитическая платформа Студенческого научного общества Факультета экономики и менеджмента БГЭУ.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">
            <a href="http://fm.bseu.by/deans_office" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">Деканат ФЭМ</a>
            <a href="https://nir.bseu.by/scientific/study/studentscience2.html" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">НИРС БГЭУ</a>
            <a href="http://edoc.bseu.by:8080/" target="_blank" rel="noreferrer" className="hover:text-brand-gold transition-colors">Библиотека</a>
            <a href="https://t.me/snofembseu" target="_blank" rel="noreferrer" className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">Техподдержка</a>
          </div>

          <div className="text-center md:text-right space-y-3">
            <button
              onClick={() => setShowDjangoModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-brand-blue dark:hover:text-brand-gold transition-all text-xs font-mono font-bold shadow-sm"
              title="Исходный код Django проекта"
            >
              <Code2 className="w-4 h-4 text-brand-gold" />
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

      {showNotifModal && (
        <NotificationsModal
          notifications={userNotifs}
          onMarkRead={handleMarkRead}
          onClearAll={handleClearNotifs}
          onClose={() => setShowNotifModal(false)}
        />
      )}
    </div>
  );
}

