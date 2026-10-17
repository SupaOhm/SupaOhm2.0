import type { FeaturedItem } from '../content/types';
import { sideFor } from './side';

/** With an anchor the item has an object beside it; without one it is a text-only entry. */
export function FeatureSection({ item, anchor }: { item: FeaturedItem; anchor?: number }) {
  return (
    <section
      className={anchor === undefined ? 'entry' : 'panel'}
      id={item.id}
      data-anchor={anchor}
      data-side={anchor === undefined ? undefined : sideFor(anchor)}
      aria-labelledby={`${item.id}-title`}
    >
      <div className="copy">
        <h3 className="title" id={`${item.id}-title`}>
          {item.title.replaceAll('-', '‑')}
        </h3>
        <p className="meta">{item.meta}</p>
        {item.body.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {item.figures.length > 0 && (
          <ul className="figures">
            {item.figures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        {item.links.length > 0 && (
          <p className="links">
            {item.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
