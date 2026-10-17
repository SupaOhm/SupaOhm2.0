import { useRef, type FocusEvent } from 'react';
import { chat, chatGreeting } from '../content/chat';
import type { Profile } from '../content/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';
import { LockCanvas } from './LockCanvas';
import { PhoneChat } from './PhoneChat';
import { sideFor } from './side';

/**
 * The finale: the email and profiles, beside a phone whose screen is a chat. [data-phone-slot] is the
 * phone's screen; the scene settles its 3D phone behind it and marks it with data-scene (SceneLayer).
 */
export function Contact({ profile, anchor }: { profile: Profile; anchor: number }) {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // the chat only shows once the phone has landed (Contact's top at the top of the screen): when focus reaches
  // it before then (keyboard, screen reader), scroll there so the phone lands and the chat fades in
  const onSlotFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.dataset.stage === 'open') return;
    sectionRef.current?.scrollIntoView(reduced ? { block: 'start', behavior: 'auto' } : { block: 'start' });
  };

  return (
    <section
      className="contact"
      id="contact"
      ref={sectionRef}
      data-anchor={anchor}
      data-side={sideFor(anchor)}
      data-scene-return
      aria-labelledby="contact-title"
    >
      <div className="contact-copy">
        <h2 className="part-title" id="contact-title">
          Say hello.
        </h2>
        <p>
          <a className="contact-email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </p>
        <p className="links">
          <a href={profile.github.href} target="_blank" rel="noreferrer">
            {profile.github.label}
          </a>
          <a href={profile.linkedin.href} target="_blank" rel="noreferrer">
            {profile.linkedin.label}
          </a>
        </p>
      </div>
      <div className="phone-slot" data-phone-slot onFocus={onSlotFocus}>
        <LockCanvas />
        <PhoneChat greeting={chatGreeting} topics={chat} />
      </div>
    </section>
  );
}
