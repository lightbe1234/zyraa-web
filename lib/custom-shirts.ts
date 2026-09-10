export type CustomOption = { id: string; kind: 'colour' | 'fabric' | 'print' | 'front-position' | 'back-position'; name: string; description: string; image: string; price: number; active: boolean; sort_order: number };
export type CustomSettings = { button_label: string; heading: string; intro: string; enabled: boolean; custom_banner_image: string };
export type CustomConfig = { options: CustomOption[]; settings: CustomSettings };
export type CustomDetails = { colour: string; fabric: string; print: string; size: string; instructions: string; artwork: string; frontArtwork?: string; backArtwork?: string; image?: string; frontImage?: string; backImage?: string; frontPosition?: string; backPosition?: string; colourPrice: number; fabricPrice: number; printPrice: number; frontPositionPrice?: number; backPositionPrice?: number };
export const customSizes = ['S', 'M', 'L', 'XL', 'XXL'];
export function customQuote(options: CustomOption[], ids: { colour: string; fabric: string; print: string; frontPosition?: string; backPosition?: string }) {
  const chosen = (['colour', 'fabric', 'print'] as const).map(kind => options.find(o => o.id === ids[kind] && o.kind === kind && o.active));
  if (ids.frontPosition) chosen.push(options.find(o => o.id === ids.frontPosition && o.kind === 'front-position' && o.active));
  if (ids.backPosition) chosen.push(options.find(o => o.id === ids.backPosition && o.kind === 'back-position' && o.active));
  if (chosen.some(o => !o || !Number.isSafeInteger(o.price) || o.price < 0)) throw new Error('Choose an available colour, fabric and print.');
  return chosen.reduce((sum, option) => sum + option!.price, 0);
}
