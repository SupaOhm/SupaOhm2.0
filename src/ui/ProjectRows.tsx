import type { ProjectRow } from '../content/types';
import { sideFor } from './side';

export function ProjectRows({ rows, anchor }: { rows: ProjectRow[]; anchor: number }) {
  return (
    <section className="panel" data-anchor={anchor} data-side={sideFor(anchor)} aria-label="Project list">
      <ul className="rows copy">
        {rows.map((r) => (
          <li key={r.name}>
            <h3 className="row-name">{r.name}</h3>
            <p>{r.line}</p>
            <p className="tech">{r.tech}</p>
            <a href={r.href} target="_blank" rel="noreferrer" aria-label={`${r.name} on GitHub`}>
              GitHub
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
