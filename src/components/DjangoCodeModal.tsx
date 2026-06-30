import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Terminal, Database, Shield, BookOpen, Download } from 'lucide-react';

interface DjangoCodeModalProps {
  onClose: () => void;
}

export const DjangoCodeModal: React.FC<DjangoCodeModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'views' | 'urls' | 'admin' | 'settings' | 'reqs' | 'readme'>('models');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippets: Record<string, { title: string; lang: string; content: string }> = {
    models: {
      title: 'research/models.py (Модели данных)',
      lang: 'python',
      content: `from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Студент-исследователь'),
        ('activist', 'Активист СНО ФЭМ'),
        ('snil_head', 'Руководитель СНИЛ'),
        ('coordinator', 'Координатор науки факультета'),
        ('admin', 'Администратор'),
    ]
    record_book_id = models.CharField("Номер зачётки", max_length=20, unique=True)
    middle_name = models.CharField("Отчество", max_length=50, blank=True)
    role = models.CharField("Роль", max_length=20, choices=ROLE_CHOICES, default='student')
    group = models.CharField("Группа", max_length=20)
    course = models.PositiveSmallIntegerField("Курс", default=2)
    department = models.CharField("Кафедра", max_length=150)
    scientific_interests = models.TextField("Научные интересы", blank=True)
    telegram_username = models.CharField("Telegram username", max_length=100, blank=True)

    USERNAME_FIELD = 'record_book_id'
    REQUIRED_FIELDS = ['last_name', 'first_name']

class ResearcherPortfolio(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='portfolio')
    h_index = models.PositiveSmallIntegerField("Индекс Хирша", default=0)
    total_publications = models.PositiveIntegerField("Всего публикаций", default=0)
    total_reports = models.PositiveIntegerField("Всего докладов", default=0)
    rating_points = models.PositiveIntegerField("Рейтинговые баллы", default=0)

class SNIL(models.Model):
    name = models.CharField("Название лаборатории", max_length=200)
    head = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='headed_snils')
    department = models.CharField("Кафедра", max_length=150)
    description = models.TextField("Описание и направления исследований")
    members = models.ManyToManyField(CustomUser, related_name='snils', blank=True)
    is_active = models.BooleanField("Активна", default=True)
    achievements = models.JSONField("Достижения", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ScientificEvent(models.Model):
    TYPE_CHOICES = [
        ('конференция', 'Конференция'),
        ('семинар', 'Семинар'),
        ('мастер-класс', 'Мастер-класс'),
        ('научный_слэм', 'Научный слэм'),
        ('круглый_стол', 'Круглый стол'),
        ('научная_гостиная', 'Научная гостиная'),
        ('форум', 'Форум'),
        ('олимпиада', 'Олимпиада'),
    ]
    title = models.CharField("Название", max_length=250)
    type = models.CharField("Тип мероприятия", max_length=30, choices=TYPE_CHOICES)
    description = models.TextField("Описание")
    organizer = models.CharField("Организатор", max_length=150)
    start_date = models.DateField("Дата начала")
    end_date = models.DateField("Дата окончания")
    registration_deadline = models.DateField("Срок регистрации")
    location = models.CharField("Место проведения", max_length=200)
    is_active = models.BooleanField("Регистрация открыта", default=True)
    max_participants = models.PositiveIntegerField("Макс. участников", default=100)
    participants = models.ManyToManyField(CustomUser, related_name='registered_events', blank=True)

class ResearchApplication(models.Model):
    STATUS_CHOICES = [
        ('черновик', 'Черновик'),
        ('подана', 'Подана'),
        ('на_рассмотрении', 'На рассмотрении'),
        ('принята', 'Принята'),
        ('отклонена', 'Отклонена'),
    ]
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='applications')
    event = models.ForeignKey(ScientificEvent, on_delete=models.CASCADE, related_name='event_applications')
    topic = models.CharField("Тема доклада", max_length=300)
    abstract = models.TextField("Тезисы")
    file = models.FileField(upload_to='applications/%Y/%m/', null=True, blank=True)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default='подана')
    review_comment = models.TextField("Комментарий координатора", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Publication(models.Model):
    authors = models.ManyToManyField(CustomUser, related_name='publications')
    title = models.CharField("Название работы", max_length=300)
    type = models.CharField("Тип", max_length=50, default='статья')
    journal = models.CharField("Издание/сборник", max_length=200)
    year = models.PositiveSmallIntegerField("Год")
    doi = models.CharField("DOI", max_length=100, blank=True)
    link = models.URLField("Ссылка", blank=True)
    file = models.FileField(upload_to='publications/%Y/', null=True, blank=True)
    is_confirmed = models.BooleanField("Подтверждена координатором", default=False)
`
    },
    views: {
      title: 'research/views.py (Class-Based Views)',
      lang: 'python',
      content: `from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from .models import ScientificEvent, SNIL, ResearchApplication, Publication

class EventListView(ListView):
    model = ScientificEvent
    template_name = 'research/event_list.html'
    context_object_name = 'events'
    paginate_by = 12

    def get_queryset(self):
        return ScientificEvent.objects.filter(is_active=True).order_by('start_date')

class SNILListView(ListView):
    model = SNIL
    template_name = 'research/snil_list.html'
    context_object_name = 'snils'

class ApplicationCreateView(LoginRequiredMixin, CreateView):
    model = ResearchApplication
    fields = ['event', 'topic', 'abstract', 'file']
    template_name = 'research/application_form.html'
    success_url = '/portfolio/'

    def form_valid(self, form):
        form.instance.student = self.request.user
        return super().form_valid(form)

class PortfolioDetailView(LoginRequiredMixin, DetailView):
    template_name = 'research/portfolio.html'
    
    def get_object(self):
        return self.request.user.portfolio
`
    },
    urls: {
      title: 'portal/urls.py & research/urls.py',
      lang: 'python',
      content: `from django.urls import path, include
from .views import EventListView, SNILListView, ApplicationCreateView, PortfolioDetailView

urlpatterns = [
    path('', EventListView.as_view(), name='home'),
    path('snils/', SNILListView.as_view(), name='snil_list'),
    path('apply/', ApplicationCreateView.as_view(), name='apply'),
    path('portfolio/', PortfolioDetailView.as_view(), name='portfolio'),
]
`
    },
    settings: {
      title: 'portal/settings.py (PostgreSQL & Apps)',
      lang: 'python',
      content: `INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Модули ФЭМ БГЭУ
    'users',
    'research',
    'snil',
    'events',
    'portfolio',
    'gallery',
    'rating',
]

AUTH_USER_MODEL = 'research.CustomUser'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fem_bseu_science_db',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

AUTHENTICATION_BACKENDS = [
    'users.auth_backends.RecordBookAuthBackend',
    'django.contrib.auth.backends.ModelBackend',
]
`
    },
    reqs: {
      title: 'requirements.txt',
      lang: 'text',
      content: `Django>=4.2.0,<5.0.0
psycopg2-binary>=2.9.9
pillow>=10.2.0
python-dotenv>=1.0.0
requests>=2.31.0
`
    },
    readme: {
      title: 'README.md (Инструкция по запуску)',
      lang: 'markdown',
      content: `# Цифровой портал исследователя ФЭМ БГЭУ (Django 4.x + PostgreSQL)

## Шаги развёртывания (без тестовых данных):
1. Создайте виртуальное окружение: \`python3 -m venv venv && source venv/bin/activate\`
2. Установите зависимости: \`pip install -r requirements.txt\`
3. Настройте БД PostgreSQL и укажите параметры в \`.env\`
4. Примените автоматические миграции: \`python manage.py makemigrations && python manage.py migrate\`
5. Создайте суперпользователя: \`python manage.py createsuperuser\`
6. Запустите сервер: \`python manage.py runserver 0.0.0.0:8000\`
`
    }
  };

  const currentSnippet = codeSnippets[activeTab];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Шапка окна */}
        <div className="bg-[#052e16] px-6 py-4 border-b border-emerald-400/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#10b981]/20 border border-[#10b981]">
              <FileCode className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Архитектура Django 4.x бекенда ФЭМ БГЭУ</h3>
              <p className="text-emerald-200 text-xs">Полный исходный код проекта с поддержкой PostgreSQL 14+</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Навигационные вкладки файлов */}
        <div className="bg-slate-950 px-6 py-2 border-b border-slate-800 flex overflow-x-auto space-x-2 no-scrollbar text-xs">
          <button onClick={() => setActiveTab('models')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'models' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Database className="w-3.5 h-3.5" /> <span>models.py</span>
          </button>
          <button onClick={() => setActiveTab('views')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'views' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FileCode className="w-3.5 h-3.5" /> <span>views.py (CBV)</span>
          </button>
          <button onClick={() => setActiveTab('urls')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'urls' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Terminal className="w-3.5 h-3.5" /> <span>urls.py</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'settings' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Shield className="w-3.5 h-3.5" /> <span>settings.py</span>
          </button>
          <button onClick={() => setActiveTab('reqs')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'reqs' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BookOpen className="w-3.5 h-3.5" /> <span>requirements.txt</span>
          </button>
          <button onClick={() => setActiveTab('readme')} className={`px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5 transition-colors ${activeTab === 'readme' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Download className="w-3.5 h-3.5" /> <span>README.md</span>
          </button>
        </div>

        {/* Блок кода */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0d1117] font-mono text-sm leading-relaxed text-slate-200 relative">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs text-slate-400">
            <span>Файл: <strong className="text-emerald-400">{currentSnippet.title}</strong></span>
            <button
              onClick={() => handleCopy(currentSnippet.content)}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Скопировано!' : 'Копировать код'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre no-scrollbar">
            <code>{currentSnippet.content}</code>
          </pre>
        </div>

        {/* Подвал */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Стек: Python 3.10+ / Django 4.x / PostgreSQL 14+ / Bootstrap 5 / ORM</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-emerald-700 text-white hover:bg-emerald-600 font-sans font-semibold">
            Закрыть окно
          </button>
        </div>

      </div>
    </div>
  );
};
