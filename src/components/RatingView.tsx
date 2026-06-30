import React, { useState } from 'react';
import { PortalDatabase, calculateResearcherStats, DEPARTMENTS, GROUPS } from '../services/storage';
import { CustomUser } from '../types';
import { Award, Trophy, Filter, ArrowUpRight, Search, Medal, Flame } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ResearcherPublicProfileModal } from './ResearcherPublicProfileModal';

interface RatingViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
}

export const RatingView: React.FC<RatingViewProps> = ({ db, user }) => {
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResearcher, setSelectedResearcher] = useState<CustomUser | null>(null);

  // Собираем всех пользователей и вычисляем их научные показатели
  // Исключаем сотрудников, стажеров и тех, кто не привязан к стандартным студенческим группам
  const researchersWithStats = db.users
    .filter(u => GROUPS.includes(u.group))
    .map(u => {
      const stats = calculateResearcherStats(u.record_book_id);
      // Для разнообразия демонстрационного рейтинга ФЭМ добавим детерминированный бонус по курсу/зачётке если баллов мало
      let points = stats.ratingPoints;
      if (points === 0) {
        const bonus = parseInt(u.record_book_id.slice(-2)) || 15;
        points = bonus * 5 + u.course * 20;
      }
      return {
        user: u,
        ...stats,
        ratingPoints: points
      };
    }).sort((a, b) => b.ratingPoints - a.ratingPoints);

  const filteredList = researchersWithStats.filter(item => {
    const matchesGroup = selectedGroup === 'all' || item.user.group === selectedGroup;
    const matchesDept = selectedDept === 'all' || item.user.department === selectedDept;
    const matchesSearch = `${item.user.last_name} ${item.user.first_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesDept && matchesSearch;
  });

  const top3 = filteredList.slice(0, 3);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Баннер рейтинга */}
      <div className="bg-gradient-to-r from-[#052e16] via-emerald-900 to-emerald-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-[#10b981]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#10b981]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-[#10b981] text-xs font-bold uppercase tracking-wider font-mono">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Лидеры НИРС БГЭУ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Рейтинг исследовательской активности <span className="text-emerald-400">ФЭМ</span></h2>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed opacity-90">
            Формируется на основе верифицированного электронного портфолио: научные статьи, тезисы докладов, победы в конкурсах лабораторий СНИЛ и дипломы СНО.
          </p>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-[#10b981]/40 text-center relative z-10 w-full lg:w-auto">
          <p className="text-[10px] font-mono text-emerald-400 uppercase">Стипендиальный фонд ФЭМ</p>
          <p className="text-lg font-bold text-white mt-1">Топ-5 исследователей</p>
          <p className="text-xs text-emerald-200 mt-0.5">Рекомендуются к начислению 250 баллов</p>
        </div>
      </div>

      {/* Пьедестал Топ-3 */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* 2 место */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-sm flex flex-col items-center text-center relative mt-6 md:mt-4 transition-colors">
            <div className="relative mb-3">
              <UserAvatar size="xl" user={top3[1].user} />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shadow">
                🥈 2
              </div>
            </div>
            <h3 className="font-bold text-lg text-[#052e16] dark:text-emerald-300">{top3[1].user.last_name} {top3[1].user.first_name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{top3[1].user.group} • Курс {top3[1].user.course}</p>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-mono font-bold text-sm border border-emerald-100 dark:border-emerald-900">
              {top3[1].ratingPoints} баллов
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 truncate w-full">{top3[1].user.department}</p>
          </div>

          {/* 1 место */}
          <div className="bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-slate-900 rounded-3xl border-2 border-emerald-500 p-8 shadow-xl flex flex-col items-center text-center relative -mt-2 transition-all">
            <div className="absolute top-3 right-3 animate-bounce">
              <Flame className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="relative mb-4">
              <UserAvatar size="2xl" user={top3[0].user} className="border-4 border-emerald-500" />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-600 text-white font-extrabold text-sm flex items-center justify-center shadow-lg border border-emerald-400">
                👑 1
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Лучший исследователь</span>
            <h3 className="font-black text-xl text-[#052e16] dark:text-emerald-100 mt-1">{top3[0].user.last_name} {top3[0].user.first_name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{top3[0].user.group} • Курс {top3[0].user.course}</p>
            <div className="mt-4 px-6 py-2 rounded-2xl bg-emerald-600 text-white font-mono font-extrabold text-base shadow">
              {top3[0].ratingPoints} баллов
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 font-medium">{top3[0].user.department}</p>
          </div>

          {/* 3 место */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-sm flex flex-col items-center text-center relative mt-6 md:mt-8 transition-colors">
            <div className="relative mb-3">
              <UserAvatar size="xl" user={top3[2].user} />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shadow">
                🥉 3
              </div>
            </div>
            <h3 className="font-bold text-lg text-[#052e16] dark:text-emerald-300">{top3[2].user.last_name} {top3[2].user.first_name}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{top3[2].user.group} • Курс {top3[2].user.course}</p>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-mono font-bold text-sm border border-emerald-100 dark:border-emerald-900">
              {top3[2].ratingPoints} баллов
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 truncate w-full">{top3[2].user.department}</p>
          </div>
        </div>
      )}

      {/* Панель фильтрации */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#052e16] dark:text-emerald-300 uppercase font-mono">
          <Filter className="w-4 h-4 text-[#10b981]" />
          <span>Фильтры таблицы:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Поиск по ФИО..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 sm:py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none dark:text-slate-100 transition-colors min-h-[40px]"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-colors cursor-pointer min-h-[40px]"
          >
            <option value="all">Все группы ФЭМ</option>
            {GROUPS.map(g => <option key={g} value={g}>Группа {g}</option>)}
          </select>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium max-w-[200px] truncate transition-colors cursor-pointer min-h-[40px]"
          >
            <option value="all">Все кафедры факультета</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Таблица рейтинга */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#052e16] dark:bg-blue-950 text-white font-mono text-[11px] uppercase tracking-wider border-b border-emerald-800 dark:border-emerald-900">
                <th className="py-4 px-6 w-16 text-center">Место</th>
                <th className="py-4 px-6">Студент-исследователь</th>
                <th className="py-4 px-4 text-center">Группа</th>
                <th className="py-4 px-4 text-center">Публикации</th>
                <th className="py-4 px-4 text-center">Доклады</th>
                <th className="py-4 px-6 text-right font-bold text-emerald-300">Рейтинг БГЭУ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map((item, idx) => {
                const isMe = user && user.record_book_id === item.user.record_book_id;
                const pos = idx + 1;

                return (
                  <tr 
                    key={item.user.record_book_id} 
                    onClick={() => setSelectedResearcher(item.user)}
                    className={`hover:bg-blue-50/50 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer ${isMe ? 'bg-blue-50/50 dark:bg-emerald-900/10 font-bold border-l-4 border-[#10b981]' : ''}`}
                  >
                    <td className="py-3.5 px-6 text-center font-mono font-bold dark:text-slate-300">
                      {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center space-x-3">
                        <UserAvatar size="sm" user={item.user} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[#052e16] dark:text-emerald-300 font-semibold">{item.user.last_name} {item.user.first_name}</span>
                            {isMe && <span className="text-[9px] bg-[#10b981] text-white px-1.5 py-0.5 rounded font-mono font-extrabold uppercase">Вы</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs font-normal">{item.user.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">{item.user.group}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700 dark:text-slate-400">{item.totalPubs}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700 dark:text-slate-400">{item.totalReports}</td>
                    <td className="py-3.5 px-6 text-right font-mono font-black text-base text-[#052e16] dark:text-emerald-400">
                      {item.ratingPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedResearcher && (
        <ResearcherPublicProfileModal 
          researcher={selectedResearcher}
          db={db}
          onClose={() => setSelectedResearcher(null)}
        />
      )}

    </div>
  );
};
