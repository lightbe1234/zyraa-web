export type Review = {
  id: string;
  author: string;
  initials: string;
  verified: boolean;
  purchasedSize: string;
  productSlug: string;
  productName: string;
  rating: number;
  quote: string;
  stats: string;
  fitRating: string;
  dateAgo: string;
  helpfulCount: number;
  category: string;
};

export const seedReviews: Review[] = [
  {
    id: 'rev-01',
    author: 'Noor R.',
    initials: 'NR',
    verified: true,
    purchasedSize: 'Size M',
    productSlug: 'concrete-box-tee',
    productName: 'Heavyweight Boxy Tee (280GSM)',
    rating: 5,
    quote: '“Collar ribbing is exceptionally tight and holds shape perfectly after a cold wash. The drop shoulder falls clean without bunching up under the arms.”',
    stats: "5'9\" · 74kg",
    fitRating: 'True to size',
    dateAgo: '3d ago',
    helpfulCount: 14,
    category: 'tees',
  },
  {
    id: 'rev-02',
    author: 'Amaan K.',
    initials: 'AK',
    verified: true,
    purchasedSize: 'Size L',
    productSlug: 'transit-cargo',
    productName: 'Tactical Cargo Pant',
    rating: 5,
    quote: '“Fabric weight has real structure and the custom ankle toggles stack cleanly over chunky sneakers. Deep pockets don\'t sag even when loaded.”',
    stats: "6'1\" · 82kg",
    fitRating: 'Relaxed drape',
    dateAgo: '1w ago',
    helpfulCount: 19,
    category: 'cargo',
  },
  {
    id: 'rev-03',
    author: 'Marcus V.',
    initials: 'MV',
    verified: true,
    purchasedSize: 'Size L',
    productSlug: 'afterdark-hoodie',
    productName: '480GSM Overhead Hoodie',
    rating: 5,
    quote: '“Double-layered hood stands completely on its own with no sloppy collapse. French terry is substantial and dense with zero shrinkage when hung dry.”',
    stats: "5'11\" · 78kg",
    fitRating: 'Boxy crop fit',
    dateAgo: '2w ago',
    helpfulCount: 11,
    category: 'hoodies',
  },
  {
    id: 'rev-04',
    author: 'Tariq H.',
    initials: 'TH',
    verified: true,
    purchasedSize: 'Size XL',
    productSlug: 'signal-heavy-tee',
    productName: 'Signal Heavy Oversized Tee',
    rating: 5,
    quote: '“Best silhouette in my closet right now. The drape is heavy without feeling stifling in warm weather. Fits exactly as advertised.”',
    stats: "6'2\" · 86kg",
    fitRating: 'True to size',
    dateAgo: '3w ago',
    helpfulCount: 8,
    category: 'tees',
  },
  {
    id: 'rev-05',
    author: 'Zain P.',
    initials: 'ZP',
    verified: true,
    purchasedSize: 'Size M',
    productSlug: 'studio-overshirt',
    productName: 'Studio Archival Utility Jacket',
    rating: 5,
    quote: '“Hardware, zipper pull, and seam taping are top tier. Feels like an archival piece from a Japanese high-end label.”',
    stats: "5'10\" · 72kg",
    fitRating: 'Overly structured',
    dateAgo: '1m ago',
    helpfulCount: 16,
    category: 'fit-pics',
  },
];
