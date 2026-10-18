import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import type { Project } from '../content/types';

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const OFFSET = 18;

/** What a card says about a project. Touch cards get a real GitHub link; the floating card only names it. */
function CardBody({ project, link }: { project: Project; link: boolean }) {
  return (
    <>
      {project.pic && <img className="wall-pic" src={project.pic} alt="" loading="lazy" />}
      <p>{project.line}</p>
      {project.tech && <p className="wall-tech">{project.tech}</p>}
      {project.href &&
        (link ? (
          <a href={project.href} target="_blank" rel="noreferrer">
            GitHub
          </a>
        ) : (
          <p className="wall-tech">Opens GitHub</p>
        ))}
    </>
  );
}

/**
 * Every project as one wall of names. A fine pointer gets a card that trails it over the active
 * name (pinned beside the name for keyboard focus and reduced motion). On touch, the first tap
 * opens the card under the name and a second tap follows the link.
 */
export function ProjectWall({ projects }: { projects: Project[] }) {
  const [fine] = useState(() => window.matchMedia(FINE).matches);
  const [active, setActive] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!fine || active === null) return;
    const reduced = window.matchMedia(REDUCED).matches;
    let raf = 0;
    let last = 0;
    let x = NaN;
    let y = NaN;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const card = cardRef.current;
      const name = document.getElementById(`wall-name-${active}`);
      if (!card || !name) return;
      let tx: number;
      let ty: number;
      if (pointer.current && !reduced) {
        tx = pointer.current.x + OFFSET;
        ty = pointer.current.y + OFFSET;
      } else {
        const r = name.getBoundingClientRect();
        tx = r.right + OFFSET;
        ty = r.top + r.height / 2 - card.offsetHeight / 2;
      }
      // keep the card on screen
      tx = Math.min(tx, window.innerWidth - card.offsetWidth - 16);
      ty = Math.min(Math.max(ty, 16), window.innerHeight - card.offsetHeight - 16);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const follow = reduced || Number.isNaN(x) ? 1 : 1 - Math.exp(-dt * 16);
      x = Number.isNaN(x) ? tx : x + (tx - x) * follow;
      y = Number.isNaN(y) ? ty : y + (ty - y) * follow;
      card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      card.style.visibility = 'visible';
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fine, active]);

  const onTap = (e: MouseEvent, i: number, isLink: boolean) => {
    if (fine) return;
    if (active !== i) {
      e.preventDefault();
      setActive(i);
    } else if (!isLink) {
      setActive(null);
    }
  };

  return (
    <section className="wall" id="project-list" data-scene-exit aria-label="All projects">
      <ul
        className="wall-list"
        onPointerMove={(e) => {
          if (fine) pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          if (!fine) return;
          pointer.current = null;
          setActive(null);
        }}
      >
        {projects.map((project, i) => {
          const shared = {
            id: `wall-name-${i}`,
            className: 'wall-name',
            'aria-describedby': `wall-card-${i}`,
            'data-active': active === i ? '' : undefined,
            onPointerEnter: () => {
              if (fine) setActive(i);
            },
            onFocus: (e: FocusEvent<HTMLElement>) => {
              if (!fine) return;
              // keyboard focus pins the card beside the name; a click keeps it on the pointer
              if (!e.currentTarget.matches(':hover')) pointer.current = null;
              setActive(i);
            },
            onBlur: () => {
              if (fine) setActive((a) => (a === i ? null : a));
            },
            onClick: (e: MouseEvent) => onTap(e, i, Boolean(project.href)),
          };
          return (
            <li key={project.name}>
              {project.href ? (
                <a {...shared} href={project.href} target="_blank" rel="noreferrer">
                  {project.name}
                </a>
              ) : (
                <button {...shared} type="button" aria-expanded={fine ? undefined : active === i}>
                  {project.name}
                </button>
              )}
              <div id={`wall-card-${i}`} className="wall-card wall-card-inline" hidden={fine || active !== i}>
                <CardBody project={project} link />
              </div>
            </li>
          );
        })}
      </ul>
      {fine && active !== null && (
        <div className="wall-card wall-card-float" ref={cardRef} aria-hidden="true">
          <CardBody project={projects[active]} link={false} />
        </div>
      )}
    </section>
  );
}
