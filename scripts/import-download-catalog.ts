import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Product } from '../lib/catalog.ts';

type Kind = 'tee' | 'essential' | 'polo' | 'trouser' | 'set' | 'cap';
type Draft = {
  slug: string;
  name: string;
  kind: Kind;
  photos: number[];
  colors: string[];
  story: string;
  collection?: 'After Hours' | 'Core Forms' | 'City Utility';
};

const downloadDirectory = path.join(process.env.USERPROFILE || 'C:\\Users\\shaha', 'Downloads');
const destinationDirectory = path.join(process.cwd(), 'public', 'catalog', 'september-2026');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecret) throw new Error('Supabase environment is not configured.');
const supabaseHeaders = {
  apikey: supabaseSecret,
  Authorization: `Bearer ${supabaseSecret}`,
  'Content-Type': 'application/json',
};

async function supabaseRequest(endpoint: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...init,
    headers: { ...supabaseHeaders, ...init.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const drafts: Draft[] = [
  { slug: 'classical-muse-tee', name: 'Classical Muse Tee', kind: 'tee', photos: [0, 1], colors: ['Washed Black'], story: 'A gallery-inspired front graphic paired with a bold classical back composition.' },
  { slug: 'lucky-charm-tee', name: 'Lucky Charm Tee', kind: 'tee', photos: [2, 3], colors: ['Washed Black'], story: 'Playing-card artwork and considered placement turn a dark base into a graphic statement.' },
  { slug: 'black-line-trouser', name: 'Black Line Trouser', kind: 'trouser', photos: [4], colors: ['Black'], story: 'A clean black trouser designed to ground graphic tees and everyday layers.' },
  { slug: 'cloud-line-trouser', name: 'Cloud Line Trouser', kind: 'trouser', photos: [5], colors: ['Cloud'], story: 'A light neutral trouser that keeps warm-weather outfits sharp and easy.' },
  { slug: 'stone-line-trouser', name: 'Stone Line Trouser', kind: 'trouser', photos: [6], colors: ['Stone'], story: 'A versatile stone shade with a streamlined shape for repeat daily wear.' },
  { slug: 'earth-line-trouser', name: 'Earth Line Trouser', kind: 'trouser', photos: [7], colors: ['Earth'], story: 'A rich earth-tone trouser made for tonal dressing and clean contrast.' },
  { slug: 'ash-line-trouser', name: 'Ash Line Trouser', kind: 'trouser', photos: [8], colors: ['Ash'], story: 'A muted grey trouser with an understated, city-ready look.' },
  { slug: 'ivory-texture-polo', name: 'Ivory Texture Polo', kind: 'polo', photos: [9, 10], colors: ['Ivory'], story: 'A textured ivory surface gives the classic polo a more elevated finish.' },
  { slug: 'midnight-polo', name: 'Midnight Polo', kind: 'polo', photos: [11], colors: ['Midnight'], story: 'A deep black polo with a crisp, minimal profile that moves easily from day to evening.' },
  { slug: 'sand-polo', name: 'Sand Polo', kind: 'polo', photos: [12], colors: ['Sand'], story: 'A warm sand polo that brings quiet texture to a neutral rotation.' },
  { slug: 'cocoa-polo', name: 'Cocoa Polo', kind: 'polo', photos: [13], colors: ['Cocoa'], story: 'A grounded cocoa shade gives this everyday polo a distinctive tonal finish.' },
  { slug: 'slate-polo', name: 'Slate Polo', kind: 'polo', photos: [14], colors: ['Slate'], story: 'A cool slate polo built around clean lines and effortless pairing.' },
  { slug: 'black-essential-tee', name: 'Black Essential Tee', kind: 'essential', photos: [15], colors: ['Black'], story: 'A clean black base made to anchor the everyday wardrobe.' },
  { slug: 'sand-essential-tee', name: 'Sand Essential Tee', kind: 'essential', photos: [16], colors: ['Sand'], story: 'A soft sand neutral that works on its own or under an overshirt.' },
  { slug: 'white-essential-tee', name: 'White Essential Tee', kind: 'essential', photos: [17], colors: ['White'], story: 'A bright, uncomplicated essential with a polished streetwear silhouette.' },
  { slug: 'ghost-signal-tee', name: 'Ghost Signal Tee', kind: 'tee', photos: [18, 19, 53], colors: ['Sand', 'White'], story: 'A restrained front detail opens into an expressive illustrated back graphic.' },
  { slug: 'high-voltage-tee', name: 'High Voltage Tee', kind: 'tee', photos: [20, 21], colors: ['Black'], story: 'Electric artwork and saturated colour bring high impact to a deep black base.' },
  { slug: 'marble-muse-tee', name: 'Marble Muse Tee', kind: 'tee', photos: [22, 23], colors: ['Navy'], story: 'Classical portraiture meets a dark navy streetwear canvas.' },
  { slug: 'desert-ronin-tee', name: 'Desert Ronin Tee', kind: 'tee', photos: [24, 25], colors: ['Tan'], story: 'A cinematic character graphic framed by a warm, desert-toned base.' },
  { slug: 'crimson-blade-tee', name: 'Crimson Blade Tee', kind: 'tee', photos: [26, 27], colors: ['Crimson'], story: 'A tonal red base intensifies the illustrated blade composition.' },
  { slug: 'hidden-gaze-tee', name: 'Hidden Gaze Tee', kind: 'tee', photos: [28, 29], colors: ['White'], story: 'Minimal from the front, expressive from the back with a graphic gaze motif.' },
  { slug: 'orange-hero-tee', name: 'Orange Hero Tee', kind: 'tee', photos: [30, 31], colors: ['Black'], story: 'A vivid orange character print cuts through a clean black backdrop.' },
  { slug: 'behind-the-frame-tee', name: 'Behind The Frame Tee', kind: 'tee', photos: [32, 33], colors: ['White'], story: 'A compact front mark and full illustrated back create a balanced two-sided design.' },
  { slug: 'pirate-route-tee', name: 'Pirate Route Tee', kind: 'tee', photos: [34, 35], colors: ['Sand'], story: 'Adventure-led artwork gives a warm neutral tee its own visual narrative.' },
  { slug: 'wanted-crew-tee', name: 'Wanted Crew Tee', kind: 'tee', photos: [36, 37], colors: ['Black'], story: 'Poster-style character artwork turns the back into a full graphic panel.' },
  { slug: 'bone-sketch-tee', name: 'Bone Sketch Tee', kind: 'tee', photos: [38, 39, 40, 41], colors: ['Bone'], story: 'Loose sketchwork and a soft bone palette create an art-studio feel.' },
  { slug: 'midnight-bloom-tee', name: 'Midnight Bloom Tee', kind: 'tee', photos: [42, 43, 44, 45], colors: ['Black'], story: 'Botanical artwork blooms across a dark base for a refined graphic contrast.' },
  { slug: 'night-swim-tee', name: 'Night Swim Tee', kind: 'tee', photos: [46, 47, 48], colors: ['Black'], story: 'A moody water-inspired graphic gives this black tee a cinematic edge.' },
  { slug: 'circuit-line-tee', name: 'Circuit Line Tee', kind: 'tee', photos: [49, 50, 51], colors: ['Black'], story: 'Technical linework creates a precise, futuristic back statement.' },
  { slug: 'outlaw-graphic-tee', name: 'Outlaw Graphic Tee', kind: 'tee', photos: [52], colors: ['Black'], story: 'A bold central graphic built for high-contrast streetwear styling.' },
  { slug: 'shadow-mark-cap', name: 'Shadow Mark Cap', kind: 'cap', photos: [54], colors: ['Black'], story: 'A clean dark cap finished with a focused embroidered-style front mark.' },
  { slug: 'lens-graphic-tee', name: 'Lens Graphic Tee', kind: 'tee', photos: [55, 56], colors: ['Black'], story: 'Photography-inspired artwork adds depth to an understated black base.' },
  { slug: 'mini-motor-tee', name: 'Mini Motor Tee', kind: 'tee', photos: [57], colors: ['Black'], story: 'A small automotive motif keeps the look clean while adding personality.' },
  { slug: 'navy-motion-tee', name: 'Navy Motion Tee', kind: 'tee', photos: [58, 59], colors: ['Navy'], story: 'Dynamic artwork is grounded by a rich navy streetwear base.' },
  { slug: 'race-day-tee', name: 'Race Day Tee', kind: 'tee', photos: [60, 61], colors: ['Black'], story: 'Motorsport cues and compact placement deliver an easy graphic layer.' },
  { slug: 'emerald-track-trouser', name: 'Emerald Track Trouser', kind: 'trouser', photos: [62], colors: ['Emerald'], story: 'A deep green trouser that brings controlled colour to everyday outfits.' },
  { slug: 'mono-street-set', name: 'Mono Street Set', kind: 'set', photos: [63], colors: ['Black'], story: 'A coordinated black pairing for an immediate head-to-toe streetwear look.' },
  { slug: 'sand-street-set', name: 'Sand Street Set', kind: 'set', photos: [64], colors: ['Sand'], story: 'A tonal sand set that makes relaxed styling feel considered.' },
  { slug: 'grey-street-set', name: 'Grey Street Set', kind: 'set', photos: [65], colors: ['Grey'], story: 'A cool grey coordinated set built for low-effort, high-impact dressing.' },
  { slug: 'spider-mark-tee', name: 'Spider Mark Tee', kind: 'tee', photos: [66], colors: ['Black'], story: 'A compact web-inspired mark gives the black tee a sharp graphic focal point.' },
  { slug: 'panorama-street-set', name: 'Panorama Street Set', kind: 'set', photos: [67], colors: ['Black'], story: 'A graphic two-piece look with a broad, landscape-inspired visual story.' },
  { slug: 'chicago-street-set', name: 'Chicago Street Set', kind: 'set', photos: [68], colors: ['Black'], story: 'Collegiate city lettering gives this coordinated set a confident varsity mood.' },
  { slug: 'black-tailored-trouser', name: 'Black Tailored Trouser', kind: 'trouser', photos: [69], colors: ['Black'], story: 'A sharper black trouser designed to dress up tees, polos and overshirts.' },
  { slug: 'navy-tailored-trouser', name: 'Navy Tailored Trouser', kind: 'trouser', photos: [70], colors: ['Navy'], story: 'A deep navy trouser offering a softer alternative to everyday black.' },
  { slug: 'grey-tailored-trouser', name: 'Grey Tailored Trouser', kind: 'trouser', photos: [71], colors: ['Grey'], story: 'A versatile grey trouser with a clean profile for smart-casual rotation.' },
  { slug: 'say-it-back-tee', name: 'Say It Back Tee', kind: 'tee', photos: [72, 73], colors: ['Black'], story: 'Direct typography gives this black tee an expressive, conversational edge.' },
  { slug: 'crimson-training-tee', name: 'Crimson Training Tee', kind: 'tee', photos: [74], colors: ['Crimson'], story: 'A saturated red base and athletic visual language create immediate energy.' },
  { slug: 'heritage-sketch-tee', name: 'Heritage Sketch Tee', kind: 'tee', photos: [75, 76], colors: ['Black'], story: 'Hand-drawn heritage artwork gives the back panel a collected, archival feel.' },
  { slug: 'take-time-tee', name: 'Take Time Tee', kind: 'tee', photos: [77, 78], colors: ['Black'], story: 'A reflective message graphic designed for slow days and late nights.' },
  { slug: 'boring-statement-tee', name: 'Boring Statement Tee', kind: 'tee', photos: [79], colors: ['Black'], story: 'Deadpan typography turns a simple black tee into a confident statement.' },
  { slug: 'one-more-rep-tee', name: 'One More Rep Tee', kind: 'tee', photos: [80, 81], colors: ['Black'], story: 'Training-inspired graphics bring focus and momentum to a relaxed streetwear shape.' },
  { slug: 'acid-wash-essential-tee', name: 'Acid Wash Essential Tee', kind: 'essential', photos: [82, 83, 84], colors: ['Acid Black'], story: 'A washed surface gives the everyday essential natural depth and character.' },
  { slug: 'nine-eleven-archive-tee', name: 'Nine Eleven Archive Tee', kind: 'tee', photos: [85, 86], colors: ['Black'], story: 'Automotive archive styling delivers a clean front and detailed back story.' },
  { slug: 'being-one-tee', name: 'Being One Tee', kind: 'tee', photos: [87, 88], colors: ['Black'], story: 'A considered message graphic explores connection through a bold back composition.' },
  { slug: 'carefree-tee', name: 'Carefree Tee', kind: 'tee', photos: [89], colors: ['Black'], story: 'An easy statement graphic made for relaxed, off-duty dressing.' },
];

const kindDetails: Record<Kind, Pick<Product, 'category' | 'collection' | 'price' | 'compareAt' | 'stock' | 'sizes'>> = {
  tee: { category: 'Oversized Tees', collection: 'After Hours', price: 199000, compareAt: 289000, stock: 12, sizes: ['S', 'M', 'L', 'XL'] },
  essential: { category: 'Essentials', collection: 'Core Forms', price: 179000, compareAt: 249000, stock: 14, sizes: ['S', 'M', 'L', 'XL'] },
  polo: { category: 'Essentials', collection: 'Core Forms', price: 195000, compareAt: 279000, stock: 10, sizes: ['S', 'M', 'L', 'XL'] },
  trouser: { category: 'Bottoms', collection: 'City Utility', price: 219000, compareAt: 319000, stock: 10, sizes: ['S', 'M', 'L', 'XL'] },
  set: { category: 'Essentials', collection: 'City Utility', price: 329000, compareAt: 449000, stock: 8, sizes: ['S', 'M', 'L', 'XL'] },
  cap: { category: 'Outerwear', collection: 'Core Forms', price: 129000, compareAt: 179000, stock: 15, sizes: ['One Size'] },
};

function finishDescription(draft: Draft) {
  if (draft.kind === 'trouser') return `${draft.story} Cut with a balanced everyday silhouette and a premium hand-feel, it is an easy match for both oversized tees and polished polos.`;
  if (draft.kind === 'polo') return `${draft.story} The refined collar, comfortable shape and quality fabric make it an effortless step up from a standard tee.`;
  if (draft.kind === 'set') return `${draft.story} The coordinated top and trouser take the guesswork out of styling while keeping the fit relaxed, modern and comfortable.`;
  if (draft.kind === 'cap') return `${draft.story} Its versatile shape finishes casual outfits without competing with the rest of the look.`;
  if (draft.kind === 'essential') return `${draft.story} Built with a relaxed silhouette, clean neckline and substantial fabric feel for comfortable repeat wear.`;
  return `${draft.story} Cut in a relaxed streetwear silhouette with a clean ribbed neckline, reinforced seams and a substantial fabric feel for repeat wear.`;
}

const sources = (await readdir(downloadDirectory))
  .filter((name) => /^FB_IMG_\d+\.jpg\.jpeg$/i.test(name))
  .sort((left, right) => left.localeCompare(right));

if (sources.length !== 90 || sources[0] !== 'FB_IMG_1788853635486.jpg.jpeg' || sources.at(-1) !== 'FB_IMG_1788854173777.jpg.jpeg') {
  throw new Error(`Expected the 90-photo ZYRA batch in Downloads, found ${sources.length}. No products were imported.`);
}
const usedPhotos = drafts.flatMap((draft) => draft.photos);
if (usedPhotos.length !== 90 || new Set(usedPhotos).size !== 90 || Math.min(...usedPhotos) !== 0 || Math.max(...usedPhotos) !== 89) {
  throw new Error('The catalog manifest must use every source photo exactly once.');
}

await mkdir(destinationDirectory, { recursive: true });
const existing = await supabaseRequest('products?select=slug') as Array<{ slug: string }>;
const existingSlugs = new Set(existing.map((product) => product.slug));
let copied = 0;

for (const [index, draft] of drafts.entries()) {
  const details = kindDetails[draft.kind];
  const images: string[] = [];
  for (const [photoIndex, sourceIndex] of draft.photos.entries()) {
    const filename = `${draft.slug}-${photoIndex + 1}.jpg`;
    await copyFile(path.join(downloadDirectory, sources[sourceIndex]), path.join(destinationDirectory, filename));
    images.push(`/catalog/september-2026/${filename}`);
    copied += 1;
  }
  const product: Product = {
    slug: draft.slug,
    name: draft.name,
    category: details.category,
    collection: draft.collection || details.collection,
    price: details.price,
    compareAt: details.compareAt,
    image: images[0],
    alternate: images[1] || images[0],
    images,
    rating: 0,
    reviews: 0,
    stock: details.stock,
    colors: draft.colors,
    sizes: details.sizes,
    featured: index < 8,
    newArrival: true,
    active: true,
    description: finishDescription(draft),
  };
  try {
    await supabaseRequest('rpc/admin_upsert_product', {
      method: 'POST',
      body: JSON.stringify({
        p_product: product,
        p_original_slug: existingSlugs.has(draft.slug) ? draft.slug : null,
        p_actor_email: 'catalog-import@zyra.pk',
      }),
    });
  } catch (error) {
    throw new Error(`Could not import ${draft.slug}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const catalog = await supabaseRequest('products?select=slug') as Array<{ slug: string }>;
console.log(`Imported ${drafts.length} products with ${copied} images. Catalog now contains ${catalog.length} products.`);
