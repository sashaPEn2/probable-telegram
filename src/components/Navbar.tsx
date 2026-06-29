import React, { useState, useRef, useEffect } from 'react';
import { CustomUser, UserRole } from '../types';
import { getRoleTitle, logoutUser } from '../services/storage';
import { 
  GraduationCap, 
  FlaskConical, 
  Calendar, 
  Award, 
  Image as ImageIcon, 
  ShieldCheck, 
  User, 
  LogOut, 
  Bell,
  Sparkles,
  Layers,
  Sun,
  Moon,
  HelpCircle,
  ShoppingBag,
} from 'lucide-react';

interface NavbarProps {
  user: CustomUser | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  unreadCount: number;
  onNotifClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLoginClick,
  onLogout,
  unreadCount,
  onNotifClick,
  darkMode,
  onToggleDarkMode
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-brand-blue text-white sticky top-0 z-50 shadow-lg border-b border-brand-gold/30 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Логотип БГЭУ ФЭМ */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('feed')}>
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-brand-gold to-cyan-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-brand-blue rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-brand-gold" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-wider text-base sm:text-lg uppercase">БГЭУ <span className="text-brand-gold">ФЭМ</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/80 border border-blue-400/30 text-blue-200 font-mono hidden sm:inline">СНО / СНИЛ</span>
              </div>
              <p className="text-xs text-blue-200/80 font-medium">Портал студента-исследователя</p>
            </div>
          </div>

          {/* Навигационные ссылки (десктоп) */}
          <nav className="hidden xl:flex items-center space-x-1">
            <NavButton 
              active={activeTab === 'feed'} 
              onClick={() => setActiveTab('feed')} 
              icon={<Sparkles className="w-4 h-4" />}
              label="Лента НИРС" 
            />
            <NavButton 
              active={activeTab === 'events'} 
              onClick={() => setActiveTab('events')} 
              icon={<Calendar className="w-4 h-4" />}
              label="Календарь" 
            />
            <NavButton 
              active={activeTab === 'snil'} 
              onClick={() => setActiveTab('snil')} 
              icon={<FlaskConical className="w-4 h-4" />}
              label="Лаборатории СНИЛ" 
            />
            <NavButton 
              active={activeTab === 'rating'} 
              onClick={() => setActiveTab('rating')} 
              icon={<Award className="w-4 h-4" />}
              label="Рейтинг" 
            />
            <NavButton 
              active={activeTab === 'gallery'} 
              onClick={() => setActiveTab('gallery')} 
              icon={<ImageIcon className="w-4 h-4" />}
              label="Галерея" 
            />
            <NavButton 
              active={activeTab === 'shop'} 
              onClick={() => setActiveTab('shop')} 
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Маркет" 
            />
            <NavButton 
              active={activeTab === 'faq'} 
              onClick={() => setActiveTab('faq')} 
              icon={<HelpCircle className="w-4 h-4" />}
              label="FAQ" 
            />
            
            {user && (user.role === 'coordinator' || user.role === 'admin' || user.role === 'activist' || user.role === 'snil_head') && (
              <NavButton 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')} 
                icon={<ShieldCheck className="w-4 h-4 text-brand-gold" />}
                label={user.role === 'snil_head' ? 'Управление СНИЛ' : 'Управление наукой'} 
                highlight
              />
            )}
          </nav>

          {/* Правая панель пользователя */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Переключатель темной темы */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 sm:p-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer min-w-[40px] flex items-center justify-center"
              title={darkMode ? 'Включить светлую тему' : 'Включить темную тему'}
              id="theme-toggle-btn"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-200" />
              )}
            </button>

            {user ? (
              <>
                {/* Колокольчик уведомлений */}
                <button
                  onClick={onNotifClick}
                  className="relative p-2.5 sm:p-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors min-w-[40px] flex items-center justify-center"
                  title="Уведомления"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-brand-blue"></span>
                  )}
                </button>

                <div className="relative" ref={menuRef}>
                  {/* Профиль исследователя */}
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center space-x-2 px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl border transition-all min-h-[40px] ${
                      activeTab === 'profile' || showUserMenu
                        ? 'bg-brand-gold border-brand-gold text-brand-blue font-semibold shadow-md'
                        : 'bg-blue-900/60 border-blue-700/60 text-white hover:bg-blue-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-950 flex items-center justify-center text-xs font-bold text-brand-gold border border-brand-gold/40">
                      {user.first_name[0]}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs leading-none font-medium truncate max-w-[100px]">{user.last_name} {user.first_name[0]}.</p>
                      <p className="text-[10px] leading-tight opacity-75 truncate max-w-[100px]">{getRoleTitle(user.role)}</p>
                    </div>
                  </button>

                  {/* Выпадающее меню */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-fadeIn origin-top-right">
                      <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-t-2xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-white font-black text-sm border border-brand-gold/40">
                            {user.last_name[0]}{user.first_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-brand-blue dark:text-blue-200 truncate leading-tight">
                              {user.last_name} {user.first_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{getRoleTitle(user.role)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-2 px-2">
                        <MenuAction 
                          onClick={() => { setActiveTab('profile'); setShowUserMenu(false); }}
                          icon={<User className="w-4 h-4" />}
                          label="Личный кабинет"
                        />
                        <MenuAction 
                          onClick={() => { setActiveTab('events'); setShowUserMenu(false); }}
                          icon={<Calendar className="w-4 h-4" />}
                          label="Мои события"
                        />
                        <MenuAction 
                          onClick={() => { /* Placeholder */ setShowUserMenu(false); }}
                          icon={<ShieldCheck className="w-4 h-4" />}
                          label="Настройки безопасности"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 px-2 pb-1">
                        <button
                          onClick={() => { onLogout(); setShowUserMenu(false); }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Выйти из системы</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center space-x-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-brand-gold to-cyan-500 text-brand-blue font-bold shadow-md hover:brightness-110 transition-all text-sm min-h-[44px]"
              >
                <User className="w-4 h-4" />
                <span>Войти по зачётке</span>
              </button>
            )}

          </div>

        </div>

        {/* Навигационная полоса для планшетов и мобильных */}
        <div className="flex xl:hidden overflow-x-auto py-2 border-t border-blue-900/80 space-x-1 no-scrollbar text-xs">
          <MobileTab active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} label="Лента" />
          <MobileTab active={activeTab === 'events'} onClick={() => setActiveTab('events')} label="Календарь" />
          <MobileTab active={activeTab === 'snil'} onClick={() => setActiveTab('snil')} label="СНИЛ" />
          <MobileTab active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} label="Рейтинг" />
          <MobileTab active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} label="Галерея" />
          <MobileTab active={activeTab === 'faq'} onClick={() => setActiveTab('faq')} label="FAQ" />
          {user && (
            <>
              <MobileTab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Кабинет" />
              {(user.role === 'coordinator' || user.role === 'admin' || user.role === 'activist' || user.role === 'snil_head') && (
                <MobileTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} label="Управление" highlight />
              )}
            </>
          )}
        </div>

      </div>
    </header>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}

const MenuAction: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand-blue dark:hover:text-blue-300 transition-all text-left"
  >
    <div className="text-slate-400">{icon}</div>
    <span>{label}</span>
  </button>
);

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, highlight }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
      active
        ? highlight 
          ? 'bg-cyan-500 text-brand-blue font-bold shadow-md'
          : 'bg-blue-800 text-white shadow-inner border border-blue-600'
        : highlight
          ? 'text-cyan-300 hover:bg-blue-900/80 border border-cyan-500/30'
          : 'text-blue-100 hover:bg-blue-900/60 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileTab: React.FC<{ active: boolean; onClick: () => void; label: string; highlight?: boolean }> = ({ active, onClick, label, highlight }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl flex-shrink-0 font-bold transition-all min-h-[42px] active:scale-95 ${
      active
        ? 'bg-brand-gold text-brand-blue shadow-md scale-[1.02]'
        : highlight
          ? 'text-brand-gold bg-blue-950 border border-cyan-500/30'
          : 'text-blue-100 bg-blue-900/40 hover:bg-blue-800'
    }`}
  >
    {label}
  </button>
);
