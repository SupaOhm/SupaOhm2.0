import type { Profile } from '../content/types';
import { sideFor } from './side';

export function Contact({ profile, anchor }: { profile: Profile; anchor: number }) {
  return (
    <section className="contact" id="contact" data-anchor={anchor} data-side={sideFor(anchor)} aria-labelledby="contact-title">
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
    </section>
  );
}
