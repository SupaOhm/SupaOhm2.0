import { useEffect, useRef, useState } from 'react';
import type { About } from '../content/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';

const WIDE = '(min-width: 800px)';
const PANELS = 4;

/**
 * About as four panels. Wide screens pin the section and slide the panels sideways as the page
 * scrolls; narrow screens swipe through them (styles.css); reduced motion stacks them.
 */
export function AboutRail({ about }: { about: About }) {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (reduced || !section || !track) return;
    const wide = window.matchMedia(WIDE);
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!wide.matches) {
        track.style.transform = '';
        return;
      }
      const r = section.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const t = range > 0 ? Math.min(Math.max(-r.top / range, 0), 1) : 0;
      track.style.transform = `translate3d(${-t * Math.max(0, track.scrollWidth - track.clientWidth)}px, 0, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    wide.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      wide.removeEventListener('change', schedule);
      track.style.transform = ''; // e.g. reduced motion switched on: the stacked panels must not stay shifted
    };
  }, [reduced]);

  // narrow screens swipe the track itself: light the dot of the panel in view
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const travel = track.scrollWidth - track.clientWidth;
    setDot(travel > 0 ? Math.round((track.scrollLeft / travel) * (PANELS - 1)) : 0);
  };

  return (
    <section className="about" id="about" ref={sectionRef} data-mode={reduced ? 'stack' : 'rail'} aria-labelledby="about-title">
      <div className="about-sticky">
        <h2 className="part-title" id="about-title">
          About
        </h2>
        <div
          className="about-track"
          ref={trackRef}
          onScroll={onTrackScroll}
          tabIndex={reduced ? undefined : 0}
          role={reduced ? undefined : 'group'}
          aria-label={reduced ? undefined : 'About, scroll sideways'}
        >
          <article className="about-panel">
            <h3>Education</h3>
            <p className="about-strong">{about.education.school}</p>
            <p>{about.education.degree}</p>
            <p>{about.education.detail}</p>
            <p className="about-small">Coursework: {about.education.coursework.join(', ')}.</p>
            <p className="about-small">Languages: {about.languages.join('; ')}.</p>
          </article>
          <article className="about-panel">
            <h3>Honors</h3>
            <ul>
              {about.honors.map((h) => (
                <li key={h} className="about-honor">
                  {h}
                </li>
              ))}
            </ul>
          </article>
          <article className="about-panel">
            <h3>Skills</h3>
            <div className="about-columns">
              {about.skills.map((g) => (
                <p key={g.label}>
                  <span className="about-strong">{g.label}</span>
                  <br />
                  {g.items.join(', ')}
                </p>
              ))}
            </div>
          </article>
          <article className="about-panel">
            <h3>Leadership and activities</h3>
            <ul>
              {about.activities.map((a) => (
                <li key={a.name}>
                  <span className="about-strong">{a.name}</span>
                  <br />
                  {a.detail}
                </li>
              ))}
            </ul>
          </article>
        </div>
        {!reduced && (
          <div className="about-dots" aria-hidden="true">
            {Array.from({ length: PANELS }, (_, i) => (
              <span key={i} data-on={i === dot ? '' : undefined} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
