import { profile } from './profile';
import type { ChatTopic } from './types';

export const chatGreeting = 'Hi, I’m Supakorn. Tap a question 👇';

// Every answer is written in advance from what the page already says; keep them short enough for phone bubbles.
export const chat: ChatTopic[] = [
  {
    ask: 'What are you working on?',
    answer:
      'Phishing detection by a team of AI agents. Five specialists each read one part of a suspicious message, and a Judge makes the call.',
    links: [{ label: 'MA-ZeroPhish', href: '#ma-zerophish' }],
  },
  {
    ask: 'What won Best Paper?',
    answer: 'ESNIDSaaS, intrusion detection as a cloud service, built on Kafka and Spark. It won at IEEE IMC 2026 in Fukuoka.',
    links: [{ label: 'Read about the research', href: '#esnidsaas' }],
  },
  {
    ask: 'What did you build as an intern?',
    answer: 'An enterprise multi-agent RAG assistant. Document lookups went from about 55 seconds to under 5.',
    links: [{ label: 'Mizuhada', href: '#mizuhada' }],
  },
  {
    ask: 'What do you like building?',
    answer: 'AI systems, security tools, and the distributed plumbing under both. Mostly Python and TypeScript.',
    links: [],
  },
  {
    ask: 'Where are you?',
    answer: 'Pathum Thani, Thailand. Fourth year of computer engineering at SIIT, graduating June 2027.',
    links: [],
  },
  {
    ask: 'How do I reach you?',
    answer: `Email is best: ${profile.email}`,
    links: [{ label: 'Email', href: `mailto:${profile.email}` }, profile.github, profile.linkedin],
  },
];
