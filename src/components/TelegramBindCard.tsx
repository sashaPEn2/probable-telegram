import React, { useEffect, useState } from 'react';
import { Send, Link as LinkIcon, Unlink as UnlinkIcon, Info, Loader2 } from 'lucide-react';
import { CustomUser } from '../types';

type Props = {
  user: CustomUser;
  onUpdateUser: (u: CustomUser) => void;
  onRefresh: () => void;
};

export const TelegramBindCard: React.FC<Props> = ({ user, onUpdateUser, onRefresh }) => {
  const [token, setToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const telegramBound = typeof user.telegram_user_id === 'number' && user.telegram_user_id > 0;

  const handleStartBind = async () => {
    setError('');
    setToken('');
    setExpiresAt('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/telegram/bind/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_book_id: user.record_book_id })
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `http_${resp.status}`);
      }

      const data = (await resp.json()) as { token: string; expires_at: string };
      setToken(data.token);
      setExpiresAt(data.expires_at);

      // If backend creates token, we still wait for user to input token in Telegram.
      // We'll refresh profile after a short delay.
      setTimeout(() => onRefresh(), 2500);
    } catch (e: any) {
      setError(e?.message || 'bind_start_failed');
    } finally {
      setIsLoading(false);
    }
  };

  // MVP: refresh only pulls from localStorage, so show token/instructions.
  // After user confirms in Telegram, we ask backend to update DB, but frontend won't know
  // telegram_user_id without a dedicated endpoint. For now we display status from local user.

  useEffect(() => {
    // no-op
  }, [user.telegram_user_id]);

  const handleUnlink = async () => {
    setError('');
    setIsLoading(true);
    try {
      const resp = await fetch('/api/telegram/bind/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_book_id: user.record_book_id })
      });
      if (!resp.ok) throw new Error(`http_${resp.status}`);
      const updated = { ...user, telegram_user_id: undefined, telegram_username: undefined };
      onUpdateUser(updated);
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'unlink_failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {telegramBound ? (
            <div className="p-2 rounded-xl bg-green-100 text-green-700">
              <LinkIcon className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-black text-[#0a2a5e] dark:text-blue-300">Telegram уведомления</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Дублирование уведомлений портала в вашем боте</p>
          </div>
        </div>

        {telegramBound ? (
          <button
            onClick={handleUnlink}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs shadow hover:bg-red-100 transition-all flex items-center space-x-2"
          >
            <UnlinkIcon className="w-4 h-4" />
            <span>Отвязать</span>
          </button>
        ) : (
          <button
            onClick={handleStartBind}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#0a2a5e] text-[#d4af37] font-black text-xs shadow hover:bg-blue-900 transition-all flex items-center space-x-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{isLoading ? 'Готовим код...' : 'Привязать Telegram'}</span>
          </button>
        )}
      </div>

      {telegramBound ? (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Привязано</p>
          <p className="text-sm mt-1 font-mono text-slate-700 dark:text-slate-200">
            id: {user.telegram_user_id} {user.telegram_username ? `(@${user.telegram_username})` : ''}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Уведомления будут приходить в бот после обновления портальных уведомлений.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {!token ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">Как привязать</p>
              <ol className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1">
                <li>Нажмите «Привязать Telegram»</li>
                <li>В появившемся поле скопируйте код</li>
                <li>Отправьте код в боте командой /start и вводом кода</li>
              </ol>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Ваш код привязки</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-blue-800/70 dark:text-blue-200/70">Истекает: {new Date(expiresAt).toLocaleString('ru-RU')}</p>
                  <p className="text-2xl font-black font-mono text-blue-900 dark:text-blue-200">{token}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(token)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  Скопировать
                </button>
              </div>
              <p className="text-[11px] text-blue-800/70 dark:text-blue-200/70 mt-3">
                В боте: отправьте /start, затем отправьте этот код текстом.
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-[11px] font-bold px-3 py-2 rounded-lg bg-red-100 text-red-700 border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

