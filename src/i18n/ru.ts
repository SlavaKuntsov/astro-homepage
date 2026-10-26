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
	nav: {
		home: 'Главная',
		experience: 'Опыт',
		works: 'Работы',
		arts: 'Арты',
		source: 'Исходники',
	},
	footer: {
		builtWithAstro: 'Сделано на Astro',
	},
	index: {
		heading: {
			greeting: `Привет, я <i class="font-[550]">junior backend developer</i> из Беларуси.`,
			name: 'Кунцов Святослав',
			position: 'Разработчик программного обеспечения',
		},
		main: {
			h_about: 'Обо Мне',
			about:
				'Более года опыта в разработке программного обеспечения на платформе .NET, включая создание веб-приложений, десктоп-приложений и взаимодействие с базами данных. Имею навыки в анализе требований, проектировании веб-систем, объектно-ориентированном подходе и проектировании баз данных. Работал в команде. Мотивирован изучать бизнес-задачи и эффективно преобразовывать их в программные решения, разрабатывая приложения, которые соответствуют критериям по времени, масштабируемости и производительности.',
		},
	},
	works: {
		heading: 'Мои работы',
	},
	arts: {
		heading: 'Картиночки',
	},
	experience: {
		heading: 'Опыт работы',
		present: 'настоящее время',
		highlightsHeading: 'Ключевые достижения',
		viewAll: 'Весь опыт',
		environment: 'Окружение',
		industries: 'Отрасли',
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
