import type { About } from './types';

export const about: About = {
  honors: ['Best Paper Award, IEEE IMC 2026, Fukuoka, for ESNIDSaaS'],
  education: {
    school: 'SIIT, Thammasat University',
    degree: 'B.Eng. Computer Engineering, 4th year',
    detail: 'GPA 3.24, expected June 2027',
    coursework: [
      'Computer and Communication Security',
      'Software Engineering',
      'Object-Oriented Programming',
      'Data Structures and Algorithms',
      'Database Systems',
      'Cloud Computing',
      'Artificial Intelligence',
      'Cyber Crimes and Digital Forensics',
      'Operating Systems',
      'Networks',
      'System Analysis and Design',
    ],
  },
  skills: [
    { label: 'Programming languages', items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'C', 'C++', 'C#', 'SQL', 'PHP', 'HTML/CSS'] },
    { label: 'Frameworks and libraries', items: ['FastAPI', 'React', 'Next.js', 'Vite', 'Node.js', 'Express.js', 'Tailwind CSS', 'Pandas'] },
    {
      label: 'Databases and AI',
      items: ['MySQL', 'PostgreSQL', 'MongoDB', 'ChromaDB', 'Gemini API', 'Retrieval-augmented generation', 'Multi-agent systems'],
    },
    {
      label: 'Data, DevOps and tools',
      items: ['Apache Kafka', 'Spark Structured Streaming', 'Docker', 'GitHub Actions', 'Git', 'Postman', 'Burp Suite', 'Figma'],
    },
    {
      label: 'Concepts',
      items: ['Machine learning', 'Distributed systems', 'Network security', 'Cloud computing', 'REST API design', 'Database design and normalization'],
    },
  ],
  activities: [
    { name: 'SIIT CPE First Meet Staff, 2025', detail: 'Guided incoming students through departmental orientation.' },
    { name: 'TU Freshy Games, 2023', detail: 'Ran participant parcel distribution and helped coordinate the event on site.' },
  ],
  languages: ['Thai, native', 'English, TU-GET CBT 90 (2024)'],
};
