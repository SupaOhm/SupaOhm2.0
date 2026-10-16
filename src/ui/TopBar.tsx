import type { Theme } from '../scene/types';
import { ThemeToggle } from './ThemeToggle';

const SECTIONS = [
  ['research', 'Research'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['about', 'About'],
  ['contact', 'Contact'],
] as const;

export function TopBar({ name, theme, onToggleTheme }: { name: string; theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="topbar">
      <a className="topbar-name" href="#top">
        {name}
      </a>
      <nav aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
