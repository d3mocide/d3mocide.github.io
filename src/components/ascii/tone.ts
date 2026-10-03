// Tone -> Tailwind text-color classes shared by the text-mode primitives.
export type Tone = 'green' | 'blue' | 'pink' | 'yellow' | 'red' | 'gray';

export const toneText: Record<Tone, string> = {
  green: 'text-neon-green',
  blue: 'text-neon-blue',
  pink: 'text-neon-pink',
  yellow: 'text-neon-yellow',
  red: 'text-neon-red',
  gray: 'text-gray-400',
};
