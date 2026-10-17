import type { Part } from '../content/types';

export function PartHeading({ part }: { part: Part }) {
  const id = part.group.toLowerCase();
  return (
    <div className="part">
      <h2 className="part-title" id={`${id}-title`}>
        {part.group}
      </h2>
      <p className="part-line">{part.line}</p>
    </div>
  );
}
