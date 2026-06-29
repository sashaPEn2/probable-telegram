import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left hover:text-brand-blue dark:hover:text-blue-400 transition-colors group"
      >
        <span className="text-sm font-bold sm:text-base">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-brand-gold flex-shrink-0 ml-4" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-brand-gold flex-shrink-0 ml-4 transition-colors" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQ: React.FC = () => {
  const faqData = [
    {
      question: "Как зарегистрировать публикацию?",
      answer: "Перейдите в личный кабинет (вкладка 'Профиль'), выберите подраздел 'Публикации' и нажмите кнопку 'Добавить публикацию'. После внесения данных и загрузки файла (тезисов/статьи), запись появится в вашем портфолио со статусом 'На проверке'."
    },
    {
      question: "Как начисляются баллы рейтинга?",
      answer: "Баллы на портале СНО ФЭМ начисляются автоматически за верифицированные публикации (ВАК — 50 баллов, РИНЦ — 30, прочие — 10), участие в конференциях БГЭУ и победы в конкурсах СНИЛ. Также баллы могут быть начислены деканатом за активную организационную работу."
    },
    {
      question: "Как обменять баллы на сувениры?",
      answer: "В разделе 'Маркет' выберите интересующий вас товар (ручка, брелок и т.д.) и нажмите 'Обменять'. После подтверждения списания баллов, вы получите код заказа. С этим кодом необходимо подойти в деканат ФЭМ к заместителю декана по научной работе для получения продукции."
    },
    {
      question: "Что такое h-индекс на портале?",
      answer: "На нашем портале h-индекс рассчитывается на основе ваших загруженных и верифицированных публикаций. Это показатель вашей продуктивности: если у вас есть h работ, каждая из которых имеет не менее h верификаций/цитирований в рамках внутренней системы БГЭУ."
    },
    {
      question: "Как создать AI-аватар?",
      answer: "При регистрации вы можете нажать 'Сгенерировать AI-аватар', чтобы создать уникальное изображение на основе ваших интересов. Если вы уже зарегистрированы, перейдите в 'Профиль' и нажмите на иконку карандаша рядом с аватаром для повторной генерации."
    },
    {
      question: "Куда обращаться при технических проблемах?",
      answer: "Если вы столкнулись с ошибкой в работе портала, напишите в нашу техподдержку (кнопка в футере) или свяжитесь с куратором СНО ФЭМ через Telegram @snofem."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" id="faq-section">
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold uppercase tracking-widest border border-brand-gold/20">
          <HelpCircle className="w-4 h-4" />
          <span>Служба поддержки СНО</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-brand-blue dark:text-blue-100">Часто задаваемые вопросы</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Мы собрали ответы на самые популярные вопросы о работе цифрового портала ФЭМ БГЭУ.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
        {faqData.map((item, index) => (
          <FAQItem key={index} question={item.question} answer={item.answer} />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-brand-blue dark:bg-blue-950 rounded-2xl p-6 text-white shadow-md flex items-start space-x-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <MessageCircle className="w-6 h-6 text-brand-gold" />
          </div>
          <div>
            <h4 className="font-bold mb-1">Остались вопросы?</h4>
            <p className="text-xs text-blue-200 mb-4 leading-relaxed">Напишите нам в Telegram для оперативного решения любых проблем с доступом или данными.</p>
            <a 
              href="https://t.me/snofem" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center space-x-2 text-brand-gold text-xs font-bold hover:underline"
            >
              <span>Связаться с куратором</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="bg-brand-gold rounded-2xl p-6 text-brand-blue shadow-md flex items-start space-x-4">
          <div className="p-3 bg-brand-blue/10 rounded-xl">
            <HelpCircle className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h4 className="font-bold mb-1">Руководство пользователя</h4>
            <p className="text-xs text-brand-blue/80 mb-4 leading-relaxed">Подробная инструкция по работе с портфолио, СНИЛ и конференциями в формате PDF.</p>
            <button className="inline-flex items-center space-x-2 text-brand-blue text-xs font-bold hover:underline">
              <span>Скачать мануал (.pdf)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
