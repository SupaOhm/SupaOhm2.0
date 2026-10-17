import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../content/projects';
import { mockMatchMedia } from '../test/matchMedia';
import { ProjectWall } from './ProjectWall';

const FINE = '(hover: hover) and (pointer: fine)';

describe('ProjectWall', () => {
  it('lists every project by name, in order', () => {
    render(<ProjectWall projects={projects} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.firstElementChild!.textContent)).toEqual(projects.map((p) => p.name));
  });

  it('links only the projects that have a repository', () => {
    render(<ProjectWall projects={projects} />);
    const linked = projects.filter((p) => p.href);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(linked.map((p) => p.href));
    expect(screen.getAllByRole('button')).toHaveLength(projects.length - linked.length);
  });

  it('describes each name with its line and tech', () => {
    render(<ProjectWall projects={projects} />);
    const name = screen.getByRole('link', { name: 'FastForm' });
    const card = document.getElementById(name.getAttribute('aria-describedby')!);
    expect(card).toHaveTextContent(/one direct HTTP request.*Python standard library/);
  });

  describe('on touch', () => {
    it('opens the card under a name on the first tap instead of following the link', () => {
      render(<ProjectWall projects={projects} />);
      expect(fireEvent.click(screen.getByRole('link', { name: 'FastForm' }))).toBe(false);
      const card = document.getElementById('wall-card-0')!;
      expect(card).toBeVisible();
      expect(within(card).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', projects[0].href);
    });

    it('toggles the card of a project without a repository', () => {
      render(<ProjectWall projects={projects} />);
      const name = screen.getByRole('button', { name: 'RevRace' });
      fireEvent.click(name);
      expect(name).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(name);
      expect(name).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('with a fine pointer', () => {
    it('shows a floating card for the name under the pointer and drops it when the pointer leaves', () => {
      mockMatchMedia([FINE]);
      const { container } = render(<ProjectWall projects={projects} />);
      fireEvent.pointerEnter(screen.getByRole('link', { name: 'FastForm' }));
      expect(container.querySelector('.wall-card-float')).toHaveTextContent('Python standard library, GitHub Actions');
      fireEvent.pointerLeave(screen.getByRole('list'));
      expect(container.querySelector('.wall-card-float')).toBeNull();
    });

    it('shows the card for keyboard focus too', () => {
      mockMatchMedia([FINE]);
      const { container } = render(<ProjectWall projects={projects} />);
      act(() => screen.getByRole('button', { name: 'RevRace' }).focus());
      expect(container.querySelector('.wall-card-float')).toHaveTextContent('GPS performance tracking');
    });
  });
});
