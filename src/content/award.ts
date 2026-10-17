import type { Award } from './types';

// Shown right after the hero, before Experience. The full ESNIDSaaS entry is in Research.
export const bestPaper: Award = {
  title: 'Best Paper',
  venue: 'IEEE IMC 2026, at CISOSE 2026 in Fukuoka',
  line: 'ESNIDSaaS, a paper on network intrusion detection as a cloud service, won the Best Paper Award.',
  link: { label: 'Read about the research', href: '#esnidsaas' },
  object: 'frame',
  // the frame is landscape: keep the title and authors in view
  pics: [{ src: '/shots/esnidsaas.webp', focus: [0.5, 0.2] }],
};
