export type CustomOption = { id: string; kind: 'colour' | 'fabric' | 'print' | 'front-position' | 'back-position'; name: string; description: string; image: string; price: number; active: boolean; sort_order: number };
export type CustomSettings = { button_label: string; heading: string; intro: string; enabled: boolean; custom_banner_image: string };
export type CustomConfig = { options: CustomOption[]; settings: CustomSettings };
export type CustomDetails = { colour: string; fabric: string; print: string; size: string; instructions: string; artwork: string; frontArtwork?: string; backArtwork?: string; image?: string; frontImage?: string; backImage?: string; frontPosition?: string; backPosition?: string; frontPositions?: string[]; backPositions?: string[]; colourPrice: number; fabricPrice: number; printPrice: number; frontPositionPrice?: number; backPositionPrice?: number; frontPositionPrices?: number[]; backPositionPrices?: number[] };
export const customSizes = ['S', 'M', 'L', 'XL', 'XXL'];
type CustomSelection = { colour: string; fabric: string; print: string; frontPosition?: string; backPosition?: string; frontPositions?: string[]; backPositions?: string[] };
export function customQuote(options: CustomOption[], ids: CustomSelection) {
  const chosen = (['colour', 'fabric', 'print'] as const).map(kind => options.find(o => o.id === ids[kind] && o.kind === kind && o.active));
  const frontPositions = ids.frontPositions ?? (ids.frontPosition ? [ids.frontPosition] : []);
  const backPositions = ids.backPositions ?? (ids.backPosition ? [ids.backPosition] : []);
  for (const id of frontPositions) chosen.push(options.find(o => o.id === id && o.kind === 'front-position' && o.active));
  for (const id of backPositions) chosen.push(options.find(o => o.id === id && o.kind === 'back-position' && o.active));
  if (new Set(frontPositions).size !== frontPositions.length || new Set(backPositions).size !== backPositions.length) throw new Error('Choose each print placement only once.');
  if (chosen.some(o => !o || !Number.isSafeInteger(o.price) || o.price < 0)) throw new Error('Choose an available colour, fabric and print.');
  return chosen.reduce((sum, option) => sum + option!.price, 0);
}
