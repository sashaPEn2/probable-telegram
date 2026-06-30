import React, { useState } from 'react';
import { Send, Check, Info, BellRing, Loader2 } from 'lucide-react';
import { CustomUser } from '../types';

interface TelegramSettingsProps {
  user: CustomUser;
  onUpdate: (user: CustomUser) => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({ user, onUpdate }) => {
  const [chatId, setChatId] = useState(user.telegram_chat_id || '');
  const [isSaved, setIsSaved] = useState(!!user.telegram_chat_id);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    onUpdate({ ...user, telegram_chat_id: chatId });
    setIsSaved(true);
  };

  const handleTest = async () => {
    if (!chatId) return alert("Введите Telegram Chat ID");
    setIsTesting(true);
    try {
      const res = await fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: "✅ Тестовое уведомление от портала СНИЛ!" })
      });
      if (res.ok) alert("Уведомление успешно отправлено в Telegram!");
      else alert("Ошибка при отправке уведомления");
    } catch (e) { alert("Ошибка сети"); }
    finally { setIsTesting(false); }
  };

  if (isSaved) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
            <Check className="w-5 h-5" />
            <h3 className="font-bold text-slate-800 dark:text-white">Ваш Telegram успешно привязан</h3>
          </div>
          <button onClick={() => setIsSaved(false)} className="text-xs text-emerald-600 hover:underline">Изменить</button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            <span>{isTesting ? 'Отправка...' : 'Тест'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center space-x-3">
        <Send className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-slate-800 dark:text-white">Интеграция с Telegram</h3>
      </div>
      
      <div className="bg-blue-50 dark:bg-emerald-900/20 p-4 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Чтобы получать уведомления, укажите ваш Telegram Chat ID. Его можно получить следующими способами:</p>
        </div>
        <ul className="list-disc pl-6 space-y-1 text-[11px] text-emerald-600 dark:text-emerald-400">
          <li>Напишите вашему боту в Telegram команду <span className="font-mono bg-emerald-100 dark:bg-emerald-800 px-1 rounded">/start</span> (если он запущен на сервере с поддержкой команд).</li>
          <li><strong>Если сайт запущен на Vercel (Serverless):</strong> бот в безрежимном (Serverless) формате не принимает сообщения. Вы можете моментально узнать свой ID через публичных ботов, например: <a href="https://t.me/GetMyChatIdBot" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-emerald-800">@GetMyChatIdBot</a> или <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-emerald-800">@userinfobot</a>.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input 
          type="text" 
          placeholder="Введите ваш Telegram Chat ID"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="flex-grow bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white"
        />
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Сохранить</span>
        </button>
      </div>
    </div>
  );
};
