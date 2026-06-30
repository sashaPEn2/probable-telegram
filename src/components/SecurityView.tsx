import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Save, Key } from 'lucide-react';
import { CustomUser } from '../types';
import { updateUserPassword } from '../services/storage';

interface SecurityViewProps {
  user: CustomUser;
  onRefresh: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ user, onRefresh }) => {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Basic validation
    if (user.password && currentPasswordInput !== user.password) {
      setMessage({ text: 'Текущий пароль введен неверно.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'Новый пароль должен содержать минимум 6 символов.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Пароли не совпадают.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate slight delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = updateUserPassword(user.record_book_id, newPassword);
    
    if (result.success) {
      setMessage({ text: 'Пароль успешно обновлен!', type: 'success' });
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
      onRefresh();
    } else {
      setMessage({ text: result.message, type: 'error' });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-black text-[#052e16] dark:text-emerald-200 mb-2">Безопасность аккаунта</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Установите надежный пароль для дополнительной защиты вашего цифрового портфолио SNO.PORTAL.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="p-8">
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-6 p-4 rounded-2xl flex items-center space-x-3 ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' 
                    : 'bg-rose-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-bold">{message.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {user.password && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Текущий пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-bold"
                    placeholder="Введите старый пароль"
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Новый пароль
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-bold"
                    placeholder="Минимум 6 знаков"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Повторите пароль
                </label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-bold"
                    placeholder="Для исключения опечаток"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPasswords ? 'Скрыть пароли' : 'Показать пароли'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center space-x-2 px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${
                  isSubmitting 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' 
                  : 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white hover:brightness-110 shadow-indigo-200 dark:shadow-none'
                }`}
              >
                <Save className="w-5 h-5" />
                <span>{isSubmitting ? 'Сохранение...' : 'Обновить пароль'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Lock className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#052e16] dark:text-emerald-200 mb-1">Зачем устанавливать пароль?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                По умолчанию вход осуществляется только по номеру зачётки. Установка пароля добавит второй фактор защиты для ваших научных данных, публикаций и баланса баллов.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
