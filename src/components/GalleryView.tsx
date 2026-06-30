import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalDatabase } from '../services/storage';
import { CustomUser, GalleryItem } from '../types';
import { Image as ImageIcon, Video, Upload, ExternalLink, Plus, Camera, Sparkles, X } from 'lucide-react';

interface GalleryViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  onRefresh: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ db, user, onRefresh }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [eventName, setEventName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<'photo' | 'video'>('photo');

  const defaultPhotos: GalleryItem[] = [
    {
      id: 'g_def_1',
      title: 'Награждение лауреатов Декады студенческой науки',
      event_name: 'Пленарное заседание ФЭМ',
      date: '2026-03-20',
      image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
      uploader_name: 'СНО ФЭМ Медиа',
      type: 'photo'
    },
    {
      id: 'g_def_2',
      title: 'Мастер-класс в Парке высоких технологий',
      event_name: 'Выездная Научная гостиная',
      date: '2026-02-15',
      image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80',
      uploader_name: 'Активист СНО',
      type: 'photo'
    },
    {
      id: 'g_def_3',
      title: 'Битва молодых ученых: Научный слэм БГЭУ',
      event_name: 'Слэм ФЭМ 2026',
      date: '2026-01-28',
      image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
      uploader_name: 'Координатор ФЭМ',
      type: 'photo'
    }
  ];

  const allItems = [...db.gallery, ...defaultPhotos];

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    const newItem: GalleryItem = {
      id: 'gal_' + Date.now(),
      title,
      event_name: eventName || 'Научное мероприятие БГЭУ',
      date: new Date().toISOString().split('T')[0],
      image_url: imageUrl || 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
      uploader_name: `${user.last_name} ${user.first_name}`,
      type
    };

    db.gallery.unshift(newItem);
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    setTitle('');
    setEventName('');
    setImageUrl('');
    setShowUploadModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Шапка галереи */}
      <div className="bg-gradient-to-r from-[#052e16] via-emerald-900 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-[#10b981]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-[#10b981] text-xs font-bold uppercase tracking-wider font-mono">
            <Camera className="w-4 h-4" />
            <span>Медиа-летопись НИРС</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Научная фото- и видеогалерея <span className="text-[#10b981]">ФЭМ</span></h2>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed opacity-90">
            Запечатлённые моменты заседаний СНИЛ, конференций и дискуссионных клубов. Каждый участник может добавить свой фоторепортаж!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <a
            href="https://2526.snofembseu.tech"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-[#10b981] text-[#052e16] font-black text-xs sm:text-sm shadow-md hover:brightness-110 flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <span>Официальный архив СНО</span>
            <ExternalLink className="w-5 h-5" />
          </a>

          {user && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-blue-950/80 border border-emerald-400/30 text-white font-bold text-xs sm:text-sm hover:bg-emerald-900 flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5 text-[#10b981]" />
              <span>Загрузить фото</span>
            </button>
          )}
        </div>
      </div>

      {/* Сетка медиа */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allItems.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
            <div className="relative aspect-video overflow-hidden bg-slate-900">
              <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-mono uppercase flex items-center space-x-1">
                {item.type === 'video' ? <Video className="w-3 h-3 text-green-400" /> : <ImageIcon className="w-3 h-3 text-[#10b981]" />}
                <span>{item.type}</span>
              </div>
            </div>

            <div className="p-5 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.date} • {item.event_name}</span>
              <h3 className="font-bold text-sm text-[#052e16] dark:text-emerald-300 line-clamp-2 leading-snug">{item.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono">
                <span>Автор: {item.uploader_name}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">БГЭУ</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Модалка загрузки */}
      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-emerald-200 dark:border-emerald-900 transition-colors">
            <div className="bg-[#052e16] p-6 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Upload className="w-5 h-5 text-[#10b981]" />
                <span>Загрузка фото в архив ФЭМ</span>
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 rounded-lg text-emerald-200 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Название кадра / события *</label>
                <input type="text" required placeholder="Например: Победители секции маркетинга" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-2xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Мероприятие</label>
                <input type="text" placeholder="Например: Научная гостиная" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full px-4 py-3 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-2xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Ссылка на фото (или оставьте пустым для авто-кадра)</label>
                <input type="url" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-4 py-3 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-2xl text-sm font-mono text-xs focus:outline-none" />
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-6 py-3 text-sm font-bold border dark:border-slate-700 rounded-2xl order-2 sm:order-1 text-slate-600 dark:text-slate-400">Отмена</button>
                <button type="submit" className="flex-1 py-3 bg-[#10b981] text-[#052e16] font-black text-sm rounded-2xl shadow-lg order-1 sm:order-2 active:scale-95">Опубликовать</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
