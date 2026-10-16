import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

// jsdom has no WebGL: render the page with still images instead of the scene
vi.mock('./capability', () => ({ detectSceneMode: () => 'static' }));

describe('App', () => {
  it('lays sections out in CV order', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Research',
      'Experience',
      'Projects',
      'About',
      'Say hello.',
    ]);
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .slice(0, 5)
        .map((h) => h.textContent?.replaceAll('\u2011', '-')),
    ).toEqual(['ESNIDSaaS', 'MA-ZeroPhish', 'Mizuhada Group', 'Baka Co.', 'AckLab']);
  });

  it('marks one scroll anchor per object state, alternating sides', () => {
    const { container } = render(<App />);
    const anchors = [...container.querySelectorAll<HTMLElement>('[data-anchor]')];
    expect(anchors.map((el) => el.dataset.anchor)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(anchors.map((el) => el.dataset.side)).toEqual(['left', 'right', 'left', 'right', 'left', 'right', 'left']);
    expect(container.querySelector('[data-scene-exit]')).toHaveAttribute('aria-labelledby', 'more-title');
  });

  it('switches theme from the top bar', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toHaveTextContent('Light');
  });

  it('links every top-bar entry to a section on the page', () => {
    const { container } = render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    for (const link of within(nav).getAllByRole('link')) {
      const id = link.getAttribute('href')!.slice(1);
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });
});
