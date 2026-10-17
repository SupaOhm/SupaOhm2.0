import type { Profile } from '../content/types';
import { sideFor } from './side';

export function Hero({ profile }: { profile: Profile }) {
  const [first, ...rest] = profile.name.split(' ');
  const { award } = profile;
  return (
    <section className="panel hero" id="top" data-anchor={0} data-side={sideFor(0)}>
      <div className="copy">
        <h1>
          {first}
          <br />
          {rest.join(' ')}
        </h1>
        <p className="hero-line">{profile.intro}</p>
        <p className="hero-award">
          <span className="hero-award-name">{award.name}</span>
          <br />
          for <a href={award.href}>{award.work}</a>, {award.line}
        </p>
      </div>
    </section>
  );
}
