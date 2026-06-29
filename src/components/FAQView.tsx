import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, ChevronUp, Book, UserCheck, Award, MessageCircle, FileText, Sparkles } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Регистрация и Вход',
    question: 'Как войти в систему SNO.PORTAL?',
    answer: 'Для входа используйте номер вашей зачётки. При первой регистрации система попросит вас заполнить данные профиля (ФИО, курс, группа, кафедра). Эти данные будут использоваться для автоматического формирования ваших заявок и портфолио.',
    icon: <UserCheck className="w-5 h-5" />
  },
  {
    category: 'Публикации и Портфолио',
    question: 'Как добавить статью или тезисы в моё портфолио?',
    answer: 'Перейдите в "Личный кабинет" -> "Труды и публикации" и нажмите кнопку "Добавить публикацию". Заполните данные о названии, авторах и прикрепите ссылку на электронный ресурс (например, репозиторий БГЭУ). После проверки модератором публикация появится в общем рейтинге.',
    icon: <Book className="w-5 h-5" />
  },
  {
    category: 'Мероприятия',
    question: 'Как подать заявку на участие в конференции?',
    answer: 'Откройте раздел "События", выберите интересующую вас конференцию и нажмите "Регистрация докладов". Вы сможете указать тему доклада, прикрепить тезисы и отправить заявку. Статус рассмотрения можно отслеживать в личном кабинете.',
    icon: <Sparkles className="w-5 h-5" />
  },
  {
    category: 'Рейтинг',
    question: 'За что начисляются баллы в рейтинге?',
    answer: 'Баллы начисляются за подтвержденные публикации (статьи, тезисы), участие в конференциях факультетского и республиканского уровней, победы в конкурсах НИРС и активную работу в составе СНИЛ. Веса достижений определяются регламентом СНО ФЭМ.',
    icon: <Award className="w-5 h-5" />
  },
  {
    category: 'СНИЛ',
    question: 'Как вступить в Студенческую научно-исследовательскую лабораторию (СНИЛ)?',
    answer: 'В разделе "Лаборатории (СНИЛ)" вы можете ознакомиться со списком активных лабораторий кафедр ФЭМ. Выберите подходящую по научным интересам и нажмите "Подать заявку". Руководитель СНИЛ рассмотрит вашу кандидатуру и свяжется с вами.',
    icon: <FileText className="w-5 h-5" />
  },
  {
    category: 'Техподдержка',
    question: 'Что делать, если я нашел ошибку или данные в профиле неверны?',
    answer: 'Если вы обнаружили техническую проблему или неточность в своих данных, которую нельзя исправить самостоятельно, воспользуйтесь кнопкой "Техподдержка" в подвале сайта для связи с администраторами через Telegram.',
    icon: <MessageCircle className="w-5 h-5" />
  }
];

export const FAQView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
          <HelpCircle className="w-8 h-8 text-[#0a2a5e] dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-black text-[#0a2a5e] dark:text-blue-200 mb-2">База знаний SNO.PORTAL</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Ответы на самые частые вопросы о научной деятельности на факультете и работе с цифровым портфолио.
        </p>
      </div>

      <div className="space-y-4">
        {FAQ_DATA.map((item, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all hover:shadow-md"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between p-6 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-xl transition-colors ${openIndex === index ? 'bg-[#0a2a5e] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {item.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] block mb-1">
                    {item.category}
                  </span>
                  <h3 className="font-bold text-[#0a2a5e] dark:text-blue-200 text-sm sm:text-base">
                    {item.question}
                  </h3>
                </div>
              </div>
              <div className="ml-4 text-slate-400">
                {openIndex === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="px-6 pb-6 pt-0 ml-14">
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-4" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-[#0a2a5e] to-blue-900 text-white text-center shadow-xl">
        <h3 className="text-xl font-bold mb-2">Не нашли ответ на свой вопрос?</h3>
        <p className="text-blue-200 text-sm mb-6 max-w-md mx-auto">
          Наша команда модераторов СНО ФЭМ всегда готова помочь вам разобраться в тонкостях научной работы.
        </p>
        <a 
          href="https://t.me/snofembseu" 
          target="_blank" 
          rel="noreferrer"
          className="inline-flex items-center space-x-2 px-8 py-4 bg-[#d4af37] text-[#0a2a5e] font-black rounded-2xl shadow-lg hover:brightness-110 transition-all active:scale-95"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Связаться с техподдержкой</span>
        </a>
      </div>
    </div>
  );
};
