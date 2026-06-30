import React, { useState } from 'react';
import { loginUser, GROUPS_BY_COURSE, FACULTIES } from '../services/storage';
import { CustomUser } from '../types';
import { GraduationCap, ArrowRight, ShieldAlert, Sparkles, BookOpen, X, School, Loader2 } from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';

interface LoginModalProps {
  onLoginSuccess: (user: CustomUser) => Promise<void> | void;
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
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      if (!recordBook.trim()) {
        setError('Введите номер студенческого билета (зачётной книжки)');
        setIsLoading(false);
        return;
      }

      const searchId = recordBook.trim();
      const db = JSON.parse(localStorage.getItem('fem_bseu_portal_db_v1') || '{}');
      
      const normalize = (s: string) => {
        if (!s) return '';
        // Handle common Cyrillic <-> Latin visual lookalikes and remove spaces
        return s.toLowerCase()
          .replace(/\s+/g, '') // Remove all whitespace
          .replace(/dks/g, 'дкс') // 25DKS -> 25дкс
          .replace(/dkp/g, 'дкп')
          .replace(/dke/g, 'дкэ')
          .replace(/dkt/g, 'дкт')
          .replace(/dka/g, 'дка')
          .replace(/dku/g, 'дку')
          .replace(/dkr/g, 'дкр')
          .replace(/c/g, 'с') // Latin c -> Cyrillic с
          .replace(/a/g, 'а') // Latin a -> Cyrillic а
          .replace(/p/g, 'р') // Latin p -> Cyrillic р
          .replace(/x/g, 'х') // Latin x -> Cyrillic х
          .replace(/e/g, 'е'); // Latin e -> Cyrillic е
      };

      const searchNorm = normalize(searchId);

      let existingUser = db.users?.find((u: any) => normalize(u.record_book_id) === searchNorm);

      // If not in localstorage, fallback to firestore
      if (!existingUser) {
        try {
          const userDoc = await getDoc(doc(firestoreDb, 'users', searchId));
          if (userDoc.exists()) {
             existingUser = userDoc.data() as CustomUser;
          } else {
             // Fallback to searching all users with normalization
             const usersSnap = await getDocs(collection(firestoreDb, 'users'));
             existingUser = usersSnap.docs.map(d => d.data() as CustomUser).find(u => normalize(u.record_book_id) === searchNorm);
          }
        } catch (err) {
          console.error("Firestore lookup failed", err);
        }
      }

      if (isRegister) {
        if (existingUser) {
          setError('Пользователь с таким номером студенческого билета уже зарегистрирован.');
          setIsLoading(false);
          return;
        }
      } else {
        if (!existingUser) {
          setError('Пользователь с таким номером зачётной книжки не найден. Пожалуйста, перейдите во вкладку «Регистрация».');
          setIsLoading(false);
          return;
        }
        if (existingUser?.password && existingUser.password !== password) {
          setError('Неверный пароль. Пожалуйста, попробуйте еще раз.');
          setIsLoading(false);
          return;
        }
      }

      if (isRegister && (!lastName.trim() || !firstName.trim())) {
        setError('Укажите фамилию и имя для идентификации в базе БГЭУ');
        setIsLoading(false);
        return;
      }

      if (isRegister && !group) {
        setError('Пожалуйста, выберите вашу учебную группу');
        setIsLoading(false);
        return;
      }

      let user: CustomUser;
      
      if (!isRegister && existingUser) {
        user = existingUser;
      } else {
        user = loginUser(
          recordBook,
          lastName,
          firstName,
          group,
          faculty
        );
      }
      
      await onLoginSuccess(user);
    } catch (e) {
      console.error("Login error:", e);
      setError('Произошла непредвиденная ошибка при входе. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-[#10b981]/40 rounded-3xl shadow-2xl relative overflow-hidden animate-fadeIn max-h-[95vh] flex flex-col">
        
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
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-4 relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#052e16] to-emerald-900 border border-[#10b981] shadow-lg mb-3">
            <GraduationCap className="w-7 h-7 text-[#10b981]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {isRegister ? 'Регистрация' : 'Вход в портал'}
          </h2>
          <p className="text-[10px] text-emerald-200/80 mt-0.5">SNO.PORTAL — Факультет экономики и менеджмента</p>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-2xl mb-4 relative z-10">
          <button 
            onClick={() => !isLoading && setIsRegister(false)}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${!isRegister ? 'bg-[#10b981] text-[#052e16] shadow-lg' : 'text-slate-400 hover:text-white'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            ВХОД
          </button>
          <button 
            onClick={() => !isLoading && setIsRegister(true)}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all ${isRegister ? 'bg-[#10b981] text-[#052e16] shadow-lg' : 'text-slate-400 hover:text-white'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            РЕГИСТРАЦИЯ
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/80 border border-green-500/50 rounded-xl flex items-center space-x-2 text-green-200 text-[10px]">
            <ShieldAlert className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Номер студенческого (зачётки)</span>
            </label>
            <input
              type="text"
              placeholder="Например: 2201452"
              value={recordBook}
              onChange={(e) => setRecordBook(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all font-mono disabled:opacity-50"
            />
          </div>

          {isRegister && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5">Фамилия</label>
                <input
                  type="text"
                  placeholder="Иванов"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5">Имя</label>
                <input
                  type="text"
                  placeholder="Иван"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-all disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {!isRegister && (
            <div>
              <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Пароль (если установлен)</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#10b981] transition-all disabled:opacity-50"
              />
            </div>
          )}

          {isRegister && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5 flex items-center space-x-1">
                  <School className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Факультет</span>
                </label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white focus:outline-none focus:border-[#10b981] transition-all disabled:opacity-50"
                >
                  {FACULTIES.map(f => (
                    <option key={f} value={f} className="bg-slate-900 text-white">{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase mb-1.5">Учебная группа</label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-emerald-700/50 rounded-xl text-white focus:outline-none focus:border-[#10b981] transition-all disabled:opacity-50"
                  required
                >
                  <option value="" className="bg-slate-900 text-slate-500">Выберите группу...</option>
                  {[1, 2, 3, 4].map(courseNum => (
                    <optgroup key={courseNum} label={`${courseNum} курс`} className="bg-slate-900 text-emerald-500 font-bold">
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
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#10b981] via-amber-500 to-emerald-700 text-[#052e16] font-bold shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all group mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Выполнение входа...' : (isRegister ? 'Зарегистрироваться' : 'Войти в систему')}</span>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
        </form>

        </div>
      </div>
    </div>
  );
};
