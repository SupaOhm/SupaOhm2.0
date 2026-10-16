import type { Profile } from '../content/types';

export function Contact({ profile }: { profile: Profile }) {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <h2 className="title" id="contact-title">
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
