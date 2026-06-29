import React, { useState } from 'react';
import { loginUser, GROUPS } from '../services/storage';
import { CustomUser } from '../types';
import { GraduationCap, ArrowRight, ShieldAlert, Sparkles, BookOpen, X } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: CustomUser) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [recordBook, setRecordBook] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [group, setGroup] = useState(GROUPS[0]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateAvatar = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Сначала введите имя и фамилию для персонализации аватара');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: 'Modern 3D academic avatar, scholarly and tech-forward',
          userInterests: `${lastName} ${firstName}, Student of Economics and Management`
        }),
      });
      
      const data = await response.json();
      if (data.imageUrl) {
        setAvatarUrl(data.imageUrl);
      } else {
        throw new Error(data.error || 'Failed to generate');
      }
    } catch (err: any) {
      setError('Ошибка генерации аватара: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!recordBook.trim()) {
      setError('Введите номер студенческого билета (зачётной книжки)');
      return;
    }
    if (!lastName.trim() || !firstName.trim()) {
      setError('Укажите фамилию и имя для идентификации в базе БГЭУ');
      return;
    }

    const user = loginUser(recordBook, lastName, firstName, group);
    if (avatarUrl) {
      user.avatar_url = avatarUrl;
    }
    onLoginSuccess(user);
  };

  const handleQuickLogin = (roleType: 'student' | 'activist' | 'snil_head' | 'coordinator' | 'admin') => {
    let rec = '2201001';
    let last = 'Иванов';
    let first = 'Иван';
    let grp = 'ДЭУ-1';

    if (roleType === 'activist') { rec = '2201002'; last = 'Смирнова'; first = 'Анна'; grp = 'ДЭУ-2'; }
    else if (roleType === 'snil_head') { rec = '2201003'; last = 'Петров'; first = 'Алексей'; grp = 'ДГХ-1'; }
    else if (roleType === 'coordinator') { rec = '99900011'; last = 'Координатор'; first = 'ФЭМ'; grp = 'Деканат'; }
    else if (roleType === 'admin') { rec = '00000001'; last = 'Администратор'; first = 'БГЭУ'; grp = 'Система'; }

    const user = loginUser(rec, last, first, grp);
    // Принудительно устанавливаем выбранную роль для быстрой проверки всех 5 ролей
    if (user.role !== roleType) {
      user.role = roleType;
    }
    onLoginSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-brand-gold/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
        
        {/* Кнопка закрытия */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Декоративная научная сетка / свечение */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-blue to-blue-900 border border-brand-gold shadow-lg mb-4">
            <GraduationCap className="w-9 h-9 text-brand-gold" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
            {isRegister ? 'Регистрация' : 'Вход в портал'}
          </h2>
          <p className="text-xs text-blue-200/80 mt-1">SNO.PORTAL — Факультет экономики и менеджмента</p>
        </div>

        <div className="flex bg-slate-800/50 p-1.5 rounded-2xl mb-6 relative z-10">
          <button 
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${!isRegister ? 'bg-brand-gold text-brand-blue shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            ВХОД
          </button>
          <button 
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${isRegister ? 'bg-brand-gold text-brand-blue shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            РЕГИСТРАЦИЯ
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center space-x-3 text-red-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-brand-gold" />
              <span>Номер студенческого (зачётки)</span>
            </label>
            <input
              type="text"
              placeholder="Например: 2201452"
              value={recordBook}
              onChange={(e) => setRecordBook(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all font-mono"
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
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5">Имя</label>
              <input
                type="text"
                placeholder="Иван"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-blue-200 uppercase mb-1.5">Учебная группа</label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/50 rounded-xl text-white focus:outline-none focus:border-brand-gold transition-all"
                >
                  {GROUPS.map(g => (
                    <option key={g} value={g} className="bg-slate-900 text-white">{g} (ФЭМ)</option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-blue-700/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-brand-gold" />
                    <span className="text-xs font-bold text-white uppercase">AI Аватар</span>
                  </div>
                  {avatarUrl && (
                    <div className="w-12 h-12 rounded-full border-2 border-brand-gold overflow-hidden">
                      <img src={avatarUrl} alt="Generated Avatar" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={generateAvatar}
                  className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-xl text-blue-200 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-200 border-t-transparent rounded-full animate-spin"></div>
                      <span>Создание шедевра...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{avatarUrl ? 'Перегенерировать аватар' : 'Создать уникальный аватар'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-gold via-cyan-500 to-cyan-600 text-brand-blue font-bold shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all group mt-6"
          >
            <span>{isRegister ? 'Зарегистрироваться' : 'Войти в систему'}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Панель демо-доступа для проверки всех 5 ролей */}
        {!isRegister && (
          <div className="mt-8 pt-6 border-t border-slate-800 text-center relative z-10">
            <p className="text-[11px] font-mono text-cyan-400/90 mb-3 flex items-center justify-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span>БЫСТРЫЙ ДЕМО-ВХОД ДЛЯ ПРОВЕРКИ РОЛЕЙ</span>
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <QuickRoleBtn onClick={() => handleQuickLogin('student')} label="Студент" color="bg-blue-900/60 text-blue-200 border-blue-700" />
              <QuickRoleBtn onClick={() => handleQuickLogin('activist')} label="Активист" color="bg-teal-900/60 text-teal-200 border-teal-700" />
              <QuickRoleBtn onClick={() => handleQuickLogin('snil_head')} label="Руководитель" color="bg-purple-900/60 text-purple-200 border-purple-700" />
              <QuickRoleBtn onClick={() => handleQuickLogin('coordinator')} label="Координатор" color="bg-cyan-900/60 text-cyan-200 border-cyan-600" />
              <QuickRoleBtn onClick={() => handleQuickLogin('admin')} label="Админ" color="bg-red-900/60 text-red-200 border-red-700" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const QuickRoleBtn: React.FC<{ onClick: () => void; label: string; color: string }> = ({ onClick, label, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm min-h-[40px] flex items-center justify-center ${color}`}
  >
    {label}
  </button>
);
