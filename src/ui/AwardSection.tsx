import type { Award } from '../content/types';
import { sideFor } from './side';

export function AwardSection({ award, anchor }: { award: Award; anchor: number }) {
  return (
    <section
      className="panel"
      id="best-paper"
      data-anchor={anchor}
      data-side={sideFor(anchor)}
      aria-labelledby="best-paper-title"
    >
      <div className="copy">
        <h2 className="title" id="best-paper-title">
          {award.title}
        </h2>
        <p className="meta">{award.venue}</p>
        <p>{award.line}</p>
        <p className="links">
          <a href={award.link.href}>{award.link.label}</a>
        </p>
      </div>
    </section>
  );
}
