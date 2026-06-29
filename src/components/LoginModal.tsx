import React, { useState } from 'react';
import { loginUser, GROUPS_BY_COURSE, FACULTIES } from '../services/storage';
import { CustomUser } from '../types';
import { GraduationCap, ArrowRight, ShieldAlert, Sparkles, BookOpen, X, School } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: CustomUser) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [recordBook, setRecordBook] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [group, setGroup] = useState('');
  const [faculty, setFaculty] = useState(FACULTIES[0]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!recordBook.trim()) {
      setError('Введите номер студенческого билета (зачётной книжки)');
      return;
    }

    const db = JSON.parse(localStorage.getItem('fem_bseu_portal_db_v1') || '{}');
    const existingUser = db.users?.find((u: any) => u.record_book_id === recordBook.trim());

    if (existingUser?.password && existingUser.password !== password) {
      setError('Неверный пароль. Пожалуйста, попробуйте еще раз.');
      return;
    }

    if (!lastName.trim() || !firstName.trim()) {
      setError('Укажите фамилию и имя для идентификации в базе БГЭУ');
      return;
    }

    if (isRegister && !group) {
      setError('Пожалуйста, выберите вашу учебную группу');
      return;
    }

    const user = loginUser(recordBook, lastName, firstName, group, faculty);
    onLoginSuccess(user);
  };

  const handleQuickLogin = (roleType: 'student' | 'activist' | 'snil_head' | 'coordinator' | 'admin') => {
    let rec = '2601001';
    let last = 'Иванов';
    let first = 'Иван';
    let grp = '26 DKKS 1';

    if (roleType === 'activist') { rec = '2601002'; last = 'Смирнова'; first = 'Анна'; grp = '26 DKP 1'; }
    else if (roleType === 'snil_head') { 
      // Давыдова Ольга Григорьевна (СНИЛ Инноватика)
      rec = '88800102'; last = 'Давыдова'; first = 'Ольга'; grp = 'СНИЛ Инноватика'; 
    }
    else if (roleType === 'coordinator') { rec = '99900011'; last = 'Координатор'; first = 'ФЭМ'; grp = 'Деканат'; }
    else if (roleType === 'admin') { rec = '00000001'; last = 'Администратор'; first = 'БГЭУ'; grp = 'Система'; }

    const user = loginUser(rec, last, first, grp, 'ФЭМ');
    // Принудительно устанавливаем выбранную роль если она отличается
    if (user.role !== roleType) {
      user.role = roleType;
    }
    onLoginSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-[#d4af37]/40 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn max-h-[95vh] flex flex-col">
        
        {/* Кнопка закрытия - теперь вне скролла */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors z-[70] hover:bg-white/5 rounded-full"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Декоративная научная сетка / свечение */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-4 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0a2a5e] to-blue-900 border border-[#d4af37] shadow-lg mb-3">
            <GraduationCap className="w-7 h-7 text-[#d4af37]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {isRegister ? 'Регистрация' : 'Вход в портал'}
          </h2>
          <p className="text-[10px] text-blue-200/80 mt-0.5">SNO.PORTAL — Факультет экономики и менеджмента</p>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-2xl mb-4 relative z-10">
          <button 
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${!isRegister ? 'bg-[#d4af37] text-[#0a2a5e] shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            ВХОД
          </button>
          <button 
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${isRegister ? 'bg-[#d4af37] text-[#0a2a5e] shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            РЕГИСТРАЦИЯ
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center space-x-2 text-red-200 text-[10px]">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Номер студенческого (зачётки)</span>
            </label>
            <input
              type="text"
              placeholder="Например: 2201452"
              value={recordBook}
              onChange={(e) => setRecordBook(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5">Фамилия</label>
              <input
                type="text"
                placeholder="Иванов"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5">Имя</label>
              <input
                type="text"
                placeholder="Иван"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </div>
          </div>

          {!isRegister && (
            <div>
              <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Пароль (если установлен)</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] transition-all"
              />
            </div>
          )}

          {isRegister && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5 flex items-center space-x-1">
                  <School className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Факультет</span>
                </label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white focus:outline-none focus:border-[#d4af37] transition-all"
                >
                  {FACULTIES.map(f => (
                    <option key={f} value={f} className="bg-slate-900 text-white">{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5">Учебная группа</label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white focus:outline-none focus:border-[#d4af37] transition-all"
                  required
                >
                  <option value="" className="bg-slate-900 text-slate-500">Выберите группу...</option>
                  {[1, 2, 3, 4].map(courseNum => (
                    <optgroup key={courseNum} label={`${courseNum} курс`} className="bg-slate-900 text-amber-500 font-bold">
                      {GROUPS_BY_COURSE[courseNum].map(g => (
                        <option key={g} value={g} className="bg-slate-900 text-white font-normal">{g}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#d4af37] via-amber-500 to-amber-600 text-[#0a2a5e] font-bold shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all group mt-4"
            >
              <span>{isRegister ? 'Зарегистрироваться' : 'Войти в систему'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
        </form>

        {/* Панель демо-доступа для проверки всех 5 ролей */}
        {!isRegister && (
          <div className="mt-6 pt-4 border-t border-slate-800 text-center relative z-10">
            <p className="text-[10px] font-mono text-amber-400/90 mb-2 flex items-center justify-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span>БЫСТРЫЙ ДЕМО-ВХОД ДЛЯ ПРОВЕРКИ РОЛЕЙ</span>
            </p>
            <div className="flex flex-wrap gap-1 justify-center">
              <QuickRoleBtn onClick={() => handleQuickLogin('student')} label="Студент" color="bg-blue-900/40 text-blue-200 border-blue-800/50" />
              <QuickRoleBtn onClick={() => handleQuickLogin('activist')} label="Активист" color="bg-teal-900/40 text-teal-200 border-teal-800/50" />
              <QuickRoleBtn onClick={() => handleQuickLogin('snil_head')} label="Руководитель" color="bg-purple-900/40 text-purple-200 border-purple-800/50" />
              <QuickRoleBtn onClick={() => handleQuickLogin('coordinator')} label="Координатор" color="bg-amber-900/40 text-amber-200 border-amber-800/50" />
              <QuickRoleBtn onClick={() => handleQuickLogin('admin')} label="Админ" color="bg-red-900/40 text-red-200 border-red-800/50" />
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

const QuickRoleBtn: React.FC<{ onClick: () => void; label: string; color: string }> = ({ onClick, label, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm min-h-[32px] flex items-center justify-center ${color}`}
  >
    {label}
  </button>
);
