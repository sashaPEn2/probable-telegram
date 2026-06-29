import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Shuffle, 
  Loader2, 
  Save, 
  Atom, 
  Award, 
  Brain, 
  Code2, 
  GraduationCap, 
  Laptop, 
  Rocket, 
  BookOpen,
  FlaskConical,
  HelpCircle,
  HelpCircle as Globe,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AvatarModalProps {
  currentAvatar?: string;
  userName: string;
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
}

// Pre-defined icons for the Gradients & Icons tab
const ICON_TEMPLATES = [
  { id: 'atom', icon: Atom, label: 'Атом' },
  { id: 'grad', icon: GraduationCap, label: 'Выпускник' },
  { id: 'brain', icon: Brain, label: 'Нейросеть' },
  { id: 'flask', icon: FlaskConical, label: 'Лаборатория' },
  { id: 'rocket', icon: Rocket, label: 'Прогресс' },
  { id: 'code', icon: Code2, label: 'Код' },
  { id: 'award', icon: Award, label: 'Награда' },
  { id: 'book', icon: BookOpen, label: 'Знания' },
  { id: 'laptop', icon: Laptop, label: 'ИТ' },
];

const GRADIENTS = [
  { id: 'g1', css: 'from-blue-600 to-indigo-800', start: '#2563eb', end: '#1e1b4b' },
  { id: 'g2', css: 'from-emerald-500 to-teal-800', start: '#10b981', end: '#115e59' },
  { id: 'g3', css: 'from-purple-600 to-pink-800', start: '#9333ea', end: '#9d174d' },
  { id: 'g4', css: 'from-amber-500 to-rose-700', start: '#f59e0b', end: '#be123c' },
  { id: 'g5', css: 'from-cyan-500 to-blue-700', start: '#06b6d4', end: '#1d4ed8' },
  { id: 'g6', css: 'from-violet-600 to-fuchsia-800', start: '#7c3aed', end: '#86198f' },
  { id: 'g7', css: 'from-slate-700 to-slate-900', start: '#334155', end: '#0f172a' },
];

