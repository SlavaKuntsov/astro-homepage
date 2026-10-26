/**
 * The owner's skills, grouped for display. Locale-independent: the technology
 * names read the same in both Locales, while each group's label is localized
 * through `t.skills.groups`, keyed by `SkillGroupId`. The Skills section
 * (ticket #8) and the CV page render this one list, so the two can never drift.
 */

/** The stable id of a skill group; keys its localized label. */
export type SkillGroupId =
	| 'languages'
	| 'backend'
	| 'databases'
	| 'architecture'
	| 'frontend'
	| 'devops'
	| 'testing';

export interface SkillGroup {
	id: SkillGroupId;
	skills: readonly string[];
}

export const SKILL_GROUPS: readonly SkillGroup[] = [
	{
		id: 'languages',
		skills: ['C#', 'TypeScript', 'JavaScript'],
	},
	{
		id: 'backend',
		skills: [
			'ASP.NET Core',
			'.NET Framework',
			'Entity Framework',
			'NHibernate',
			'Dapper',
			'LINQ',
			'Hangfire',
			'SignalR',
		],
	},
	{
		id: 'databases',
		skills: ['PostgreSQL', 'MS SQL Server', 'MariaDB', 'MongoDB', 'Redis'],
	},
	{
		id: 'architecture',
		skills: ['Microservices', 'Clean Architecture', 'CQRS', 'RabbitMQ'],
	},
	{
		id: 'frontend',
		skills: ['React.js', 'Angular', 'Node.js', 'WPF', 'Flutter'],
	},
	{
		id: 'devops',
		skills: ['Docker', 'Git', 'Nginx', 'ELK Stack'],
	},
	{
		id: 'testing',
		skills: ['xUnit', 'NUnit', 'Moq'],
	},
];
