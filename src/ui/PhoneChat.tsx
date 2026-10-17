import { useEffect, useRef, useState } from 'react';
import type { ChatTopic, Link } from '../content/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';

const TYPING_MS = 800;
const VISIBLE_CHIPS = 3;

type Bubble = { from: 'me' | 'them'; text: string } | { from: 'link'; link: Link };

const external = (href: string) => (href.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {});

/** A message thread with question chips; every answer is written in advance (content/chat.ts). */
export function PhoneChat({ greeting, topics }: { greeting: string; topics: ChatTopic[] }) {
  const reduced = usePrefersReducedMotion();
  const [used, setUsed] = useState<number[]>([]);
  const [thread, setThread] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const refocus = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // keep the newest bubble in view; once an answer lands, put focus on the next question
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    if (refocus.current && !typing) {
      refocus.current = false;
      chipsRef.current?.querySelector('button')?.focus();
    }
  }, [thread, typing]);

  const ask = (i: number) => {
    const topic = topics[i];
    const answer: Bubble[] = [{ from: 'them', text: topic.answer }, ...topic.links.map((link) => ({ from: 'link' as const, link }))];
    setUsed((u) => [...u, i]);
    refocus.current = true;
    if (reduced) {
      setThread((t) => [...t, { from: 'me', text: topic.ask }, ...answer]);
      return;
    }
    setThread((t) => [...t, { from: 'me', text: topic.ask }]);
    setTyping(true);
    timer.current = window.setTimeout(() => {
      setTyping(false);
      setThread((t) => [...t, ...answer]);
    }, TYPING_MS);
  };

  const startOver = () => {
    window.clearTimeout(timer.current);
    refocus.current = true;
    setTyping(false);
    setUsed([]);
    setThread([]);
  };

  const remaining = topics.map((_, i) => i).filter((i) => !used.includes(i));

  return (
    <div className="chat">
      <p className="chat-head">Supakorn</p>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Chat">
        <p className="bubble them">{greeting}</p>
        {thread.map((b, i) =>
          b.from === 'link' ? (
            <a key={i} className="bubble link" href={b.link.href} {...external(b.link.href)}>
              {b.link.label}
            </a>
          ) : (
            <p key={i} className={`bubble ${b.from}`}>
              {b.text}
            </p>
          ),
        )}
        {typing && (
          <p className="bubble them typing">
            <span className="sr-only">Supakorn is typing</span>
            <span className="dot" aria-hidden="true" />
            <span className="dot" aria-hidden="true" />
            <span className="dot" aria-hidden="true" />
          </p>
        )}
      </div>
      <div className="chat-chips" ref={chipsRef}>
        {remaining.length > 0 ? (
          remaining.slice(0, VISIBLE_CHIPS).map((i) => (
            <button key={i} type="button" disabled={typing} onClick={() => ask(i)}>
              {topics[i].ask}
            </button>
          ))
        ) : (
          <button type="button" disabled={typing} onClick={startOver}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
