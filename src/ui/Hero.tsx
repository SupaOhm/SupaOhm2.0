import type { Profile } from '../content/types';
import { sideFor } from './side';

export function Hero({ profile }: { profile: Profile }) {
  const [first, ...rest] = profile.name.split(' ');
  return (
    <section className="panel hero" id="top" data-anchor={0} data-side={sideFor(0)}>
      <div className="copy">
        <h1>
          {first}
          <br />
          {rest.join(' ')}
        </h1>
        <p className="hero-line">{profile.intro}</p>
      </div>
    </section>
  );
}
