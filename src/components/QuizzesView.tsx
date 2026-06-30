import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  PortalDatabase, 
  savePortalDB, 
  addNotificationAndNotifyTelegram,
  canAccessAdmin 
} from '../services/storage';
import { 
  CustomUser, 
  Quiz, 
  QuizQuestion, 
  QuizAttempt, 
  Certificate 
} from '../types';
import { CertificateModal } from './CertificateModal';
import { UserAvatar } from './UserAvatar';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Award, 
  AlertCircle, 
  HelpCircle, 
  Send, 
  Eye, 
  ClipboardCheck, 
  Users, 
  Lock, 
  Unlock, 
  Clock, 
  Image as ImageIcon, 
  Video, 
  ChevronRight, 
  ChevronLeft,
  Coins, 
  CheckCircle2,
  Upload,
  Trophy,
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface QuizzesViewProps {
  db: PortalDatabase;
  user: CustomUser | null;
  onRefresh: () => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({ db, user, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'create'>('all');
  const isAdmin = user && canAccessAdmin(user);

  // Multi-question quiz creation state
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id'>[]>([
    { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' },
    { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' }
  ]);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number>(0);

  // Score config
  const [place1Points, setPlace1Points] = useState<number>(50);
  const [place2Points, setPlace2Points] = useState<number>(30);
  const [place3Points, setPlace3Points] = useState<number>(20);

  // Student taking quiz state
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentTakeIdx, setCurrentTakeIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [submittingQuizId, setSubmittingQuizId] = useState<string | null>(null);

  // Results viewing modal state
  const [activeResultsQuiz, setActiveResultsQuiz] = useState<Quiz | null>(null);
  const [resultsQuestions, setResultsQuestions] = useState<QuizQuestion[]>([]);
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);

  // Admin management state
  const [managingQuiz, setManagingQuiz] = useState<Quiz | null>(null);
  const [editingPoints, setEditingPoints] = useState<Record<number, number>>({
    1: 50,
    2: 30,
    3: 20
  });

  // Drag over states for file inputs
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // --- Quiz Builder Functions ---

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' }
    ]);
    setExpandedQuestionIdx(questions.length);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length > 2) {
      const updated = questions.filter((_, i) => i !== idx);
      setQuestions(updated);
      if (expandedQuestionIdx >= updated.length) {
        setExpandedQuestionIdx(updated.length - 1);
      }
    } else {
      alert('В викторине должно быть минимум два вопроса!');
    }
  };

  const updateQuestion = (idx: number, fields: Partial<Omit<QuizQuestion, 'id'>>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...fields };
    setQuestions(updated);
  };

  const handleAddOption = (qIdx: number) => {
    const q = questions[qIdx];
    if (q.options.length < 6) {
      updateQuestion(qIdx, { options: [...q.options, ''] });
    }
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    if (q.options.length > 2) {
      const updatedOpts = q.options.filter((_, i) => i !== optIdx);
      let correctIdx = q.correctOptionIndex;
      if (correctIdx >= updatedOpts.length) {
        correctIdx = updatedOpts.length - 1;
      }
      updateQuestion(qIdx, { options: updatedOpts, correctOptionIndex: correctIdx });
    }
  };

  const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
    const q = questions[qIdx];
    const updatedOpts = [...q.options];
    updatedOpts[optIdx] = text;
    updateQuestion(qIdx, { options: updatedOpts });
  };

  // Process uploaded files for a specific question
  const processQuestionFile = (qIdx: number, file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Допускаются только изображения или видео файлы!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateQuestion(qIdx, {
        mediaType: isVideo ? 'video' : 'photo',
        mediaData: dataUrl
      });
    };
    reader.readAsDataURL(file);
  };

  const clearQuestionMedia = (qIdx: number) => {
    updateQuestion(qIdx, {
      mediaType: 'none',
      mediaData: ''
    });
  };

  // --- Save / Create Quiz Submit ---

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Заполните название викторины!');
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Заполните текст вопроса №${i + 1}!`);
        setExpandedQuestionIdx(i);
        return;
      }
      const filledOpts = q.options.map(o => o.trim()).filter(Boolean);
      if (filledOpts.length < 2) {
        alert(`Вопрос №${i + 1} должен содержать как минимум 2 заполненных варианта ответа!`);
        setExpandedQuestionIdx(i);
        return;
      }
    }

    // Map to db format
    const finalQuestions: QuizQuestion[] = questions.map((q, idx) => ({
      id: `q_${Date.now()}_${idx}`,
      question: q.question.trim(),
      options: q.options.map(o => o.trim()).filter(Boolean),
      correctOptionIndex: q.correctOptionIndex,
      clarification: q.clarification.trim(),
      mediaType: q.mediaType,
      mediaData: q.mediaData
    }));

    const newQuiz: Quiz = {
      id: 'quiz_' + Date.now(),
      title: title.trim(),
      questions: finalQuestions,
      // legacy support fallbacks (using the first question)
      question: finalQuestions[0].question,
      options: finalQuestions[0].options,
      correctOptionIndex: finalQuestions[0].correctOptionIndex,
      clarification: finalQuestions[0].clarification,
      mediaType: finalQuestions[0].mediaType,
      mediaData: finalQuestions[0].mediaData,
      status: 'open',
      resultsPublished: false,
      pointsForPlaces: [
        { place: 1, points: place1Points },
        { place: 2, points: place2Points },
        { place: 3, points: place3Points }
      ],
      created_at: new Date().toISOString()
    };

    db.quizzes = db.quizzes || [];
    db.quizzes.unshift(newQuiz);
    savePortalDB(db);

    // Send global notification to all researchers
    addNotificationAndNotifyTelegram({
      id: 'notif_quiz_created_' + Date.now(),
      user_record_book: 'all',
      title: '🌟 Новая викторина СНО ФЭМ!',
      message: `Опубликована новая викторина: "${newQuiz.title}" из ${finalQuestions.length} вопросов. Пройдите её прямо сейчас и заработайте баллы!`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    // Reset Form
    setTitle('');
    setQuestions([
      { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' },
      { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' }
    ]);
    setExpandedQuestionIdx(0);
    setPlace1Points(50);
    setPlace2Points(30);
    setPlace3Points(20);
    setActiveSubTab('all');
    onRefresh();
  };

  // Toggle Quiz Access Status
  const handleToggleQuizStatus = (quiz: Quiz) => {
    quiz.status = quiz.status === 'open' ? 'closed' : 'open';
    savePortalDB(db);
    onRefresh();
  };

  // Delete Quiz
  const handleDeleteQuiz = (quizId: string) => {
    if (!window.confirm('Вы действительно хотите удалить эту викторину и все её результаты?')) return;
    db.quizzes = db.quizzes.filter(q => q.id !== quizId);
    db.quizAttempts = db.quizAttempts.filter(att => att.quizId !== quizId);
    savePortalDB(db);
    onRefresh();
  };

  // --- Student Answering Walkthrough ---

  // Standardizer helper for legacy & new quiz questions
  const getQuizQuestionsList = (quiz: Quiz): QuizQuestion[] => {
    if (quiz.questions && quiz.questions.length > 0) {
      return quiz.questions;
    }
    // Return legacy as single question array
    return [{
      id: 'legacy_question',
      question: quiz.question || '',
      options: quiz.options || [],
      correctOptionIndex: quiz.correctOptionIndex ?? 0,
      clarification: quiz.clarification || '',
      mediaType: quiz.mediaType,
      mediaData: quiz.mediaData
    }];
  };

  const handleTakeQuiz = (quiz: Quiz) => {
    if (quiz.status === 'closed') return;
    const questionsList = getQuizQuestionsList(quiz);
    setViewingQuiz(quiz);
    setQuizQuestions(questionsList);
    setCurrentTakeIdx(0);
    setSelectedAnswers({});
    setQuizStartTime(Date.now());
  };

  const handleSelectAnswer = (questionId: string, optionIdx: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIdx
    });
  };

  const handleNextQuestion = () => {
    if (currentTakeIdx < quizQuestions.length - 1) {
      setCurrentTakeIdx(currentTakeIdx + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentTakeIdx > 0) {
      setCurrentTakeIdx(currentTakeIdx - 1);
    }
  };

  const handleSubmitQuizAnswers = () => {
    if (!viewingQuiz || !user) return;
    
    // Ensure all questions are answered
    const unanswered = quizQuestions.some(q => selectedAnswers[q.id] === undefined);
    if (unanswered) {
      if (!window.confirm('Некоторые вопросы остались без ответа. Вы действительно хотите отправить результаты?')) {
        return;
      }
    }

    setSubmittingQuizId(viewingQuiz.id);
    const timeSpentMs = Date.now() - quizStartTime;

    const answers = quizQuestions.map(q => {
      const selectedIdx = selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1;
      const isCorrect = selectedIdx === q.correctOptionIndex;
      return {
        questionId: q.id,
        selectedOptionIndex: selectedIdx,
        isCorrect
      };
    });

    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalQuestions = quizQuestions.length;

    // Is it a completely perfect/correct response (legacy compat fallback)
    const isPerfect = correctCount === totalQuestions;

    const newAttempt: QuizAttempt = {
      id: 'attempt_' + Date.now() + '_' + user.record_book_id,
      quizId: viewingQuiz.id,
      userRecordBook: user.record_book_id,
      userName: `${user.last_name} ${user.first_name} ${user.middle_name || ''}`.trim(),
      userGroup: user.group,
      // legacy support
      selectedOptionIndex: answers[0]?.selectedOptionIndex ?? 0,
      isCorrect: isPerfect,
      // multi-question support
      answers,
      correctCount,
      totalQuestions,
      timeSpentMs,
      answeredAt: new Date().toISOString()
    };

    db.quizAttempts = db.quizAttempts || [];
    db.quizAttempts.push(newAttempt);
    savePortalDB(db);

    // Local push notification
    addNotificationAndNotifyTelegram({
      id: 'notif_attempt_' + Date.now(),
      user_record_book: user.record_book_id,
      title: '📝 Ваши ответы приняты',
      message: `Вы прошли викторину "${viewingQuiz.title}". Результат: ${correctCount}/${totalQuestions} верных ответов за ${(timeSpentMs / 1000).toFixed(1)} сек. Итоги будут опубликованы куратором!`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    });

    setViewingQuiz(null);
    setSubmittingQuizId(null);
    onRefresh();
  };

  // Filter student attempts for current user
  const userAttemptsMap = useMemo(() => {
    if (!user) return new Map<string, QuizAttempt>();
    const mapping = new Map<string, QuizAttempt>();
    db.quizAttempts?.forEach(att => {
      if (att.userRecordBook === user.record_book_id) {
        mapping.set(att.quizId, att);
      }
    });
    return mapping;
  }, [db.quizAttempts, user]);

  // Compute attempts statistics for admin management
  const getAttemptsForQuiz = (quizId: string) => {
    return db.quizAttempts?.filter(att => att.quizId === quizId) || [];
  };

  // --- Publish Quiz Results and distribute places ---

  const handlePublishResults = (quiz: Quiz) => {
    const quizAttempts = getAttemptsForQuiz(quiz.id);
    const questionsList = getQuizQuestionsList(quiz);
    const totalQCount = questionsList.length;

    // Score & Rank attempts:
    // 1. More correct answers first.
    // 2. Faster response time first (timeSpentMs).
    // 3. Fallback to submission timestamp.
    const sortedAttempts = [...quizAttempts].sort((a, b) => {
      const aCorrect = a.correctCount !== undefined ? a.correctCount : (a.isCorrect ? 1 : 0);
      const bCorrect = b.correctCount !== undefined ? b.correctCount : (b.isCorrect ? 1 : 0);

      if (aCorrect !== bCorrect) {
        return bCorrect - aCorrect; // Descending score
      }

      const aTime = a.timeSpentMs !== undefined ? a.timeSpentMs : new Date(a.answeredAt).getTime();
      const bTime = b.timeSpentMs !== undefined ? b.timeSpentMs : new Date(b.answeredAt).getTime();

      return aTime - bTime; // Ascending time (faster is better)
    });

    const pointsConfig = {
      1: editingPoints[1] ?? (quiz.pointsForPlaces.find(p => p.place === 1)?.points ?? 50),
      2: editingPoints[2] ?? (quiz.pointsForPlaces.find(p => p.place === 2)?.points ?? 30),
      3: editingPoints[3] ?? (quiz.pointsForPlaces.find(p => p.place === 3)?.points ?? 20),
    };

    const winners: { place: number; studentRecordBook: string; name: string; group: string; points: number; score?: string }[] = [];

    // Filter to only those who answered at least one question correctly (to avoid ranking 0/N participants)
    const validCompetitors = sortedAttempts.filter(att => {
      const correct = att.correctCount !== undefined ? att.correctCount : (att.isCorrect ? 1 : 0);
      return correct > 0;
    });

    validCompetitors.forEach((attempt, index) => {
      const place = index + 1;
      const awardedPoints = pointsConfig[place as 1 | 2 | 3] || 0;
      const correct = attempt.correctCount !== undefined ? attempt.correctCount : (attempt.isCorrect ? 1 : 0);
      const scoreStr = `${correct}/${attempt.totalQuestions || totalQCount} верных за ${((attempt.timeSpentMs || 0) / 1000).toFixed(1)}с`;

      winners.push({
        place,
        studentRecordBook: attempt.userRecordBook,
        name: attempt.userName,
        group: attempt.userGroup,
        points: awardedPoints,
        score: scoreStr
      });

      if (awardedPoints > 0) {
        // Create Certificate
        const newCert: Certificate = {
          id: 'cert_quiz_' + quiz.id + '_' + Date.now() + '_' + attempt.userRecordBook,
          user_record_book: attempt.userRecordBook,
          title: `Победитель викторины "${quiz.title}" (${place}-е место)`,
          event_name: 'Викторины СНО ФЭМ',
          issue_date: new Date().toISOString().split('T')[0],
          type: place === 1 ? 'диплом_1_степени' : place === 2 ? 'диплом_2_степени' : place === 3 ? 'диплом_3_степени' : 'сертификат_участника',
          custom_points: awardedPoints
        };

        db.certificates = db.certificates || [];
        db.certificates.push(newCert);

        // Send push & Telegram
        addNotificationAndNotifyTelegram({
          id: 'notif_quiz_winner_' + attempt.userRecordBook + '_' + Date.now(),
          user_record_book: attempt.userRecordBook,
          title: '🏆 Поздравляем с победой в викторине!',
          message: `В викторине "${quiz.title}" вы заняли ${place}-е место! Ваш результат: ${scoreStr}. Вам начислено ${awardedPoints} рейтинговых баллов.`,
          type: 'success',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    });

    // Notify other participants
    const otherParticipantBooks = new Set<string>(quizAttempts.map(att => att.userRecordBook));
    winners.forEach(w => otherParticipantBooks.delete(w.studentRecordBook));

    otherParticipantBooks.forEach(recordBook => {
      addNotificationAndNotifyTelegram({
        id: 'notif_quiz_participation_' + recordBook + '_' + Date.now(),
        user_record_book: recordBook,
        title: 'ℹ️ Итоги викторины опубликованы',
        message: `Подведены итоги викторины "${quiz.title}". Спасибо за участие! Ознакомиться со своим результатом и разобрать верные решения можно в разделе "Викторины".`,
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      });
    });

    // Update Quiz
    quiz.status = 'closed';
    quiz.resultsPublished = true;
    quiz.winners = winners;
    quiz.pointsForPlaces = [
      { place: 1, points: pointsConfig[1] },
      { place: 2, points: pointsConfig[2] },
      { place: 3, points: pointsConfig[3] }
    ];

    savePortalDB(db);
    setManagingQuiz(null);
    onRefresh();
  };

  const handleOpenResultsModal = (quiz: Quiz) => {
    setActiveResultsQuiz(quiz);
    setResultsQuestions(getQuizQuestionsList(quiz));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* View Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 bg-emerald-600/20 rounded-xl text-emerald-400">
                <Trophy className="w-6 h-6" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">Интеллектуальный Клуб</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Викторины СНО ФЭМ</h1>
            <p className="text-emerald-200/80 mt-2 text-sm max-w-xl">Участвуйте в регулярных викторинах от куратора, отвечайте правильно быстрее всех, занимайте призовые места и получайте реальные рейтинговые баллы!</p>
          </div>
          {isAdmin && (
            <div className="flex bg-blue-950/60 p-1.5 rounded-2xl border border-emerald-800 self-stretch md:self-auto">
              <button 
                onClick={() => setActiveSubTab('all')}
                className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${activeSubTab === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Все викторины</span>
              </button>
              <button 
                onClick={() => {
                  setActiveSubTab('create');
                  setQuestions([
                    { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' },
                    { question: '', options: ['', ''], correctOptionIndex: 0, clarification: '', mediaType: 'none', mediaData: '' }
                  ]);
                  setExpandedQuestionIdx(0);
                }}
                className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${activeSubTab === 'create' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-200 hover:text-white'}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать новую</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {activeSubTab === 'create' && isAdmin ? (
        /* Create Quiz Form Container */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Конструктор викторины</h2>
          </div>
          <form onSubmit={handleCreateQuiz} className="space-y-6">
            
            {/* Title setting */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-150 dark:border-slate-850">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Название викторины</label>
              <input
                type="text"
                required
                placeholder="Например: Основы макроэкономики БГЭУ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              />
            </div>

            {/* Questions container */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Список вопросов ({questions.length})</span>
                <span className="text-[11px] text-slate-400 font-medium italic">Минимум 2 вопроса, максимум неограничено</span>
              </div>

              {questions.map((q, qIdx) => {
                const isExpanded = expandedQuestionIdx === qIdx;
                return (
                  <div 
                    key={qIdx}
                    className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                      isExpanded 
                        ? 'border-emerald-500 ring-1 ring-yellow-500/20 bg-white dark:bg-slate-900 shadow-md' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50'
                    }`}
                  >
                    {/* Accordion header */}
                    <div 
                      onClick={() => setExpandedQuestionIdx(isExpanded ? -1 : qIdx)}
                      className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center ${
                          isExpanded ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {qIdx + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {q.question.trim() ? q.question : <span className="text-slate-400 italic font-normal">Текст вопроса не заполнен...</span>}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        {questions.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveQuestion(qIdx);
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-green-500 transition-colors"
                            title="Удалить вопрос"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Accordion content */}
                    {isExpanded && (
                      <div className="px-5 pb-6 pt-2 border-t border-slate-150 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white dark:bg-slate-900">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Текст вопроса</label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Какая наука изучает наиболее общие законы развития природы, общества и мышления?"
                              value={q.question}
                              onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium resize-none"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Варианты ответов</label>
                              {q.options.length < 6 && (
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(qIdx)}
                                  className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Добавить вариант</span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center space-x-2">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct_option_${qIdx}`}
                                      checked={q.correctOptionIndex === optIdx}
                                      onChange={() => updateQuestion(qIdx, { correctOptionIndex: optIdx })}
                                      className="w-4 h-4 text-emerald-500 focus:ring-blue-500"
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder={`Вариант ${optIdx + 1}`}
                                    value={opt}
                                    onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                    className={`flex-1 px-3 py-1.5 text-xs rounded-xl border ${
                                      q.correctOptionIndex === optIdx 
                                        ? 'border-emerald-500 bg-emerald-600/5 font-bold' 
                                        : 'border-slate-200 dark:border-slate-800'
                                    } bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white outline-none`}
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(qIdx, optIdx)}
                                      className="p-1.5 text-slate-400 hover:text-green-500 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">Отметьте точкой правильный вариант ответа.</p>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Drag and Drop Media for this question */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Медиа контент (Фото или Видео)</label>
                            <div 
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverIdx(qIdx);
                              }}
                              onDragLeave={() => setDragOverIdx(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverIdx(null);
                                const file = e.dataTransfer.files?.[0];
                                if (file) processQuestionFile(qIdx, file);
                              }}
                              onClick={() => {
                                const input = document.getElementById(`file-input-${qIdx}`);
                                if (input) input.click();
                              }}
                              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                                dragOverIdx === qIdx 
                                  ? 'border-emerald-500 bg-emerald-600/10' 
                                  : 'border-slate-200 dark:border-slate-850 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                              }`}
                            >
                              <input 
                                type="file" 
                                id={`file-input-${qIdx}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) processQuestionFile(qIdx, file);
                                }}
                                accept="image/*,video/*"
                                className="hidden" 
                              />
                              
                              {q.mediaType === 'none' || !q.mediaType ? (
                                <>
                                  <Upload className="w-8 h-8 text-slate-400 mb-1" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Выберите файл или перетащите его сюда</span>
                                  <span className="text-[9px] text-slate-400 mt-0.5">Фото или Видео без ссылок</span>
                                </>
                              ) : (
                                <div className="w-full relative" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    type="button"
                                    onClick={() => clearQuestionMedia(qIdx)}
                                    className="absolute top-1 right-1 p-1 bg-green-600 text-white rounded-full hover:bg-green-700 shadow-md transition-colors z-10"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  {q.mediaType === 'photo' ? (
                                    <img 
                                      src={q.mediaData} 
                                      alt="Question Media" 
                                      className="max-h-32 mx-auto rounded-xl object-contain border border-slate-200"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <video 
                                      src={q.mediaData} 
                                      controls 
                                      className="max-h-32 mx-auto rounded-xl object-contain border border-slate-200"
                                    />
                                  )}
                                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Файл привязан непосредственно к вопросу</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Пояснение к ответу</label>
                            <textarea
                              rows={2}
                              placeholder="Пояснение правильного ответа для студентов"
                              value={q.clarification}
                              onChange={(e) => updateQuestion(qIdx, { clarification: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3.5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-600/5 text-slate-500 hover:text-emerald-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить еще один вопрос (неограничено)</span>
              </button>
            </div>

            {/* Score configuration */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Начисление баллов за призовые места (для викторины целиком)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">1-е место (быстрее всех)</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={place1Points}
                      onChange={(e) => setPlace1Points(parseInt(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white text-center"
                    />
                    <Coins className="w-3.5 h-3.5 text-emerald-500 absolute right-3 top-3.5" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">2-е место</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={place2Points}
                      onChange={(e) => setPlace2Points(parseInt(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white text-center"
                    />
                    <Coins className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">3-е место</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={place3Points}
                      onChange={(e) => setPlace3Points(parseInt(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white text-center"
                    />
                    <Coins className="w-3.5 h-3.5 text-emerald-600 absolute right-3 top-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('all')}
                className="px-5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-blue-950 font-black text-xs hover:brightness-110 shadow-lg transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Запустить викторину</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Quizzes List Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                <span>Актуальные викторины</span>
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 rounded-full">
                {db.quizzes?.length || 0} всего
              </span>
            </div>

            {(!db.quizzes || db.quizzes.length === 0) ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-md">
                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-700 dark:text-slate-300">Викторин пока нет</h3>
                <p className="text-xs text-slate-400 mt-1">Ожидайте публикации первой викторины от куратора СНО!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {db.quizzes.map((quiz) => {
                  const hasAnswered = userAttemptsMap.has(quiz.id);
                  const attempt = userAttemptsMap.get(quiz.id);
                  const totalAttempts = getAttemptsForQuiz(quiz.id).length;
                  const questionsList = getQuizQuestionsList(quiz);

                  return (
                    <div 
                      key={quiz.id}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden"
                    >
                      {/* Left Media Thumbnail if available (takes media of first question or global fallback) */}
                      {questionsList[0]?.mediaType && questionsList[0]?.mediaType !== 'none' && questionsList[0]?.mediaData && (
                        <div className="w-full md:w-40 h-28 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-150 dark:border-slate-850">
                          {questionsList[0].mediaType === 'photo' ? (
                            <img 
                              src={questionsList[0].mediaData} 
                              alt="Thumbnail" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                              <Video className="w-8 h-8 text-emerald-400" />
                              <span className="text-[9px] font-bold mt-1 font-mono uppercase tracking-wider">Видео</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content Area */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {quiz.status === 'open' ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-green-500/10 text-green-600 rounded-md">
                                <Unlock className="w-3 h-3" />
                                <span>Доступна</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-green-500/10 text-green-600 rounded-md">
                                <Lock className="w-3 h-3" />
                                <span>Закрыта</span>
                              </span>
                            )}

                            {quiz.resultsPublished ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                                <Trophy className="w-3 h-3" />
                                <span>Итоги подведены</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-600/10 text-emerald-600 rounded-md">
                                <Clock className="w-3 h-3" />
                                <span>Ожидает результатов</span>
                              </span>
                            )}

                            {hasAnswered && (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                                <Check className="w-3 h-3 text-emerald-500 font-bold" />
                                <span>Уже пройдено {attempt?.correctCount !== undefined ? `(${attempt.correctCount}/${attempt.totalQuestions})` : ''}</span>
                              </span>
                            )}

                            <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-mono">
                              {questionsList.length} вопросов
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-black text-slate-850 dark:text-white leading-tight">
                            {quiz.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-2">
                            {questionsList[0]?.question || quiz.question}
                          </p>
                        </div>

                        {/* Action buttons footer */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1 font-mono">
                            <Users className="w-3.5 h-3.5" />
                            <span>Участников: {totalAttempts}</span>
                          </span>

                          <div className="flex items-center space-x-2">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleQuizStatus(quiz)}
                                  title={quiz.status === 'open' ? 'Закрыть доступ к викторине' : 'Открыть доступ к викторине'}
                                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300"
                                >
                                  {quiz.status === 'open' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManagingQuiz(quiz);
                                    setEditingPoints({
                                      1: quiz.pointsForPlaces.find(p => p.place === 1)?.points ?? 50,
                                      2: quiz.pointsForPlaces.find(p => p.place === 2)?.points ?? 30,
                                      3: quiz.pointsForPlaces.find(p => p.place === 3)?.points ?? 20
                                    });
                                  }}
                                  className="px-3.5 py-1.5 border border-blue-250 text-emerald-600 hover:bg-blue-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-blue-950/20 rounded-xl text-xs font-black flex items-center space-x-1.5"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Итоги и ответы</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuiz(quiz.id)}
                                  className="p-2 border border-green-200 text-green-500 hover:bg-red-50 dark:border-green-900/20 dark:hover:bg-red-950/20 rounded-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {!isAdmin && (
                              <>
                                {quiz.resultsPublished ? (
                                  <button
                                    onClick={() => handleOpenResultsModal(quiz)}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md"
                                  >
                                    <Trophy className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                                    <span>Итоги викторины</span>
                                  </button>
                                ) : hasAnswered ? (
                                  <span className="text-xs font-bold text-slate-500 italic bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850">
                                    Ожидайте публикации итогов
                                  </span>
                                ) : quiz.status === 'open' ? (
                                  <button
                                    onClick={() => handleTakeQuiz(quiz)}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center space-x-1.5 shadow-md"
                                  >
                                    <span>Пройти викторину</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-bold text-xs flex items-center space-x-1.5 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Доступ закрыт</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar - Info/Rules */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-600/10 via-amber-500/5 to-transparent rounded-3xl p-6 border border-emerald-500/20">
              <Trophy className="w-8 h-8 text-emerald-500 mb-3" />
              <h3 className="text-base font-black text-slate-800 dark:text-white">Правила участия</h3>
              <ul className="mt-3 space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-black mt-0.5">•</span>
                  <span>Викторина теперь содержит <strong>несколько вопросов</strong> с мультивыбором.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-black mt-0.5">•</span>
                  <span>Вы можете отправить ответ только <strong>один раз</strong> для каждой запущенной викторины.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-black mt-0.5">•</span>
                  <span>Места распределяются по <strong>количеству правильных ответов</strong>, а при равном количестве - по <strong>скорости прохождения</strong>.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-black mt-0.5">•</span>
                  <span>Победители получают официальные дипломы СНО БГЭУ ФЭМ в портфолио и весомую прибавку к рейтинговым баллам.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 font-black mt-0.5">•</span>
                  <span>По окончании викторины всем участникам открывается подробный разбор и правильный ответ к каждому вопросу.</span>
                </li>
              </ul>
            </div>

            {/* Winners Board */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md">
              <div className="flex items-center space-x-2 mb-4">
                <Award className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Последние призеры</h3>
              </div>
              
              {(() => {
                const recentWinners: { name: string; quizTitle: string; points: number; place: number; score?: string }[] = [];
                db.quizzes?.forEach(q => {
                  if (q.winners) {
                    q.winners.slice(0, 2).forEach(w => {
                      recentWinners.push({
                        name: w.name,
                        quizTitle: q.title,
                        points: w.points,
                        place: w.place,
                        score: w.score
                      });
                    });
                  }
                });

                if (recentWinners.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 text-center py-4">Итоги пока не подводились.</p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {recentWinners.slice(0, 5).map((w, i) => (
                      <div key={i} className="flex flex-col p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-800 dark:text-white truncate">{w.name}</p>
                          <div className="flex items-center space-x-1">
                            <span className={`text-[9px] font-black px-1 rounded ${
                              w.place === 1 ? 'bg-emerald-600/20 text-emerald-600' : 
                              w.place === 2 ? 'bg-slate-300/30 text-slate-600' : 'bg-amber-600/10 text-emerald-700'
                            }`}>
                              {w.place}м
                            </span>
                            <span className="text-xs font-bold text-emerald-500 font-mono">+{w.points}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{w.quizTitle}</p>
                        {w.score && (
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5 italic">{w.score}</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}

      {/* VIEWING / TAKING MULTI-QUESTION QUIZ MODAL */}
      {viewingQuiz && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-850 flex flex-col max-h-[90vh]">
            
            {/* Header / progress info */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-blue-950 text-white">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black uppercase tracking-wider font-mono">
                  Вопрос {currentTakeIdx + 1} из {quizQuestions.length}
                </span>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Вы действительно хотите прервать прохождение викторины? Ваши ответы будут сброшены.')) {
                    setViewingQuiz(null);
                  }
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
              <div 
                className="bg-emerald-600 h-full transition-all duration-300" 
                style={{ width: `${((currentTakeIdx + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h3 className="text-base font-bold text-slate-500 dark:text-slate-400 font-mono">{viewingQuiz.title}</h3>
                <h2 className="text-lg font-black text-slate-850 dark:text-white mt-1 leading-tight">
                  {quizQuestions[currentTakeIdx]?.question}
                </h2>
              </div>

              {/* Media for current question */}
              {quizQuestions[currentTakeIdx]?.mediaType && quizQuestions[currentTakeIdx].mediaType !== 'none' && quizQuestions[currentTakeIdx].mediaData && (
                <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-150 dark:border-slate-850 overflow-hidden flex justify-center items-center">
                  {quizQuestions[currentTakeIdx].mediaType === 'photo' ? (
                    <img 
                      src={quizQuestions[currentTakeIdx].mediaData} 
                      alt="Question Illustration" 
                      className="max-h-60 rounded-xl object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <video 
                      src={quizQuestions[currentTakeIdx].mediaData} 
                      controls 
                      className="max-h-60 rounded-xl object-contain w-full"
                    />
                  )}
                </div>
              )}

              {/* Answer options select list */}
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Выберите правильный вариант ответа:</label>
                {quizQuestions[currentTakeIdx]?.options.map((option, index) => {
                  const currentQId = quizQuestions[currentTakeIdx].id;
                  const isSelected = selectedAnswers[currentQId] === index;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(currentQId, index)}
                      className={`w-full p-4 rounded-2xl text-left border font-medium text-sm transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-600/5 text-slate-900 dark:text-white font-bold ring-2 ring-yellow-500/30' 
                          : 'border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{option}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-emerald-500 bg-emerald-600' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-blue-950 font-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer with nav buttons */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <button
                disabled={currentTakeIdx === 0}
                onClick={handlePrevQuestion}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  currentTakeIdx === 0 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <div className="flex items-center space-x-2">
                {currentTakeIdx < quizQuestions.length - 1 ? (
                  <button
                    disabled={selectedAnswers[quizQuestions[currentTakeIdx]?.id] === undefined}
                    onClick={handleNextQuestion}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      selectedAnswers[quizQuestions[currentTakeIdx]?.id] === undefined
                        ? 'bg-slate-150 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                    }`}
                  >
                    <span>Далее</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    disabled={selectedAnswers[quizQuestions[currentTakeIdx]?.id] === undefined || submittingQuizId !== null}
                    onClick={handleSubmitQuizAnswers}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-md ${
                      selectedAnswers[quizQuestions[currentTakeIdx]?.id] === undefined
                        ? 'bg-slate-150 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white font-black'
                    }`}
                  >
                    <span>Завершить и отправить</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* VIEWING DETAILED RESULTS MODAL */}
      {activeResultsQuiz && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-850 flex flex-col max-h-[92vh]">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-indigo-950 text-white">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black uppercase tracking-wider">Результаты викторины</span>
              </div>
              <button 
                onClick={() => setActiveResultsQuiz(null)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h3 className="text-lg font-black text-slate-850 dark:text-white leading-tight">{activeResultsQuiz.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">Викторина завершена куратором</p>
              </div>

              {/* Congratulate current student if they won a place */}
              {user && activeResultsQuiz.winners?.some(w => w.studentRecordBook === user.record_book_id) && (() => {
                const prize = activeResultsQuiz.winners.find(w => w.studentRecordBook === user.record_book_id);
                return (
                  <div className="bg-gradient-to-r from-emerald-600/20 via-amber-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/30 text-center flex flex-col items-center">
                    <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
                    <h4 className="text-base font-black text-slate-800 dark:text-white">Поздравляем с победой в СНО!</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                      Вы ответили верно на наибольшее количество вопросов быстрее остальных и заняли <strong>{prize?.place}-е место</strong> с начислением <strong>+{prize?.points} рейтинговых баллов</strong>!
                    </p>
                    <button
                      onClick={() => {
                        const cert = db.certificates?.find(
                          c => c.user_record_book === user.record_book_id && c.id.includes(`cert_quiz_${activeResultsQuiz.id}`)
                        );
                        if (cert) {
                          setViewingCert(cert);
                        } else {
                          const tempCert: Certificate = {
                            id: `cert_quiz_${activeResultsQuiz.id}_temp_${user.record_book_id}`,
                            user_record_book: user.record_book_id,
                            title: `Победитель викторины "${activeResultsQuiz.title}" (${prize?.place}-е место)`,
                            event_name: 'Викторины СНО ФЭМ',
                            issue_date: new Date().toISOString().split('T')[0],
                            type: prize?.place === 1 ? 'диплом_1_степени' : prize?.place === 2 ? 'диплом_2_степени' : prize?.place === 3 ? 'диплом_3_степени' : 'сертификат_участника',
                            custom_points: prize?.points
                          };
                          setViewingCert(tempCert);
                        }
                      }}
                      className="mt-4 w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-blue-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                    >
                      <Award className="w-4 h-4" />
                      <span>Смотреть электронный диплом</span>
                    </button>
                  </div>
                );
              })()}

              {/* Current student score if they participated but didn't make podium */}
              {(() => {
                const attempt = db.quizAttempts?.find(att => att.quizId === activeResultsQuiz.id && att.userRecordBook === user?.record_book_id);
                if (attempt) {
                  return (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex-1 flex justify-between items-center sm:items-start sm:flex-col">
                        <div>
                          <span className="font-bold text-slate-500 block">Ваш результат прохождения:</span>
                          <span className="font-mono text-slate-400">Дата: {new Date(attempt.answeredAt).toLocaleString()}</span>
                        </div>
                        <div className="sm:hidden text-right">
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                            {attempt.correctCount !== undefined ? `${attempt.correctCount}/${attempt.totalQuestions}` : (attempt.isCorrect ? '1/1' : '0/1')} верных
                          </span>
                          {attempt.timeSpentMs !== undefined && (
                            <span className="font-mono text-slate-500">Время: {(attempt.timeSpentMs / 1000).toFixed(1)} сек</span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:block text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                          {attempt.correctCount !== undefined ? `${attempt.correctCount}/${attempt.totalQuestions}` : (attempt.isCorrect ? '1/1' : '0/1')} верных
                        </span>
                        {attempt.timeSpentMs !== undefined && (
                          <span className="font-mono text-slate-500">Время: {(attempt.timeSpentMs / 1000).toFixed(1)} сек</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const cert = db.certificates?.find(
                            c => c.user_record_book === user.record_book_id && c.id.includes(`cert_quiz_${activeResultsQuiz.id}`)
                          );
                          if (cert) {
                            setViewingCert(cert);
                          } else {
                            const tempCert: Certificate = {
                              id: `cert_quiz_${activeResultsQuiz.id}_temp_${user.record_book_id}`,
                              user_record_book: user.record_book_id,
                              title: `Участник викторины "${activeResultsQuiz.title}"`,
                              event_name: 'Викторины СНО ФЭМ',
                              issue_date: new Date().toISOString().split('T')[0],
                              type: 'сертификат_участника',
                              custom_points: 0
                            };
                            setViewingCert(tempCert);
                          }
                        }}
                        className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Смотреть сертификат</span>
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Questions review with answers & clarifications */}
              <div className="space-y-4">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Разбор всех вопросов викторины</span>
                
                {resultsQuestions.map((rq, rqIdx) => {
                  const studentAttempt = db.quizAttempts?.find(att => att.quizId === activeResultsQuiz.id && att.userRecordBook === user?.record_book_id);
                  let studentSelectedIdx = -1;
                  if (studentAttempt) {
                    if (studentAttempt.answers) {
                      const ans = studentAttempt.answers.find(a => a.questionId === rq.id);
                      studentSelectedIdx = ans ? ans.selectedOptionIndex : -1;
                    } else {
                      // single question compatibility
                      studentSelectedIdx = studentAttempt.selectedOptionIndex ?? -1;
                    }
                  }

                  return (
                    <div key={rq.id} className="border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5.5 h-5.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-blue-950 dark:text-emerald-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                            {rqIdx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{rq.question}</h4>
                        </div>
                        {studentAttempt && (
                          studentSelectedIdx === rq.correctOptionIndex ? (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-green-500/10 text-green-600 rounded">Верно</span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-green-500/10 text-green-600 rounded">Неверно</span>
                          )
                        )}
                      </div>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                        {rq.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === rq.correctOptionIndex;
                          const isStudentSelected = optIdx === studentSelectedIdx;

                          let btnStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400";
                          if (isCorrect) {
                            btnStyle = "border-green-500 bg-green-500/10 text-green-800 dark:text-green-300 font-bold";
                          } else if (isStudentSelected) {
                            btnStyle = "border-green-500 bg-green-500/10 text-green-800 dark:text-green-300 font-medium";
                          }

                          return (
                            <div key={optIdx} className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between ${btnStyle}`}>
                              <span>{opt}</span>
                              <div className="flex items-center space-x-1">
                                {isCorrect && <Check className="w-3.5 h-3.5 text-green-600" />}
                                {isStudentSelected && !isCorrect && <X className="w-3.5 h-3.5 text-green-600" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Clarification for this question */}
                      {rq.clarification && (
                        <div className="pl-8 pt-2.5 border-t border-slate-150 dark:border-slate-800/60 mt-1">
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest">Разбор вопроса:</span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-medium italic">
                            {rq.clarification}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Scoreboard table */}
              <div className="space-y-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <span>Таблица победителей викторины</span>
                </span>
                
                {(!activeResultsQuiz.winners || activeResultsQuiz.winners.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Верных ответов не зафиксировано.</p>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800">
                          <th className="py-2.5 px-4 text-center">Место</th>
                          <th className="py-2.5 px-3">Студент</th>
                          <th className="py-2.5 px-3 text-center">Группа</th>
                          <th className="py-2.5 px-3 text-center">Результат</th>
                          <th className="py-2.5 px-4 text-right">Начислено баллов</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {activeResultsQuiz.winners.map((winner) => (
                          <tr 
                            key={winner.studentRecordBook} 
                            className={`text-xs ${user && winner.studentRecordBook === user.record_book_id ? 'bg-emerald-600/5 font-bold' : ''}`}
                          >
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                                winner.place === 1 ? 'bg-emerald-600 text-white' :
                                winner.place === 2 ? 'bg-slate-300 text-slate-800' :
                                winner.place === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {winner.place}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                              <div className="flex items-center space-x-2">
                                <UserAvatar size="xs" user={db.users.find(u => u.record_book_id === winner.studentRecordBook) || { first_name: winner.name.split(' ')[1] || '', last_name: winner.name.split(' ')[0] || '' }} />
                                <span>{winner.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">{winner.group}</td>
                            <td className="py-3 px-3 text-center text-slate-500 font-mono text-[10px] italic">{winner.score || '1/1'}</td>
                            <td className="py-3 px-4 text-right font-black font-mono text-emerald-500">+{winner.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveResultsQuiz(null)}
                className="px-5 py-2 rounded-xl bg-emerald-900 hover:bg-blue-950 text-white font-bold text-xs"
              >
                Закрыть результаты
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADMINS MANAGEMENT & EDITING MODAL */}
      {managingQuiz && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-850 flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-950 text-white">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black uppercase tracking-wider">Администрирование викторины</span>
              </div>
              <button 
                onClick={() => setManagingQuiz(null)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h3 className="text-base font-black text-slate-850 dark:text-white">{managingQuiz.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Здесь вы можете посмотреть все ответы студентов, перераспределить призовые места и опубликовать итоги.</p>
              </div>

              {/* Submissions Table / Results list */}
              <div>
                <span className="text-xs font-black text-slate-400 block uppercase tracking-wider mb-2">Таблица присланных ответов студентов</span>
                
                {(() => {
                  const attempts = getAttemptsForQuiz(managingQuiz.id);
                  if (attempts.length === 0) {
                    return (
                      <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 text-center border border-slate-150">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Ответов пока никто не прислал.</p>
                      </div>
                    );
                  }

                  const questionsList = getQuizQuestionsList(managingQuiz);

                  return (
                    <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150 dark:border-slate-850">
                            <th className="py-2 px-3 text-center">№</th>
                            <th className="py-2 px-3">Студент</th>
                            <th className="py-2 px-3 text-center">Группа</th>
                            <th className="py-2 px-3 text-center">Баллы (Верно)</th>
                            <th className="py-2 px-3 text-right">Время решения</th>
                            <th className="py-2 px-3 text-right">Дата</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-[11px]">
                          {attempts
                            .sort((a, b) => {
                              const aCorrect = a.correctCount !== undefined ? a.correctCount : (a.isCorrect ? 1 : 0);
                              const bCorrect = b.correctCount !== undefined ? b.correctCount : (b.isCorrect ? 1 : 0);
                              if (aCorrect !== bCorrect) {
                                return bCorrect - aCorrect;
                              }
                              const aTime = a.timeSpentMs !== undefined ? a.timeSpentMs : new Date(a.answeredAt).getTime();
                              const bTime = b.timeSpentMs !== undefined ? b.timeSpentMs : new Date(b.answeredAt).getTime();
                              return aTime - bTime;
                            })
                            .map((att, index) => {
                              const correct = att.correctCount !== undefined ? att.correctCount : (att.isCorrect ? 1 : 0);
                              const total = att.totalQuestions || questionsList.length;

                              return (
                                <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="py-2 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                                  <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{att.userName}</td>
                                  <td className="py-2 px-3 text-center text-slate-500 font-mono">{att.userGroup}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      correct === total 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' 
                                        : correct > 0 
                                          ? 'bg-yellow-100 text-emerald-800 dark:bg-blue-950 dark:text-emerald-300'
                                          : 'bg-green-100 text-green-800 dark:bg-red-950 dark:text-green-300'
                                    }`}>
                                      {correct}/{total}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-mono font-bold">
                                    {att.timeSpentMs !== undefined ? `${(att.timeSpentMs / 1000).toFixed(1)} сек` : 'н/д'}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-400 font-mono text-[10px]">
                                    {new Date(att.answeredAt).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Points distribution allocation */}
              {!managingQuiz.resultsPublished && (
                <div className="bg-emerald-600/5 rounded-2xl border border-emerald-500/25 p-5 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">Публикация результатов и начисление баллов</span>
                  </div>
                  
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    При публикации результатов все студенты будут автоматически ранжироваться по <strong>количеству верных ответов</strong> и <strong>скорости ответа (времени решения)</strong>.
                    Первые три студента, имеющие верные ответы, займут соответственно 1-е, 2-е и 3-е места и получат баллы.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Баллы за 1-е место</span>
                      <input
                        type="number"
                        min={0}
                        value={editingPoints[1]}
                        onChange={(e) => setEditingPoints({ ...editingPoints, 1: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Баллы за 2-е место</span>
                      <input
                        type="number"
                        min={0}
                        value={editingPoints[2]}
                        onChange={(e) => setEditingPoints({ ...editingPoints, 2: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Баллы за 3-е место</span>
                      <input
                        type="number"
                        min={0}
                        value={editingPoints[3]}
                        onChange={(e) => setEditingPoints({ ...editingPoints, 3: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-emerald-500/10">
                    <button
                      type="button"
                      onClick={() => handlePublishResults(managingQuiz)}
                      className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs shadow-md transition-all flex items-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Подвести итоги и опубликовать</span>
                    </button>
                  </div>
                </div>
              )}

              {managingQuiz.resultsPublished && (
                <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/25 p-5">
                  <div className="flex items-center space-x-2 text-emerald-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider">Результаты викторины опубликованы</span>
                  </div>
                  <p className="text-xs text-slate-500">Результаты и разборы правильных ответов уже видны всем студентам. Начисление рейтинговых баллов и выдача дипломов победителям в портфолио выполнены успешно.</p>
                </div>
              )}

            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setManagingQuiz(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                Закрыть панель
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          recipientUser={user}
          onClose={() => setViewingCert(null)}
        />
      )}

    </div>
  );
};
