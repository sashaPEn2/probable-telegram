import React from 'react';
import { PortalDatabase } from '../services/storage';
import { CustomUser, Publication, ResearchApplication } from '../types';
import { X, ShieldOff, BookOpen, FileText, ExternalLink, Calendar, MapPin, Award, Sparkles } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ResearcherPublicProfileModalProps {
  researcher: CustomUser;
  db: PortalDatabase;
  onClose: () => void;
}

export const ResearcherPublicProfileModal: React.FC<ResearcherPublicProfileModalProps> = ({ researcher, db, onClose }) => {
  const isPrivate = researcher.is_private;
  
  // Find publications and applications (reports)
  const pubs = db.publications.filter(p => p.user_record_book === researcher.record_book_id && p.is_confirmed);
  const reports = db.applications.filter(a => a.student_record_book === researcher.record_book_id && a.status === 'принята');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-4">
            <UserAvatar size="lg" user={researcher} />
            <div>
              <h2 className="text-xl font-bold text-[#052e16] dark:text-emerald-100">
                {researcher.last_name} {researcher.first_name} {researcher.middle_name || ''}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {researcher.group} • {researcher.course} курс • {researcher.department}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isPrivate ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-20 h-20 bg-blue-50/50 dark:bg-blue-950/30 rounded-full flex items-center justify-center border border-emerald-200 dark:border-amber-900">
                <ShieldOff className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Профиль скрыт</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Пользователь ограничил доступ к своим публикациям и отчетам. Информация доступна только администраторам и координаторам науки.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Публикации */}
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-[#052e16] dark:text-emerald-300">
                  <BookOpen className="w-5 h-5 text-[#10b981]" />
                  <h3 className="font-bold text-base">Научные публикации ({pubs.length})</h3>
                </div>
                
                <div className="space-y-3">
                  {pubs.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Подтвержденных публикаций пока нет.</p>
                  ) : (
                    pubs.map(pub => (
                      <div key={pub.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{pub.title}</h4>
                            <p className="text-xs text-slate-500">{pub.journal}, {pub.year}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-blue-950 text-emerald-800 dark:text-emerald-300">
                                {pub.type}
                              </span>
                            </div>
                          </div>
                          {pub.link && (
                            <a href={pub.link} target="_blank" rel="noreferrer" className="p-2 text-emerald-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Доклады / Участие в конференциях */}
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-[#052e16] dark:text-emerald-300">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base">Выступления на конференциях ({reports.length})</h3>
                </div>
                
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Сведений об участии в конференциях пока нет.</p>
                  ) : (
                    reports.map(report => (
                      <div key={report.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-blue-50/50/10 dark:bg-amber-950/5 hover:border-emerald-200 dark:hover:border-amber-900 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{report.event_title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(report.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{report.topic}</h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Научные интересы */}
              {researcher.scientific_interests.length > 0 && (
                <section className="space-y-3">
                   <div className="flex items-center space-x-2 text-[#052e16] dark:text-emerald-300">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-base">Научные интересы</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {researcher.scientific_interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
                        {interest}
                      </span>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Цифровой портал исследователя ФЭМ • Верифицированные данные
          </p>
        </div>
      </div>
    </div>
  );
};
