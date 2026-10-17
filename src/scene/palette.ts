import { Color, LinearSRGBColorSpace } from 'three';
import type { Theme } from './types';

export const STATE_COUNT = 8;

// glow / wash per state: hero, Best Paper, Mizuhada, Baka, ESNIDSaaS, MA-ZeroPhish, AckLab, contact
const HEX: Record<Theme, string[]> = {
  dark: ['#E8C9A0/#1F4A5A', '#E6C45A/#4A3C10', '#8FD3C1/#14403E', '#B7D98B/#2E4A1E', '#9FC3E8/#2A2F6B', '#F0A860/#7A2E46', '#C7B3F2/#2E2A5E', '#E8C9A0/#1F4A5A'],
  light: ['#B98450/#F1DFC8', '#A88412/#F3EAC8', '#1E8C74/#D3EEE7', '#5C8A1E/#E3EFD3', '#2F6FD0/#D6E5F8', '#D9682C/#F7D7C4', '#6E4FD8/#E3DAF8', '#B98450/#F1DFC8'],
};

export interface Swatch {
  glow: Color;
  wash: Color;
}

const parse = (pair: string): Swatch => {
  const [glow, wash] = pair.split('/');
  return { glow: new Color(glow), wash: new Color(wash) };
};

export const PALETTE: Record<Theme, Swatch[]> = { dark: HEX.dark.map(parse), light: HEX.light.map(parse) };

/** Page background as raw output values: the background shader does no colour conversion, so this matches the CSS exactly. */
export const BASE: Record<Theme, Color> = {
  dark: new Color().setRGB(0, 0, 0, LinearSRGBColorSpace),
  light: new Color().setRGB(245 / 255, 245 / 255, 247 / 255, LinearSRGBColorSpace),
};
