import { about } from '../content/about';
import { featured } from '../content/featured';
import { profile } from '../content/profile';
import { moreProjects, projectRows } from '../content/projects';
import { AboutBlock } from '../ui/AboutBlock';
import { Contact } from '../ui/Contact';
import { FeatureSection } from '../ui/FeatureSection';
import { Hero } from '../ui/Hero';
import { MoreProjects } from '../ui/MoreProjects';
import { ProjectRows } from '../ui/ProjectRows';
import { TopBar } from '../ui/TopBar';
import { useTheme } from './theme';

export function App() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <TopBar name={profile.name} theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero profile={profile} />
        {featured.map((item, i) => (
          <FeatureSection
            key={item.id}
            item={item}
            anchor={i + 1}
            groupStart={i === 0 || featured[i - 1].group !== item.group}
          />
        ))}
        <ProjectRows rows={projectRows} anchor={featured.length + 1} />
        <MoreProjects items={moreProjects} />
        <AboutBlock about={about} />
        <Contact profile={profile} />
      </main>
    </>
  );
}
