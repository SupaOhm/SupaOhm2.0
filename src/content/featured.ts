import type { FeaturedItem } from './types';

// CV order: research first (it carries the award), then experience, then the lead project.
export const featured: FeaturedItem[] = [
  {
    id: 'esnidsaas',
    group: 'Research',
    title: 'ESNIDSaaS',
    meta: 'Best Paper Award, IEEE IMC 2026 (CISOSE 2026, Fukuoka)',
    body: [
      'Network intrusion detection as a cloud service. Kafka ingests each tenant’s traffic, Spark Structured Streaming prepares it, and a hybrid detector combines signature rules, behavioural rules and machine learning.',
    ],
    figures: ['0.9557 accuracy and 0.8479 F1 on CIC-IDS2017.'],
    links: [],
    object: 'reader',
    pics: [{ src: '/shots/esnidsaas.webp' }],
  },
  {
    id: 'ma-zerophish',
    group: 'Research',
    title: 'MA-ZeroPhish',
    meta: 'Ongoing research at SIIT',
    body: [
      'Zero-day phishing detection by a team of agents. Five specialists read the URL, the page structure, its visuals, the message body and the network behind it.',
      'A Moderator and a Judge weigh the evidence, settle conflicts and ask for another look when the evidence is not enough.',
    ],
    figures: [],
    links: [],
    object: 'phone',
    pics: [{ src: '/shots/ma-zerophish.placeholder.webp' }],
  },
  {
    id: 'mizuhada',
    group: 'Experience',
    title: 'Mizuhada Group',
    meta: 'AI Developer Intern, Jun–Jul 2026',
    body: [
      'Built an enterprise multi-agent RAG assistant for company knowledge and live warehouse inventory.',
      'I owned it end to end: React and FastAPI on top, Gemini embeddings and ChromaDB underneath, and a source and page citation on every answer.',
    ],
    figures: [
      'Document lookup time down 91.3%, from 54.54 s to 4.728 s.',
      '100% source matching in evaluation.',
      'Warehouse access limited to 12 read-only query tools.',
    ],
    links: [],
    object: 'laptop',
    pics: [{ src: '/shots/mizuhada.placeholder.webp' }],
  },
  {
    id: 'baka',
    group: 'Experience',
    title: 'Baka Co.',
    meta: 'UX/UI Research & Design Intern, Aug 2025 onward',
    body: [
      'Redesigned Baka Index, a farming analytics platform built on Google Earth Engine, from stakeholder research to high-fidelity mockups.',
      'The finished redesign came with an implementation direction for the geospatial workflows and the frontend.',
    ],
    figures: [],
    links: [],
    object: 'frame',
    pics: [{ src: '/shots/baka.webp' }],
  },
  {
    id: 'acklab',
    group: 'Projects',
    title: 'AckLab',
    meta: 'Next.js, TypeScript, Docker',
    body: [
      'An interactive networking learning platform. Subnetting, DNS, the OSI model, routing and TCP become step-through simulations with packet animation and timeline playback.',
    ],
    figures: [],
    links: [{ label: 'GitHub', href: 'https://github.com/SupaOhm/AckLab' }],
    object: 'tablet',
    pics: [{ src: '/shots/acklab.placeholder.webp' }],
  },
];
