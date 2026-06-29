import React, { useState, useRef } from 'react';
import { PortalDatabase } from '../services/storage';
import { CustomUser, SNIL, ResearchTask } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FlaskConical, 
  Award, 
  Users, 
  CheckCircle2, 
  Plus, 
  Clock, 
  FileCheck, 
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Briefcase,
  Download,
  Loader2
} from 'lucide-react';

interface SnilViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  selectedSnilId: string | null;
  onClearSelectedSnil: () => void;
  onRefresh: () => void;
}

export const SnilView: React.FC<SnilViewProps> = ({
  db,
  user,
  selectedSnilId,
  onClearSelectedSnil,
  onRefresh
}) => {
  const [activeSnil, setActiveSnil] = useState<SNIL>(
    selectedSnilId ? db.snils.find(s => s.id === selectedSnilId) || db.snils[0] : db.snils[0]
  );
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isGeneratingApplication, setIsGeneratingApplication] = useState(false);
  const snilApplicationRef = useRef<HTMLDivElement>(null);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');

  const isHead = user && (user.record_book_id === activeSnil?.head_record_book || user.role === 'coordinator' || user.role === 'admin');
  const isMember = user && activeSnil?.member_record_books.includes(user.record_book_id);

  const snilTasks = activeSnil ? db.tasks.filter(t => t.snil_id === activeSnil.id) : [];

  const handleJoinRequest = () => {
    if (!user || !activeSnil) return;
    if (activeSnil.member_record_books.includes(user.record_book_id)) return;

    activeSnil.member_record_books.push(user.record_book_id);
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_record_book: activeSnil.head_record_book,
      title: 'Новый участник в лаборатории СНИЛ!',
      message: `Студент ${user.last_name} ${user.first_name} вступил в состав «${activeSnil.name}»`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !activeSnil) return;

    const assigneeUser = db.users.find(u => u.record_book_id === taskAssignee) || user!;

    const newTask: ResearchTask = {
      id: 'task_' + Date.now(),
      snil_id: activeSnil.id,
      snil_name: activeSnil.name,
      title: taskTitle,
      description: taskDesc,
      assigned_to_record_book: assigneeUser.record_book_id,
      assigned_to_name: `${assigneeUser.last_name} ${assigneeUser.first_name}`,
      deadline: taskDeadline || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      status: 'в_работе',
      created_at: new Date().toISOString()
    };

    db.tasks.unshift(newTask);
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_record_book: assigneeUser.record_book_id,
      title: 'Новое исследовательское задание в СНИЛ',
      message: `Руководитель назначил вам задачу: «${taskTitle}» (дополнительные баллы рейтинга)`,
      type: 'warning',
      is_read: false,
      created_at: new Date().toISOString()
    });

    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    setTaskTitle('');
    setTaskDesc('');
    setShowTaskForm(false);
    onRefresh();
  };

  const handleCompleteTask = (taskId: string) => {
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.status = 'выполнена';
    task.result_file_name = 'Аналитический_отчет_ФЭМ.pdf';
    localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
    onRefresh();
  };

  const generateSnilApplication = async () => {
    if (!snilApplicationRef.current || !activeSnil || !user) return;
    setIsGeneratingApplication(true);
    
    try {
      const canvas = await html2canvas(snilApplicationRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Заявление_СНИЛ_${activeSnil.name.replace(/\s+/g, '_')}_${user.last_name}.pdf`);
      
      // Notify laboratory head
      db.notifications.push({
        id: 'notif_' + Date.now(),
        user_record_book: activeSnil.head_record_book,
        title: 'Сформировано заявление на вступление',
        message: `Студент ${user.last_name} подготовил заявление на вступление в вашу СНИЛ «${activeSnil.name}»`,
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('fem_bseu_portal_db_v1', JSON.stringify(db));
      onRefresh();

    } catch (error) {
      console.error('SNIL Application PDF Error:', error);
    } finally {
      setIsGeneratingApplication(false);
    }
  };

  if (db.snils.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border p-8">
        <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Студенческих лабораторий пока не создано.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Шапка раздела */}
      <div className="bg-gradient-to-r from-[#0a2a5e] to-teal-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg border border-[#d4af37]/30">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-[#d4af37] text-xs font-bold uppercase tracking-wider font-mono">
            <FlaskConical className="w-4 h-4" />
            <span>Студенческие научно-исследовательские лаборатории</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">СНИЛ факультета <span className="text-[#d4af37]">ФЭМ</span> БГЭУ</h2>
          <p className="text-blue-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Прикладные исследования экономики Беларуси, выполнение госбюджетных тем, подготовка конкурсных работ на республиканский уровень.
          </p>
        </div>

        {/* Выбор СНИЛ */}
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-mono uppercase text-blue-200 mb-1">Выбрать лабораторию:</label>
          <select
            value={activeSnil?.id}
            onChange={(e) => {
              const f = db.snils.find(s => s.id === e.target.value);
              if (f) setActiveSnil(f);
            }}
            className="w-full md:w-72 bg-slate-900/90 border border-[#d4af37]/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none"
          >
            {db.snils.map(sn => (
              <option key={sn.id} value={sn.id}>{sn.name}</option>
            ))}
          </select>
        </div>
      </div>

      {activeSnil && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Профиль СНИЛ (Левые 2 колонки) */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-mono">
                    {activeSnil.department}
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#0a2a5e] mt-3">{activeSnil.name}</h3>
                  <p className="text-slate-500 text-xs mt-1">Руководитель СНИЛ: <strong className="text-slate-800">{activeSnil.head_name}</strong></p>
                </div>

                {activeSnil.is_best_snil_nominee && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#d4af37] to-amber-500 text-[#0a2a5e] rounded-xl font-bold text-xs shadow">
                    <Award className="w-4 h-4" />
                    <span>Номинант «Лучшая СНИЛ БГЭУ»</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 font-mono">Направления исследований</h4>
                <div className="flex flex-wrap gap-2">
                  {activeSnil.research_directions.map((dir, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 text-xs font-medium border border-blue-100">
                      🔬 {dir}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 font-mono">Описание деятельности</h4>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{activeSnil.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 font-mono">Ключевые достижения</h4>
                <ul className="space-y-2">
                  {activeSnil.achievements.map((ach, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-xs sm:text-sm text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <Award className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                      <span>{ach}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Вступление в состав */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>В составе лаборатории: <strong>{activeSnil.member_record_books.length} студентов</strong></span>
                </div>

                {isMember ? (
                  <span className="px-4 py-2 rounded-xl bg-green-100 text-green-800 font-bold text-xs flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" /> <span>Вы состоите в СНИЛ</span>
                  </span>
                ) : (
                  <div className="flex items-center space-x-3">
                    {user && (
                      <button
                        onClick={generateSnilApplication}
                        disabled={isGeneratingApplication}
                        className="px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 font-bold text-xs hover:bg-blue-50 transition-all flex items-center space-x-2 disabled:opacity-50"
                        title="Сгенерировать официальное заявление для подписи"
                      >
                        {isGeneratingApplication ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>{isGeneratingApplication ? 'Генерация...' : 'Заявление (PDF)'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleJoinRequest}
                      disabled={!user}
                      className="px-5 py-2.5 rounded-xl bg-[#0a2a5e] text-[#d4af37] font-bold text-xs shadow hover:bg-blue-900 transition-all"
                    >
                      {user ? 'Подать заявку' : 'Войдите для вступления'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Скрытый шаблон для заявления СНИЛ */}
            <div 
              style={{ 
                position: 'fixed', 
                left: '-10000px', 
                top: 0, 
                pointerEvents: 'none',
                zIndex: -300
              }}
            >
              <div 
                ref={snilApplicationRef} 
                className="w-[800px] p-[100px] bg-white text-black font-serif"
                style={{ fontFamily: 'Times New Roman, serif', backgroundColor: '#ffffff', minHeight: '1100px', color: '#000000' }}
              >
                <div className="ml-auto w-1/2 text-sm space-y-1 mb-20" style={{ marginLeft: 'auto', width: '50%', marginBottom: '5rem' }}>
                  <p>Руководителю СНИЛ</p>
                  <p>«{activeSnil.name}»</p>
                  <p>{activeSnil.head_name}</p>
                  <p className="pt-2" style={{ paddingTop: '0.5rem' }}>студента(ки) {user?.course} курса, группы {user?.group}</p>
                  <p className="font-bold" style={{ fontWeight: 'bold' }}>{user?.last_name} {user?.first_name} {user?.middle_name || ''}</p>
                </div>

                <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h2 className="text-2xl font-bold uppercase tracking-widest" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '1.5rem' }}>ЗАЯВЛЕНИЕ</h2>
                </div>

                <div className="text-lg leading-relaxed text-justify mb-20 px-4" style={{ fontSize: '1.125rem', lineHeight: '1.625', textAlign: 'justify', marginBottom: '5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                  <p>
                    Прошу включить меня в состав участников Студенческой научно-исследовательской лаборатории (СНИЛ) «{activeSnil.name}» факультета экономики и менеджмента БГЭУ.
                  </p>
                  <p className="mt-6" style={{ marginTop: '1.5rem' }}>
                    Намерен(а) принимать активное участие в научно-исследовательской работе лаборатории по направлениям: 
                    <span className="italic" style={{ fontStyle: 'italic' }}> {activeSnil.research_directions.join(', ')}</span>.
                  </p>
                  <p className="mt-6" style={{ marginTop: '1.5rem' }}>
                    Обязуюсь соблюдать внутренний регламент работы СНИЛ и своевременно выполнять порученные научно-исследовательские задания.
                  </p>
                </div>

                <div className="flex justify-between items-end mt-40 px-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
                  <div className="text-lg pb-1 w-40 text-center" style={{ fontSize: '1.125rem', borderBottom: '1px solid #000000', width: '10rem', textAlign: 'center' }}>
                    {new Date().toLocaleDateString('ru-RU')}
                  </div>
                  <div className="text-lg pb-1 w-48 text-center relative" style={{ fontSize: '1.125rem', borderBottom: '1px solid #000000', width: '12rem', textAlign: 'center', position: 'relative' }}>
                    <span className="text-[10px] absolute -bottom-5 left-0 right-0 text-center uppercase font-sans" style={{ fontSize: '10px', position: 'absolute', bottom: '-1.25rem', left: 0, right: 0, textAlign: 'center', textTransform: 'uppercase', color: '#9ca3af' }}>Подпись</span>
                  </div>
                </div>

                <div className="mt-32 pt-10 border-t text-[10px] font-sans italic text-center" style={{ marginTop: '8rem', paddingTop: '2.5rem', borderTop: '1px solid #f3f4f6', fontSize: '10px', fontStyle: 'italic', textAlign: 'center', color: '#d1d5db' }}>
                  Сформировано в SNO.PORTAL • Кафедра {activeSnil.department} • {new Date().toLocaleString('ru-RU')}
                </div>
              </div>
            </div>

            {/* Блок задач СНИЛ */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0a2a5e] flex items-center space-x-2">
                    <Briefcase className="w-5 h-5 text-[#d4af37]" />
                    <span>Исследовательские задачи СНИЛ</span>
                  </h3>
                  <p className="text-xs text-slate-500">Практические поручения от руководителя (статьи, расчёты, гранты)</p>
                </div>

                {isHead && (
                  <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0a2a5e] text-[#d4af37] font-bold text-xs flex items-center space-x-1 hover:bg-blue-900"
                  >
                    <Plus className="w-4 h-4" /> <span>Поставить задачу</span>
                  </button>
                )}
              </div>

              {/* Форма постановки задачи */}
              {showTaskForm && (
                <form onSubmit={handleCreateTask} className="p-6 bg-slate-50 rounded-2xl border border-blue-200 space-y-4 animate-fadeIn">
                  <h4 className="font-bold text-sm text-[#0a2a5e]">Постановка новой исследовательской задачи</h4>
                  <div>
                    <input
                      type="text"
                      placeholder="Название задачи (например: Сбор статистики по инновациям РБ)..."
                      required
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <textarea
                      rows={3}
                      placeholder="Детальное описание и требования..."
                      value={taskDesc}
                      onChange={e => setTaskDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Исполнитель (Студент):</label>
                      <select
                        value={taskAssignee}
                        onChange={e => setTaskAssignee(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
                      >
                        <option value="">-- Выберите участника СНИЛ --</option>
                        {db.users.map(u => (
                          <option key={u.record_book_id} value={u.record_book_id}>{u.last_name} {u.first_name} ({u.group})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Дедлайн:</label>
                      <input
                        type="date"
                        value={taskDeadline}
                        onChange={e => setTaskDeadline(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 text-xs text-slate-600">Отмена</button>
                    <button type="submit" className="px-4 py-1.5 bg-[#d4af37] text-[#0a2a5e] font-bold text-xs rounded-lg">Назначить</button>
                  </div>
                </form>
              )}

              {/* Список поручений */}
              {snilTasks.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400">Активных задач в лаборатории пока нет.</p>
              ) : (
                <div className="space-y-3">
                  {snilTasks.map(t => (
                    <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            t.status === 'выполнена' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">Дедлайн: {t.deadline}</span>
                        </div>
                        <h5 className="font-bold text-sm text-[#0a2a5e]">{t.title}</h5>
                        <p className="text-xs text-slate-600">{t.description}</p>
                        <p className="text-[11px] text-blue-900 font-medium">👤 Исполнитель: {t.assigned_to_name}</p>
                      </div>

                      {t.status !== 'выполнена' && user && (user.record_book_id === t.assigned_to_record_book || isHead) && (
                        <button
                          onClick={() => handleCompleteTask(t.id)}
                          className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs flex items-center justify-center space-x-1 self-start sm:self-center flex-shrink-0 shadow"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Сдать отчёт</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Правая колонка СНИЛ: Члены лаборатории и гранты */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-[#0a2a5e] flex items-center space-x-2 text-sm">
                <Users className="w-4 h-4 text-[#d4af37]" />
                <span>Исследователи лаборатории</span>
              </h4>
              <div className="space-y-2">
                {activeSnil.member_record_books.map(mb => {
                  const u = db.users.find(usr => usr.record_book_id === mb);
                  return (
                    <div key={mb} className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-800 font-sans font-semibold">{u ? `${u.last_name} ${u.first_name}` : mb}</span>
                      <span className="text-[10px] text-slate-400">{u?.group || 'БГЭУ'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
