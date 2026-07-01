import React, { useState, useRef, useEffect } from 'react';
import { CustomUser, UserRole, Notification } from '../types';
import { getRoleTitle, logoutUser, canAccessAdmin } from '../services/storage';
import { UserAvatar } from './UserAvatar';
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
      <header className="bg-[#052e16] text-white sticky top-0 z-[60] shadow-lg border-b border-[#10b981]/30 backdrop-blur-md bg-opacity-95 h-16 sm:h-24 flex flex-col justify-center transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between">
            
            {/* Logo Section */}
            <div className="flex items-center space-x-3 sm:space-x-4 cursor-pointer group" onClick={() => setActiveTab('feed')}>
              <div className="relative flex items-center justify-center w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#10b981] via-amber-500 to-emerald-700 p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all">
                <div className="w-full h-full bg-[#052e16] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 sm:w-8 sm:h-8 text-[#10b981]" />
                </div>
              </div>
              <div className="block">
                <div className="flex items-center space-x-2">
                  <span className="font-black tracking-tight text-base sm:text-2xl uppercase leading-none">ФЭМ <span className="text-[#10b981]">СНО</span></span>
                  <div className="h-4 w-[1px] bg-white/20 hidden md:block mx-1"></div>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-[#10b981] text-[#052e16] font-black hidden md:inline shadow-sm">SNO / FMGL</span>
                </div>
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
                      ? 'bg-emerald-800 text-white shadow-inner border border-emerald-600'
                      : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
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
                    {user && canAccessAdmin(user) && (
                      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <HubItem 
                          active={activeTab === 'admin'} 
                          onClick={() => { setActiveTab('admin'); setShowHubMenu(false); }} 
                          icon={<ShieldCheck className="w-4 h-4 text-[#10b981]" />} 
                          label="Управление" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              <button
                onClick={onToggleDarkMode}
                className="p-1.5 sm:p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors cursor-pointer min-w-[32px] sm:min-w-[40px] flex items-center justify-center"
              >
                {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />}
              </button>

              {user ? (
                <>
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                      className="relative p-1.5 sm:p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors min-w-[32px] sm:min-w-[40px] flex items-center justify-center cursor-pointer"
                    >
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                      {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse border border-[#052e16]"></span>}
                    </button>

                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-3 w-72 xs:w-80 sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-0 z-[70] animate-fadeIn origin-top-right overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#052e16] to-emerald-900 px-4 py-3 text-white flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-[#10b981]" />
                            <span className="font-bold text-xs sm:text-sm">Центр уведомлений ФЭМ</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="text-[10px] bg-green-500 text-white font-black px-1.5 py-0.5 rounded-full font-mono animate-pulse">
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
                                className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Прочитать все</span>
                              </button>
                              <button 
                                onClick={() => {
                                  onClearAll();
                                  setShowNotifDropdown(false);
                                }} 
                                className="text-green-600 dark:text-green-400 hover:underline flex items-center space-x-1 cursor-pointer"
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
                                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-sm' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <div className="mt-0.5 flex-shrink-0">
                                  {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                   n.type === 'warning' ? <AlertCircle className="w-4 h-4 text-emerald-600" /> :
                                   <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-[11px] sm:text-xs text-[#052e16] dark:text-emerald-300 truncate pr-2">{n.title}</h4>
                                    <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-350 mt-0.5 leading-relaxed break-words">
                                    {n.message}
                                  </p>
                                </div>

                                {!n.is_read && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] self-center flex-shrink-0"></div>
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
                      className={`flex items-center space-x-2 p-1 rounded-lg transition-all ${
                        activeTab === 'profile' || showUserMenu
                          ? 'bg-[#10b981] text-[#052e16] font-bold shadow-lg'
                          : 'bg-emerald-900/50 text-white hover:bg-emerald-800'
                      }`}
                    >
                      <UserAvatar size="xs" user={user} />
                      <div className="text-left hidden lg:block pr-1">
                        <p className="text-[10px] leading-none font-black truncate max-w-[80px]">{user.last_name} {user.first_name[0]}.</p>
                      </div>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-[70] animate-fadeIn origin-top-right">
                        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-t-2xl">
                          <div className="flex items-center space-x-3">
                            <UserAvatar size="md" user={user} className="border border-[#10b981]/40 shadow-sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-[#052e16] dark:text-emerald-200 truncate leading-tight">{user.last_name} {user.first_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{getRoleTitle(user.role)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="py-2 px-2">
                          <MenuAction onClick={() => { setActiveTab('profile'); setShowUserMenu(false); }} icon={<User className="w-4 h-4" />} label="Личный кабинет" />
                          <MenuAction onClick={() => { setActiveTab('events'); setShowUserMenu(false); }} icon={<Calendar className="w-4 h-4" />} label="Мои события" />
                          {canAccessAdmin(user) && (
                            <MenuAction 
                              onClick={() => { setActiveTab('admin'); setShowUserMenu(false); }} 
                              icon={<ShieldCheck className="w-4 h-4 text-[#10b981]" />} 
                              label="Управление" 
                              highlight 
                            />
                          )}
                          <MenuAction onClick={() => { setActiveTab('security'); setShowUserMenu(false); }} icon={<ShieldAlert className="w-4 h-4" />} label="Безопасность" />
                          <div className="border-t border-slate-100 dark:border-slate-800/80 mt-1.5 pt-1.5">
                            <MenuAction 
                              onClick={() => { 
                                setShowUserMenu(false); 
                                onLogout(); 
                              }} 
                              icon={<LogOut className="w-4 h-4 text-green-500 dark:text-green-400" />} 
                              label="Выйти" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center space-x-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#10b981] text-[#052e16] font-bold shadow-md hover:brightness-110 transition-all text-[10px] sm:text-sm"
                >
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
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
              {user && canAccessAdmin(user) && (
                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <HubItem 
                    active={activeTab === 'admin'} 
                    onClick={() => { setActiveTab('admin'); setShowHubMenu(false); }} 
                    icon={<ShieldCheck className="w-4 h-4 text-[#10b981]" />} 
                    label="Управление" 
                  />
                </div>
              )}
              {user && (
                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <HubItem 
                    active={false} 
                    onClick={() => { setShowHubMenu(false); onLogout(); }} 
                    icon={<LogOut className="w-4 h-4 text-green-500" />} 
                    label="Выйти" 
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
      ? 'text-[#052e16] dark:text-emerald-200 bg-blue-50 dark:bg-emerald-900/20' 
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-[#052e16] dark:hover:text-emerald-200'
    }`}
  >
    <div className={active ? 'text-[#10b981]' : 'text-slate-400'}>{icon}</div>
    <span>{label}</span>
  </button>
);

const BottomNavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; highlightQuiz?: boolean }> = ({ active, onClick, icon, label, highlightQuiz }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all min-w-[64px] ${
      highlightQuiz
        ? active 
          ? 'text-emerald-400 font-black scale-105' 
          : 'text-amber-350 font-bold bg-emerald-600/10 rounded-xl border border-emerald-500/25 px-2.5 py-1'
        : active ? 'text-[#10b981]' : 'text-slate-400 dark:text-slate-500'
    }`}
  >
    <div className={`mb-0.5 transition-transform ${active ? 'scale-110' : ''} ${highlightQuiz ? 'text-emerald-400' : ''}`}>{icon}</div>
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
    className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#052e16] dark:hover:text-emerald-300 transition-all text-left"
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
          ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-[#052e16] font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-emerald-400'
          : 'bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/20 border border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.15)] hover:scale-105'
        : active
          ? highlight 
            ? 'bg-emerald-600 text-[#052e16] font-bold shadow-md'
            : 'bg-emerald-800 text-white shadow-inner border border-emerald-600'
          : highlight
            ? 'text-emerald-300 hover:bg-emerald-900/80 border border-emerald-500/30'
            : 'text-emerald-100 hover:bg-emerald-900/60 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);


