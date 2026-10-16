import type { About } from '../content/types';

export function AboutBlock({ about }: { about: About }) {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <h2 className="title" id="about-title">
        About
      </h2>
      <div className="about-grid">
        <div>
          <h3>Honors</h3>
          <ul>
            {about.honors.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Education</h3>
          <p className="about-strong">{about.education.school}</p>
          <p>{about.education.degree}</p>
          <p>{about.education.detail}</p>
          <p className="about-small">Coursework: {about.education.coursework.join(', ')}.</p>
        </div>
        <div>
          <h3>Skills</h3>
          {about.skills.map((g) => (
            <p key={g.label}>
              <span className="about-strong">{g.label}</span>
              <br />
              {g.items.join(', ')}
            </p>
          ))}
        </div>
        <div>
          <h3>Leadership and activities</h3>
          <ul>
            {about.activities.map((a) => (
              <li key={a.name}>
                <span className="about-strong">{a.name}</span>
                <br />
                {a.detail}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Languages</h3>
          <ul>
            {about.languages.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
