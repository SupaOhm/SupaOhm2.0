export type DeviceKind = 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet';
export type Group = 'Research' | 'Experience' | 'Projects';

export interface Link {
  label: string;
  href: string;
}

/** A screenshot shown on the object. `focus` is the crop centre in image coordinates (0..1, top-left origin). */
export interface Pic {
  src: string;
  focus?: [number, number];
}

export interface FeaturedItem {
  id: string;
  group: Group;
  title: string;
  meta: string;
  body: string[];
  figures: string[];
  links: Link[];
  object: DeviceKind;
  pics: Pic[];
}

/** A part of the page: its heading and one line under it. */
export interface Part {
  group: Group;
  line: string;
}

/** One name on the project wall. `tech` and `href` are shown on its card when present. */
export interface Project {
  name: string;
  line: string;
  tech?: string;
  href?: string;
  /** A picture at the top of its card, from public/shots/projects. */
  pic?: string;
}

/** The Best Paper section after the hero: the award, with the paper's first page framed. */
export interface Award {
  title: string;
  venue: string;
  line: string;
  link: Link;
  object: DeviceKind;
  pics: Pic[];
}

export interface Profile {
  name: string;
  intro: string;
  email: string;
  github: Link;
  linkedin: Link;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface About {
  honors: string[];
  education: { school: string; degree: string; detail: string; coursework: string[] };
  skills: SkillGroup[];
  activities: { name: string; detail: string }[];
  languages: string[];
}

/** One question chip in the contact phone's chat, with its answer written in advance. */
export interface ChatTopic {
  ask: string;
  answer: string;
  links: Link[];
}
