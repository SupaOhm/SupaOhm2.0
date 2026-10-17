import { useMemo } from 'react';
import { about } from '../content/about';
import { bestPaper } from '../content/award';
import { featured } from '../content/featured';
import { parts } from '../content/parts';
import { profile } from '../content/profile';
import { projects } from '../content/projects';
import { AboutRail } from '../ui/AboutRail';
import { AwardSection } from '../ui/AwardSection';
import { Contact } from '../ui/Contact';
import { FeatureSection } from '../ui/FeatureSection';
import { Hero } from '../ui/Hero';
import { PartHeading } from '../ui/PartHeading';
import { ProjectWall } from '../ui/ProjectWall';
import { TopBar } from '../ui/TopBar';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';
import { useTheme } from './theme';

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
              {/* anchors: 0 is the hero, 1 the Best Paper section, then the featured items; Contact is the last */}
              {featured.map(
                (item, i) => item.group === part.group && <FeatureSection key={item.id} item={item} anchor={i + 2} />,
              )}
              {part.group === 'Projects' && <ProjectWall projects={projects} />}
            </section>
          );
        })}
        <AboutRail about={about} />
        <Contact profile={profile} anchor={featured.length + 2} />
      </main>
    </>
  );
}