export const AvatarModal: React.FC<AvatarModalProps> = ({
  currentAvatar = '',
  userName,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'icons' | 'seed'>('icons');
  const [previewAvatar, setPreviewAvatar] = useState<string>(currentAvatar);
  
  // Icon & Gradient state
  const [selectedIcon, setSelectedIcon] = useState<string>('atom');
  const [selectedGradient, setSelectedGradient] = useState<string>('g1');

  // Seed-based state
  const [seedText, setSeedText] = useState<string>(userName || 'FE_User');
  const [seedType, setSeedType] = useState<'cats' | 'robots' | 'monsters'>('cats');

  // Generate Icon SVG manually on the client based on selected icon & gradient
  const generateIconSvg = () => {
    const iconObj = ICON_TEMPLATES.find(i => i.id === selectedIcon);
    const gradObj = GRADIENTS.find(g => g.id === selectedGradient);
    if (!iconObj || !gradObj) return;

    // We can fetch precompiled inner paths or directly draw styled circles and shapes.
    // Let's create beautifully styled, lightweight inline SVGs for our templates
    let iconContent = '';
    
    // Custom vector geometries for selected academic/science icons
    if (selectedIcon === 'atom') {
      iconContent = `
        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#ffffff" stroke-width="2.5" transform="rotate(30, 50, 50)" opacity="0.8"/>
        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#ffffff" stroke-width="2.5" transform="rotate(90, 50, 50)" opacity="0.8"/>
        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#ffffff" stroke-width="2.5" transform="rotate(150, 50, 50)" opacity="0.8"/>
        <circle cx="50" cy="50" r="7" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="32" cy="40" r="3" fill="#38bdf8"/>
        <circle cx="68" cy="60" r="3" fill="#38bdf8"/>
        <circle cx="50" cy="15" r="3" fill="#38bdf8"/>
      `;
    } else if (selectedIcon === 'grad') {
      iconContent = `
        <path d="M50 20 L85 35 L50 50 L15 35 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
        <path d="M28 44 L28 70 C28 75, 72 75, 72 70 L72 44" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <path d="M85 35 L85 62 L81 62 L81 37" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
        <circle cx="83" cy="62" r="3.5" fill="#f59e0b"/>
      `;
    } else if (selectedIcon === 'brain') {
      iconContent = `
        <path d="M44 25 C30 25, 25 35, 30 45 C25 50, 25 60, 32 65 C32 75, 42 75, 47 70 C49 72, 51 72, 53 70 C58 75, 68 75, 68 65 C75 60, 75 50, 70 45 C75 35, 70 25, 56 25 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M50 25 L50 72" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 3"/>
        <circle cx="36" cy="38" r="4.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
        <circle cx="64" cy="38" r="4.5" fill="#f43f5e" stroke="#ffffff" stroke-width="1"/>
        <circle cx="38" cy="58" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="1"/>
        <circle cx="62" cy="58" r="4.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1"/>
        <path d="M36 38 L50 48 L64 38 M38 58 L50 48 L62 58" stroke="#ffffff" stroke-width="1.5" opacity="0.6"/>
      `;
    } else if (selectedIcon === 'flask') {
      iconContent = `
        <path d="M42 20 L58 20 M46 20 L46 35 L25 70 C21 76, 26 82, 33 82 L67 82 C74 82, 79 76, 75 70 L54 35 L54 20" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M31 72 C35 68, 45 76, 50 72 C55 68, 65 76, 69 72 L69 80 L31 80 Z" fill="#38bdf8" opacity="0.8"/>
        <circle cx="44" cy="48" r="3" fill="#ffffff" opacity="0.9"/>
        <circle cx="56" cy="58" r="2.5" fill="#ffffff" opacity="0.9"/>
        <circle cx="50" cy="66" r="4" fill="#ffffff" opacity="0.9"/>
      `;
    } else if (selectedIcon === 'rocket') {
      iconContent = `
        <path d="M50 15 C55 25, 65 35, 65 55 L65 72 L35 72 L35 55 C35 35, 45 25, 50 15 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
        <path d="M35 58 L24 68 L24 75 L35 72 M65 58 L76 68 L76 75 L65 72" fill="#fbbf24" stroke="#ffffff" stroke-width="1.5"/>
        <path d="M44 72 L50 85 L56 72" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="50" cy="40" r="6" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      `;
    } else if (selectedIcon === 'code') {
      iconContent = `
        <path d="M30 35 L12 50 L30 65" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M70 35 L88 50 L70 65" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M57 24 L43 76" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      `;
    } else if (selectedIcon === 'award') {
      iconContent = `
        <circle cx="50" cy="42" r="22" fill="none" stroke="#ffffff" stroke-width="3"/>
        <circle cx="50" cy="42" r="16" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M40 60 L32 85 L50 75 L68 85 L60 60" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <polygon points="50,30 54,38 63,39 57,45 59,54 50,49 41,54 43,45 37,39 46,38" fill="#fbbf24"/>
      `;
    } else if (selectedIcon === 'book') {
      iconContent = `
        <path d="M50 78 C50 78, 24 72, 16 78 L16 28 C24 22, 50 28, 50 28 C50 28, 76 22, 84 28 L84 78 C76 72, 50 78, 50 78 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M50 28 L50 78" stroke="#ffffff" stroke-width="2"/>
        <path d="M22 38 L44 42 M22 48 L44 52 M22 58 L44 62 M78 38 L56 42 M78 48 L56 52 M78 58 L56 62" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      `;
    } else { // laptop
      iconContent = `
        <rect x="22" y="24" width="56" height="38" rx="3" fill="none" stroke="#ffffff" stroke-width="3"/>
        <path d="M12 66 L88 66 C88 66, 84 76, 76 76 L24 76 C16 76, 12 66, 12 66 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
        <line x1="44" y1="71" x2="56" y2="71" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="43" r="6" fill="#fbbf24"/>
      `;
    }

    const compiledSvg = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${gradObj.start}" />
            <stop offset="100%" stop-color="${gradObj.end}" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#avatarGrad)" />
        ${iconContent}
      </svg>
    `.trim().replace(/\s+/g, ' ');

    setPreviewAvatar(compiledSvg);
  };

  // Run icon SVG generator on icon / gradient state changes
  useEffect(() => {
    if (activeTab === 'icons') {
      generateIconSvg();
    }
  }, [selectedIcon, selectedGradient, activeTab]);

  // Handle seed-based avatar calculation
  const handleGenerateSeedAvatar = () => {
    let url = '';
    const encodedSeed = encodeURIComponent(seedText.trim());
    if (seedType === 'cats') {
      url = `https://robohash.org/${encodedSeed}?set=set4&bgset=bg1`;
    } else if (seedType === 'robots') {
      url = `https://robohash.org/${encodedSeed}?set=set1&bgset=bg2`;
    } else {
      url = `https://robohash.org/${encodedSeed}?set=set2&bgset=bg1`;
    }
    setPreviewAvatar(url);
  };

  useEffect(() => {
    if (activeTab === 'seed') {
      handleGenerateSeedAvatar();
    }
  }, [seedText, seedType, activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full flex flex-col md:flex-row h-auto md:h-[520px] max-h-[90vh]"
      >
        {/* Left pane: Avatar Preview */}
        <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 md:w-56 flex-shrink-0">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-6 font-mono">Предпросмотр</p>
          
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-3xl bg-slate-200 dark:bg-slate-800 p-1 shadow-lg relative overflow-hidden group">
            {previewAvatar ? (
              previewAvatar.startsWith('<svg') ? (
                <div 
                  className="w-full h-full rounded-[22px] overflow-hidden" 
                  dangerouslySetInnerHTML={{ __html: previewAvatar }}
                />
              ) : (
                <img 
                  referrerPolicy="no-referrer"
                  src={previewAvatar} 
                  alt="Avatar Preview" 
                  className="w-full h-full rounded-[22px] object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-3xl">
                {userName[0]}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[160px]">{userName}</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Аватар исследователя</p>
          </div>
        </div>

        {/* Right pane: Controls */}
        <div className="flex-1 flex flex-col p-6 min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#0a2a5e] dark:text-blue-300">Редактор аватара</h3>
              <p className="text-xs text-slate-400 mt-0.5">Выберите способ создания своего научного портрета</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl mb-5 space-x-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('icons')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'icons' 
                  ? 'bg-white dark:bg-slate-900 text-[#0a2a5e] dark:text-blue-300 shadow' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              <span>Иконки ФЭМ</span>
            </button>
            <button
              onClick={() => setActiveTab('seed')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'seed' 
                  ? 'bg-white dark:bg-slate-900 text-[#0a2a5e] dark:text-blue-300 shadow' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Сид-Генератор</span>
            </button>
          </div>

          {/* Tab Contents - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1 text-slate-700 dark:text-slate-300 min-h-0">
            {/* GRADIENTS & ICONS TAB */}
            {activeTab === 'icons' && (
              <div className="space-y-4">
                {/* Icons Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Выберите научный символ</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {ICON_TEMPLATES.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = selectedIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedIcon(item.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-[#d4af37] bg-amber-500/5 text-[#0a2a5e] dark:text-amber-400 font-bold' 
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-[10px] text-center truncate w-full">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gradients Row */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Выберите градиентный фон</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENTS.map((grad) => {
                      const isSelected = selectedGradient === grad.id;
                      return (
                        <button
                          key={grad.id}
                          onClick={() => setSelectedGradient(grad.id)}
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${grad.css} cursor-pointer shadow-sm relative transition-all hover:scale-105 flex items-center justify-center`}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white stroke-[3px]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SEED GENERATOR TAB */}
            {activeTab === 'seed' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Введите текстовый Сид</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Введите слово..."
                      value={seedText}
                      onChange={(e) => setSeedText(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                    />
                    <button
                      onClick={() => setSeedText(Math.random().toString(36).substring(7))}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Стиль персонажей</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cats', label: 'Котики' },
                      { id: 'robots', label: 'Роботы' },
                      { id: 'monsters', label: 'Монстрики' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSeedType(style.id as any)}
                        className={`py-2 px-3 rounded-xl border text-xs text-center cursor-pointer transition-all ${
                          seedType === style.id
                            ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 flex items-center justify-end space-x-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => onSave(previewAvatar)}
              disabled={!previewAvatar}
              className="px-5 py-2.5 rounded-xl bg-[#0a2a5e] hover:bg-blue-800 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить аватар</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
