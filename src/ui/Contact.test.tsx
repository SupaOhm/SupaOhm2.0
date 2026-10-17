import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat } from '../content/chat';
import { profile } from '../content/profile';
import { mockMatchMedia } from '../test/matchMedia';
import { Contact } from './Contact';

const REDUCED = '(prefers-reduced-motion: reduce)';

describe('Contact', () => {
  // jsdom has no scrollIntoView
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    scrollIntoView.mockReset();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('keeps the chat reachable before the phone lands, and scrolls Contact up when focus gets there', () => {
    const { container } = render(<Contact profile={profile} anchor={7} />);
    const slot = container.querySelector<HTMLElement>('[data-phone-slot]')!;
    slot.dataset.stage = 'lock';
    slot.dataset.scene = 'arriving';
    const chip = screen.getByRole('button', { name: chat[0].ask });
    expect(chip).not.toBeDisabled();
    expect(container.querySelector('.chat')).not.toHaveStyle({ visibility: 'hidden' });
    expect(container.querySelector('.chat')).not.toHaveAttribute('hidden');
    chip.focus();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('#contact'));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('jumps without smooth scrolling when motion is reduced', () => {
    mockMatchMedia([REDUCED]);
    render(<Contact profile={profile} anchor={7} />);
    screen.getByRole('button', { name: chat[0].ask }).focus();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });

  it('leaves the page alone once the phone has landed', () => {
    const { container } = render(<Contact profile={profile} anchor={7} />);
    container.querySelector<HTMLElement>('[data-phone-slot]')!.dataset.stage = 'open';
    screen.getByRole('button', { name: chat[0].ask }).focus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
