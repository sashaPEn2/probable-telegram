import React, { useState, useRef, useEffect } from 'react';
import { CustomUser, UserRole, Notification } from '../types';
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
  ShieldAlert,
  ChevronDown,
  LayoutGrid,
  Home,
  Trophy,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Info,
  Trash2,
  CheckCheck,
} from 'lucide-react';

interface NavbarProps {
  user: CustomUser | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  unreadCount: number;
  notifications: Notification[];
  onMarkRead: (id?: string) => void;
  onClearAll: () => void;
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
  notifications,
  onMarkRead,
  onClearAll,
  darkMode,
  onToggleDarkMode
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHubMenu, setShowHubMenu] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const mobileHubRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      // If clicking outside both desktop AND mobile hub refs, close it
      const clickedOutsideHub = hubRef.current && !hubRef.current.contains(event.target as Node);
      const clickedOutsideMobileHub = mobileHubRef.current && !mobileHubRef.current.contains(event.target as Node);
      
      if (clickedOutsideHub && clickedOutsideMobileHub) {
        setShowHubMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="bg-[#0a2a5e] text-white sticky top-0 z-[60] shadow-lg border-b border-[#d4af37]/30 backdrop-blur-md bg-opacity-95 h-16 sm:h-24 flex flex-col justify-center transition-all">
        {/* Mobile secondary branding bar */}
        <div className="lg:hidden w-full bg-blue-950/50 border-b border-blue-900/30 py-1 px-4">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d4af37] text-center">Цифровой портал студента-исследователя</p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between">
            
            {/* Logo Section */}
            <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => setActiveTab('feed')}>
              <div className="relative flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] via-amber-500 to-amber-600 p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.3)] group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all">
                <div className="w-full h-full bg-[#0a2a5e] rounded-[14px] flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-[#d4af37]" />
                </div>
              </div>
              <div className="hidden xs:block">
                <div className="flex items-center space-x-2">
                  <span className="font-black tracking-tight text-lg sm:text-2xl uppercase leading-none">БГЭУ <span className="text-[#d4af37]">ФЭМ</span></span>
                  <div className="h-4 w-[1px] bg-white/20 hidden md:block mx-1"></div>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-[#d4af37] text-[#0a2a5e] font-black hidden md:inline shadow-sm">SNO / FMGL</span>
                </div>
                <p className="text-[10px] sm:text-[12px] text-blue-200 font-bold tracking-wide mt-1 hidden sm:block opacity-90">Цифровой портал студента-исследователя</p>
              </div>
            </div>

            {/* Desktop Center Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              <NavButton 
                active={activeTab === 'feed'} 
                onClick={() => setActiveTab('feed')} 
                icon={<Sparkles className="w-4 h-4" />}
                label="Лента" 
              />
              <NavButton 
                active={activeTab === 'events'} 
                onClick={() => setActiveTab('events')} 
                icon={<Calendar className="w-4 h-4" />}
                label="Календарь" 
              />
              <NavButton 
                active={activeTab === 'quizzes'} 
                onClick={() => setActiveTab('quizzes')} 
                icon={<Trophy className="w-4 h-4" />}
                label="Викторины" 
                highlightQuiz
              />
              <NavButton 
                active={activeTab === 'rating'} 
                onClick={() => setActiveTab('rating')} 
                icon={<Award className="w-4 h-4" />}
                label="Рейтинг" 
              />
              
              {/* Dropdown for secondary items */}
              <div className="relative" ref={hubRef}>
                <button
                  onClick={() => setShowHubMenu(!showHubMenu)}
                  type="button"
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    showHubMenu || ['gallery', 'snil', 'faq', 'merch', 'admin'].includes(activeTab)
                      ? 'bg-blue-800 text-white shadow-inner border border-blue-600'
                      : 'text-blue-100 hover:bg-blue-900/60 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Ресурсы</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showHubMenu ? 'rotate-180' : ''}`} />
                </button>

                {showHubMenu && (
                  <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-[70] animate-fadeIn">
                    <HubItem 
                      active={activeTab === 'gallery'} 
                      onClick={() => { setActiveTab('gallery'); setShowHubMenu(false); }} 
                      icon={<ImageIcon className="w-4 h-4" />} 
                      label="Галерея" 
                    />
                    <HubItem 
                      active={activeTab === 'snil'} 
                      onClick={() => { setActiveTab('snil'); setShowHubMenu(false); }} 
                      icon={<FlaskConical className="w-4 h-4" />} 
                      label="СНИЛ ФЭМ" 
                    />
                    <HubItem 
                      active={activeTab === 'faq'} 
                      onClick={() => { setActiveTab('faq'); setShowHubMenu(false); }} 
                      icon={<HelpCircle className="w-4 h-4" />} 
                      label="Вопросы / FAQ" 
                    />
                    <HubItem 
                      active={activeTab === 'merch'} 
                      onClick={() => { setActiveTab('merch'); setShowHubMenu(false); }} 
                      icon={<ShoppingBag className="w-4 h-4" />} 
                      label="Магазин" 
                    />
                  </div>
                )}
              </div>

              {user && (user.role === 'coordinator' || user.role === 'admin' || user.role === 'activist' || user.role === 'snil_head') && (
                <NavButton 
                  active={activeTab === 'admin'} 
                  onClick={() => setActiveTab('admin')} 
                  icon={<ShieldCheck className="w-4 h-4 text-[#d4af37]" />}
                  label="Управление" 
                  highlight
                />
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              <button
                onClick={onToggleDarkMode}
                className="p-2 sm:p-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors cursor-pointer min-w-[36px] sm:min-w-[40px] flex items-center justify-center"
              >
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-200" />}
              </button>

              {user ? (
                <>
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                      className="relative p-2 sm:p-2 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 hover:text-white transition-colors min-w-[36px] sm:min-w-[40px] flex items-center justify-center cursor-pointer"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-[#0a2a5e]"></span>}
                    </button>

                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-3 w-72 xs:w-80 sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-0 z-[70] animate-fadeIn origin-top-right overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0a2a5e] to-blue-900 px-4 py-3 text-white flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-[#d4af37]" />
                            <span className="font-bold text-xs sm:text-sm">Центр уведомлений ФЭМ</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="text-[10px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded-full font-mono animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Action Panel */}
                        {notifications.length > 0 && (
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Всего: {notifications.length}</span>
                            <div className="flex space-x-3">
                              <button 
                                onClick={() => onMarkRead()} 
                                className="text-blue-700 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Прочитать все</span>
                              </button>
                              <button 
                                onClick={() => {
                                  onClearAll();
                                  setShowNotifDropdown(false);
                                }} 
                                className="text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Очистить</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List */}
                        <div className="max-h-[320px] overflow-y-auto p-3 space-y-2 bg-white dark:bg-slate-900 scrollbar-thin">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                              <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2 animate-pulse" />
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Новых уведомлений нет</p>
                              <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-normal">
                                Здесь будут отображаться статусы ваших докладов, новые поручения СНИЛ и рассылки деканата ФЭМ.
                              </p>
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => onMarkRead(n.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-2.5 text-left ${
                                  !n.is_read 
                                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 shadow-sm' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <div className="mt-0.5 flex-shrink-0">
                                  {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                   n.type === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                                   <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-[11px] sm:text-xs text-[#0a2a5e] dark:text-blue-300 truncate pr-2">{n.title}</h4>
                                    <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-350 mt-0.5 leading-relaxed break-words">
                                    {n.message}
                                  </p>
                                </div>

                                {!n.is_read && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] self-center flex-shrink-0"></div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`flex items-center space-x-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                        activeTab === 'profile' || showUserMenu
                          ? 'bg-[#d4af37] border-[#d4af37] text-[#0a2a5e] font-semibold'
                          : 'bg-blue-900/60 border-blue-700/60 text-white hover:bg-blue-800'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-950 flex items-center justify-center text-xs font-bold text-[#d4af37] border border-[#d4af37]/40">
                        {user.first_name[0]}
                      </div>
                      <div className="text-left hidden lg:block">
                        <p className="text-xs leading-none font-medium truncate max-w-[80px]">{user.last_name} {user.first_name[0]}.</p>
                      </div>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-[70] animate-fadeIn origin-top-right">
                        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-t-2xl">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0a2a5e] flex items-center justify-center text-white font-black text-sm border border-[#d4af37]/40">
                              {user.last_name[0]}{user.first_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-[#0a2a5e] dark:text-blue-200 truncate leading-tight">{user.last_name} {user.first_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{getRoleTitle(user.role)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="py-2 px-2">
                          <MenuAction onClick={() => { setActiveTab('profile'); setShowUserMenu(false); }} icon={<User className="w-4 h-4" />} label="Личный кабинет" />
                          <MenuAction onClick={() => { setActiveTab('events'); setShowUserMenu(false); }} icon={<Calendar className="w-4 h-4" />} label="Мои события" />
                          <MenuAction onClick={() => { setActiveTab('security'); setShowUserMenu(false); }} icon={<ShieldAlert className="w-4 h-4" />} label="Безопасность" />
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 px-2 pb-1">
                          <button
                            onClick={() => { onLogout(); setShowUserMenu(false); }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Выйти</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center space-x-1.5 px-4 py-2 sm:px-4 sm:py-2 rounded-xl bg-[#d4af37] text-[#0a2a5e] font-bold shadow-md hover:brightness-110 transition-all text-xs sm:text-sm"
                >
                  <User className="w-4 h-4" />
                  <span>Вход</span>
                </button>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-[60] px-2 py-1.5 pb-safe shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] flex items-center justify-around">
        <BottomNavBtn 
          active={activeTab === 'feed'} 
          onClick={() => setActiveTab('feed')} 
          icon={<Home className="w-5 h-5" />} 
          label="Лента" 
        />
        <BottomNavBtn 
          active={activeTab === 'events'} 
          onClick={() => setActiveTab('events')} 
          icon={<Calendar className="w-5 h-5" />} 
          label="События" 
        />
        <BottomNavBtn 
          active={activeTab === 'rating'} 
          onClick={() => setActiveTab('rating')} 
          icon={<Award className="w-5 h-5" />} 
          label="Рейтинг" 
        />
        <BottomNavBtn 
          active={activeTab === 'quizzes'} 
          onClick={() => setActiveTab('quizzes')} 
          icon={<Trophy className="w-5 h-5" />} 
          label="Викторины" 
          highlightQuiz
        />
        
        {/* Hub Button for Mobile */}
        <div className="relative" ref={mobileHubRef}>
          <BottomNavBtn 
            active={['gallery', 'snil', 'faq', 'merch', 'admin'].includes(activeTab)} 
            onClick={() => setShowHubMenu(!showHubMenu)} 
            icon={<MoreHorizontal className="w-5 h-5" />} 
            label="Меню" 
          />
          
          {showHubMenu && (
            <div className="absolute bottom-full right-0 mb-4 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-[70] animate-slideUp origin-bottom-right overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Дополнительно</p>
              </div>
              <HubItem 
                active={activeTab === 'gallery'} 
                onClick={() => { setActiveTab('gallery'); setShowHubMenu(false); }} 
                icon={<ImageIcon className="w-4 h-4" />} 
                label="Галерея" 
              />
              <HubItem 
                active={activeTab === 'snil'} 
                onClick={() => { setActiveTab('snil'); setShowHubMenu(false); }} 
                icon={<FlaskConical className="w-4 h-4" />} 
                label="СНИЛ ФЭМ" 
              />
              <HubItem 
                active={activeTab === 'merch'} 
                onClick={() => { setActiveTab('merch'); setShowHubMenu(false); }} 
                icon={<ShoppingBag className="w-4 h-4" />} 
                label="Магазин" 
              />
              <HubItem 
                active={activeTab === 'faq'} 
                onClick={() => { setActiveTab('faq'); setShowHubMenu(false); }} 
                icon={<HelpCircle className="w-4 h-4" />} 
                label="FAQ" 
              />
              {user && (user.role === 'coordinator' || user.role === 'admin' || user.role === 'activist' || user.role === 'snil_head') && (
                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <HubItem 
                    active={activeTab === 'admin'} 
                    onClick={() => { setActiveTab('admin'); setShowHubMenu(false); }} 
                    icon={<ShieldCheck className="w-4 h-4 text-[#d4af37]" />} 
                    label="Управление" 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

const HubItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    type="button"
    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold transition-all text-left ${
      active 
      ? 'text-[#0a2a5e] dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20' 
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-[#0a2a5e] dark:hover:text-blue-200'
    }`}
  >
    <div className={active ? 'text-[#d4af37]' : 'text-slate-400'}>{icon}</div>
    <span>{label}</span>
  </button>
);

const BottomNavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; highlightQuiz?: boolean }> = ({ active, onClick, icon, label, highlightQuiz }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all min-w-[64px] ${
      highlightQuiz
        ? active 
          ? 'text-amber-400 font-black scale-105' 
          : 'text-amber-350 font-bold bg-amber-500/10 rounded-xl border border-amber-500/25 px-2.5 py-1'
        : active ? 'text-[#d4af37]' : 'text-slate-400 dark:text-slate-500'
    }`}
  >
    <div className={`mb-0.5 transition-transform ${active ? 'scale-110' : ''} ${highlightQuiz ? 'text-amber-400' : ''}`}>{icon}</div>
    <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  highlightQuiz?: boolean;
}

const MenuAction: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0a2a5e] dark:hover:text-blue-300 transition-all text-left"
  >
    <div className="text-slate-400">{icon}</div>
    <span>{label}</span>
  </button>
);

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, highlight, highlightQuiz }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
      highlightQuiz
        ? active
          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a2a5e] font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400'
          : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:scale-105'
        : active
          ? highlight 
            ? 'bg-amber-500 text-[#0a2a5e] font-bold shadow-md'
            : 'bg-blue-800 text-white shadow-inner border border-blue-600'
          : highlight
            ? 'text-amber-300 hover:bg-blue-900/80 border border-amber-500/30'
            : 'text-blue-100 hover:bg-blue-900/60 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);


