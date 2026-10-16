import type { MoreProject } from '../content/types';

export function MoreProjects({ items }: { items: MoreProject[] }) {
  return (
    <section className="more" data-scene-exit aria-labelledby="more-title">
      <h3 className="subtitle" id="more-title">
        More projects
      </h3>
      <ul className="more-list">
        {items.map((m) => (
          <li key={m.name}>
            {m.href ? (
              <a href={m.href} target="_blank" rel="noreferrer">
                {m.name}
              </a>
            ) : (
              <span className="more-name">{m.name}</span>
            )}
            <p>{m.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
