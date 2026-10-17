import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { about } from '../content/about';
import { mockMatchMedia } from '../test/matchMedia';
import { AboutRail } from './AboutRail';

describe('AboutRail', () => {
  it('shows four panels in order, with languages under education', () => {
    render(<AboutRail about={about} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Education',
      'Honors',
      'Skills',
      'Leadership and activities',
    ]);
    expect(screen.getByText(/TU-GET CBT 90/)).toBeInTheDocument();
  });

  it('is a focusable sideways group by default', () => {
    const { container } = render(<AboutRail about={about} />);
    expect(container.querySelector('#about')).toHaveAttribute('data-mode', 'rail');
    expect(screen.getByRole('group', { name: 'About, scroll sideways' })).toHaveAttribute('tabindex', '0');
  });

  it('stacks the panels when motion is reduced', () => {
    mockMatchMedia(['(prefers-reduced-motion: reduce)']);
    const { container } = render(<AboutRail about={about} />);
    expect(container.querySelector('#about')).toHaveAttribute('data-mode', 'stack');
    expect(screen.queryByRole('group')).toBeNull();
  });
});
