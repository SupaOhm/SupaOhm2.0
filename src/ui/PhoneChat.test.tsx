import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chat, chatGreeting } from '../content/chat';
import { profile } from '../content/profile';
import { mockMatchMedia } from '../test/matchMedia';
import { PhoneChat } from './PhoneChat';

const REDUCED = '(prefers-reduced-motion: reduce)';
const chips = () => screen.getAllByRole('button').map((b) => b.textContent);
const askAll = () => {
  for (const t of chat) fireEvent.click(screen.getByRole('button', { name: t.ask }));
};

describe('PhoneChat', () => {
  afterEach(() => vi.useRealTimers());

  it('opens with a greeting and the first three questions', () => {
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    expect(screen.getByRole('log')).toHaveTextContent(chatGreeting);
    expect(chips()).toEqual(chat.slice(0, 3).map((t) => t.ask));
  });

  it('asks, types for a moment, then answers with its links and offers the next question', () => {
    vi.useFakeTimers();
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    fireEvent.click(screen.getByRole('button', { name: chat[0].ask }));
    const log = screen.getByRole('log');
    expect(log).toHaveTextContent(chat[0].ask);
    expect(log).toHaveTextContent('Supakorn is typing');
    expect(log).not.toHaveTextContent(chat[0].answer);
    act(() => vi.advanceTimersByTime(800));
    expect(log).toHaveTextContent(chat[0].answer);
    expect(log).not.toHaveTextContent('Supakorn is typing');
    expect(within(log).getByRole('link', { name: 'MA-ZeroPhish' })).toHaveAttribute('href', '#ma-zerophish');
    expect(chips()).toEqual(chat.slice(1, 4).map((t) => t.ask));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: chat[1].ask }));
  });

  it('answers at once when motion is reduced', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    fireEvent.click(screen.getByRole('button', { name: chat[1].ask }));
    expect(screen.getByRole('log')).toHaveTextContent(chat[1].answer);
  });

  it('hands over the email and both profiles', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    askAll();
    const log = screen.getByRole('log');
    expect(within(log).getByRole('link', { name: 'Email' })).toHaveAttribute('href', `mailto:${profile.email}`);
    expect(within(log).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', profile.github.href);
    expect(within(log).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', profile.linkedin.href);
  });

  it('offers to start over once every question is used', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    askAll();
    expect(chips()).toEqual(['Start over']);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('log')).not.toHaveTextContent(chat[0].ask);
    expect(chips()).toEqual(chat.slice(0, 3).map((t) => t.ask));
  });
});
