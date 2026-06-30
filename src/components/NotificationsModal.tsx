import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, X, CheckCheck } from 'lucide-react';

interface NotificationsModalProps {
  notifications: Notification[];
  onMarkRead: (id?: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onMarkRead,
  onClearAll,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-200 flex flex-col max-h-[85vh]">
        
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-[#052e16] to-emerald-900 p-6 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#10b981]/20 text-[#10b981]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Центр оповещений ФЭМ</h3>
              <p className="text-[11px] text-emerald-200 font-mono mt-0.5">Личный кабинет исследователя</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Панель действий */}
        {notifications.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 flex-shrink-0">
            <span>Вам пришло {notifications.length} уведомлений</span>
            <div className="flex space-x-3">
              <button onClick={() => onMarkRead()} className="text-emerald-700 hover:underline flex items-center space-x-1">
                <CheckCheck className="w-3.5 h-3.5" /> <span>Прочитать все</span>
              </button>
              <button onClick={onClearAll} className="text-green-600 hover:underline flex items-center space-x-1">
                <Trash2 className="w-3.5 h-3.5" /> <span>Очистить</span>
              </button>
            </div>
          </div>
        )}

        {/* Список уведомлений */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3 animate-pulse" />
              <p className="font-medium text-slate-600">Новых уведомлений нет</p>
              <p className="text-xs text-slate-400 mt-1">Здесь будут отображаться статусы ваших докладов, новые поручения СНИЛ и рассылки деканата ФЭМ.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => onMarkRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                  !n.is_read ? 'bg-blue-50/70 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 opacity-75'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                   n.type === 'warning' ? <AlertCircle className="w-5 h-5 text-emerald-600" /> :
                   <Info className="w-5 h-5 text-emerald-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs sm:text-sm text-[#052e16] truncate pr-2">{n.title}</h4>
                    <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">{n.message}</p>
                </div>

                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-[#10b981] self-center flex-shrink-0"></div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Подвал */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-[#052e16] text-white font-bold text-xs rounded-xl hover:bg-emerald-900 shadow">
            Закрыть окно
          </button>
        </div>

      </div>
    </div>
  );
};
