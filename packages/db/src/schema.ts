import { pgTable, uuid, text, integer, smallint, timestamp, boolean, jsonb, date, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  password_hash: text('password_hash'),
  // OAuth
  oauth_provider: text('oauth_provider'),   // 'google' | 'github' | null
  oauth_id: text('oauth_id'),               // provider's user ID
  // Email verification
  email_verified: boolean('email_verified').default(false),
  verify_token: text('verify_token'),
  verify_token_expires: timestamp('verify_token_expires', { withTimezone: true }),
  // Password reset
  reset_token: text('reset_token'),
  reset_token_expires: timestamp('reset_token_expires', { withTimezone: true }),
  // Meta
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  streak_days: integer('streak_days').default(0),
  xp_total: integer('xp_total').default(0),
});

export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  raw_text: text('raw_text'),
  parsed_json: jsonb('parsed_json'),
  embedding_id: text('embedding_id'),
  uploaded_at: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  is_active: boolean('is_active').default(true),
});

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique().notNull(),
  category: text('category'),
  aliases: text('aliases').array(),
});

export const userSkills = pgTable('user_skills', {
  user_id: uuid('user_id').references(() => users.id),
  skill_id: uuid('skill_id').references(() => skills.id),
  level: smallint('level'), // 0 to 100
  source: text('source'), // 'resume', 'self-reported', 'interview'
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.user_id, t.skill_id] }),
}));

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  company: text('company'),
  location: text('location'),
  salary_min: integer('salary_min'),
  salary_max: integer('salary_max'),
  experience_yrs: smallint('experience_yrs'),
  required_skills: jsonb('required_skills'), // [{skill_id, importance}]
  raw_description: text('raw_description'),
  embedding_id: text('embedding_id'),
  source_url: text('source_url'),
  scraped_at: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
});

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id),
  job_id: uuid('job_id').references(() => jobs.id),
  status: text('status').default('interested'), // 'applied', 'interview', 'offer', 'rejected'
  notes: text('notes'),
  applied_at: timestamp('applied_at'),
});

export const roadmapItems = pgTable('roadmap_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id),
  skill_id: uuid('skill_id').references(() => skills.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: smallint('priority'),
  status: text('status').default('pending'), // 'pending', 'active', 'done'
  est_weeks: smallint('est_weeks'),
  resources: jsonb('resources'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const interviews = pgTable('interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id),
  type: text('type'), // 'behavioral', 'technical'
  questions: jsonb('questions'),
  answers: jsonb('answers'),
  scores: jsonb('scores'),
  overall_pct: smallint('overall_pct'),
  conducted_at: timestamp('conducted_at', { withTimezone: true }).defaultNow(),
});

