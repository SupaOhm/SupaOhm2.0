import type { MoreProject, ProjectRow } from './types';

export const projectRows: ProjectRow[] = [
  {
    name: 'FastForm',
    line: 'Submits a Google Form with one direct HTTP request instead of a full browser.',
    tech: 'Python standard library, GitHub Actions',
    href: 'https://github.com/SupaOhm/fastform',
  },
  {
    name: 'Full-Stack Expense Tracker',
    line: 'Expense management with REST APIs and running totals.',
    tech: 'MongoDB, Express, React, Node.js',
    href: 'https://github.com/SupaOhm/Expense-Tracker',
  },
  {
    name: 'Lost and Found Management System',
    line: 'Report and manage lost items, with admin approval.',
    tech: 'PHP, MySQL, Bootstrap',
    href: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
  },
];

export const moreProjects: MoreProject[] = [
  { name: 'NoSleep CLI', line: 'Keeps a Windows machine awake through long tasks.', href: 'https://github.com/SupaOhm/NoSleep-CLI' },
  { name: 'RevRace', line: 'GPS performance tracking for the car you actually drive.' },
  { name: 'DressMe', line: 'Outfit suggestions from your own photos, a software engineering project.' },
  { name: 'Salary Trend Regression', line: 'Least-squares models of salary against age, education and experience.' },
  { name: 'Online Shop Database', line: 'A normalized MySQL schema for an e-commerce store.', href: 'https://github.com/SupaOhm/onlineshop-DB' },
  { name: 'HCI Bus Routing', line: 'A mobile bus routing prototype shaped by user research.' },
  {
    name: 'Binary Matching Arduino Game',
    line: 'Binary-to-decimal practice on an Arduino Uno.',
    href: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
  },
];
