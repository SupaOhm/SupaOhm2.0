import { useMemo } from 'react';
import { about } from '../content/about';
import { bestPaper } from '../content/award';
import { featured } from '../content/featured';
import { parts } from '../content/parts';
import { profile } from '../content/profile';
import { moreProjects, projectRows } from '../content/projects';
import { AboutBlock } from '../ui/AboutBlock';
import { AwardSection } from '../ui/AwardSection';
import { Contact } from '../ui/Contact';
import { FeatureSection } from '../ui/FeatureSection';
import { Hero } from '../ui/Hero';
import { MoreProjects } from '../ui/MoreProjects';
import { PartHeading } from '../ui/PartHeading';
import { ProjectRows } from '../ui/ProjectRows';
import { TopBar } from '../ui/TopBar';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';
import { useTheme } from './theme';

// Scroll anchors follow the objects: 0 is the hero, 1 the Best Paper section, then each featured item with an object.
const ANCHORS = new Map(featured.filter((f) => f.object).map((f, i) => [f.id, i + 2]));

export function App() {
  const { theme, toggle } = useTheme();
  // ?capture=1 renders only the centred object, for scripts/capture.mjs
  const capture = useMemo(() => new URLSearchParams(window.location.search).has('capture'), []);
  if (capture) return <SceneLayer items={SCENE_ITEMS} theme={theme} capture />;

  return (
    <>
      <SceneLayer items={SCENE_ITEMS} theme={theme} />
      <TopBar name={profile.name} theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero profile={profile} />
        <AwardSection award={bestPaper} anchor={1} />
        {parts.map((part) => {
          const id = part.group.toLowerCase();
          return (
            <section key={id} id={id} aria-labelledby={`${id}-title`}>
              <PartHeading part={part} />
              {featured.map(
                (item) =>
                  item.group === part.group && <FeatureSection key={item.id} item={item} anchor={ANCHORS.get(item.id)} />,
              )}
              {part.group === 'Projects' && (
                <>
                  <ProjectRows rows={projectRows} anchor={ANCHORS.size + 2} />
                  <MoreProjects items={moreProjects} />
                </>
              )}
            </section>
          );
        })}
        <AboutBlock about={about} />
        <Contact profile={profile} />
      </main>
    </>
  );
}
