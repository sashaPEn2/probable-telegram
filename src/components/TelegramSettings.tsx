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
          <button onClick={() => setIsSaved(false)} className="text-xs text-blue-600 hover:underline">Изменить</button>
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
        <Send className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-slate-800 dark:text-white">Интеграция с Telegram</h3>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-300 space-y-2">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Чтобы получать уведомления, напишите боту в Telegram команду <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">/start</span>. Он пришлет ваш Chat ID.</p>
        </div>
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center space-x-2 transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Сохранить</span>
        </button>
      </div>
    </div>
  );
};
