import type { Translation } from '../types/Translation';

const ru: Translation = {
	a11y: {
		skipToContent: 'Перейти к содержимому',
		primaryNavigation: 'Основная навигация',
		mobileNavigation: 'Мобильная навигация',
		openMenu: 'Открыть меню',
		closeMenu: 'Закрыть меню',
		switchTheme: 'Переключить тему',
		switchToDarkTheme: 'Включить тёмную тему',
		switchToLightTheme: 'Включить светлую тему',
		switchLocale: 'Переключить на английский',
	},
	site: {
		ownerName: 'Кунцов Святослав',
	},
	meta: {
		siteName: 'Кунцов Святослав',
		home: {
			title: 'Кунцов Святослав — Разработчик ПО',
			description:
				'Персональный сайт и резюме Кунцова Святослава: опыт разработки программного обеспечения, избранные проекты и контакты.',
		},
		experience: {
			title: 'Опыт работы — Кунцов Святослав',
			description:
				'Профессиональный опыт Кунцова Святослава: компании, роли, технологии и ключевые достижения.',
		},
		projects: {
			title: 'Проекты — Кунцов Святослав',
			description:
				'Избранные проекты Кунцова Святослава: описание, стек технологий и ссылки на исходный код.',
		},
		arts: {
			title: 'Арты — Кунцов Святослав',
			description: 'Галерея художественных работ Кунцова Святослава.',
		},
	},
	nav: {
		home: 'Главная',
		experience: 'Опыт',
		projects: 'Проекты',
		arts: 'Арты',
		source: 'Исходники',
	},
	footer: {
		builtWithAstro: 'Сделано на Astro',
	},
	index: {
		heading: {
			greeting: `Привет, я <i class="font-[550]">middle backend developer</i> из Беларуси.`,
			name: 'Кунцов Святослав',
			position: 'Разработчик программного обеспечения',
		},
		main: {
			h_about: 'Обо Мне',
			about:
				'Более трёх лет в коммерческой разработке программного обеспечения, включая проектирование веб-систем, создание микросервисной архитектуры и взаимодействие с разными базами данных. Имею навыки в анализе требований, объектно-ориентированном подходе, проектировании баз данных и глубокой оптимизации производительности бэкенда. Работал в команде, есть опыт поддержки фронтенд-компонентов и интеграции систем. Мотивирован изучать сложные бизнес-задачи и эффективно преобразовывать их в масштабируемые программные решения, быстро адаптируясь к новым технологическим стекам и предметным областям.',
			languages: 'Языки: русский — родной, английский — B1.',
		},
	},
	projects: {
		heading: 'Проекты',
		viewProject: 'Смотреть проект',
		back: 'Все проекты',
		tags: 'Теги',
		gallery: 'Галерея',
		live: 'Демо',
		source: 'Исходники',
		other: 'Ссылка',
		stars: 'Звёзды',
		languages: 'Языки',
	},
	arts: {
		heading: 'Картиночки',
		gallery: 'Галерея',
		tags: 'Теги',
		link: 'Ссылка',
		closeLightbox: 'Закрыть',
		previous: 'Предыдущая работа',
		next: 'Следующая работа',
	},
	experience: {
		heading: 'Опыт работы',
		present: 'настоящее время',
		highlightsHeading: 'Ключевые достижения',
		viewAll: 'Весь опыт',
		more: 'и т.д.',
		environment: 'Окружение',
		industries: 'Отрасли',
	},
	education: {
		heading: 'Образование',
	},
	skills: {
		heading: 'Навыки',
		groups: {
			languages: 'Языки',
			backend: 'Бэкенд',
			databases: 'Базы данных',
			architecture: 'Архитектура',
			frontend: 'Фронтенд',
			devops: 'DevOps',
			testing: 'Тестирование',
		},
	},
	contacts: {
		heading: 'Контакты',
		downloadCv: 'Скачать CV',
		labels: {
			email: 'Почта',
			github: 'GitHub',
			telegram: 'Telegram',
			instagram: 'Instagram',
		},
	},
};

export default ru;
