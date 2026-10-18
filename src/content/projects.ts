import type { Project } from './types';

// The wall lists these in order: the three with a stack and a repository first.
export const projects: Project[] = [
  {
    name: 'FastForm',
    line: 'Submits a Google Form with one direct HTTP request instead of a full browser.',
    tech: 'Python standard library, GitHub Actions',
    href: 'https://github.com/SupaOhm/fastform',
  },
  {
    name: 'Full-Stack Expense Tracker',
    pic: '/shots/projects/expense.webp',
    line: 'Expense management with REST APIs and running totals.',
    tech: 'MongoDB, Express, React, Node.js',
    href: 'https://github.com/SupaOhm/Expense-Tracker',
  },
  {
    name: 'Lost and Found Management System',
    pic: '/shots/projects/lostfound.webp',
    line: 'Report and manage lost items, with admin approval.',
    tech: 'PHP, MySQL, Bootstrap',
    href: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
  },
  {
    name: 'NoSleep CLI',
    pic: '/shots/projects/nosleep.webp',
    line: 'Keeps a Windows machine awake through long tasks.',
    href: 'https://github.com/SupaOhm/NoSleep-CLI',
  },
  {
    name: 'RevRace',
    line: 'GPS performance tracking for the car you actually drive.',
  },
  {
    name: 'DressMe',
    pic: '/shots/projects/dressme.webp',
    line: 'Outfit suggestions from your own photos, a software engineering project.',
  },
  {
    name: 'Salary Trend Regression',
    pic: '/shots/projects/salary.webp',
    line: 'Least-squares models of salary against age, education and experience.',
  },
  {
    name: 'Online Shop Database',
    pic: '/shots/projects/onlineshop.webp',
    line: 'A normalized MySQL schema for an e-commerce store.',
    href: 'https://github.com/SupaOhm/onlineshop-DB',
  },
  {
    name: 'HCI Bus Routing',
    pic: '/shots/projects/hci.webp',
    line: 'A mobile bus routing prototype shaped by user research.',
  },
  {
    name: 'Binary Matching Arduino Game',
    pic: '/shots/projects/arduino.webp',
    line: 'Binary-to-decimal practice on an Arduino Uno.',
    href: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
  },
];
