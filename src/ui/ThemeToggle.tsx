import type { Theme } from '../scene/types';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${next} theme`}>
      {next === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
