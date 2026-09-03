export type Product = {
  slug: string;
  name: string;
  category: string;
  collection: string;
  price: number;
  compareAt?: number;
  image: string;
  alternate: string;
  rating: number;
  reviews: number;
  stock: number;
  colors: string[];
  sizes: string[];
  featured?: boolean;
  newArrival?: boolean;
  description: string;
};
const names = [
  'Signal Heavy Tee',
  'Afterdark Hoodie',
  'Studio Overshirt',
  'Volume Essential',
  'Concrete Box Tee',
  'Night Shift Zip',
  'Transit Cargo',
  'Static Sweatshirt',
  'Frequency Tee',
  'Cutline Trouser',
  'Nocturne Hoodie',
  'Grid Knit',
  'Division Tee',
  'Relay Cargo',
  'Frame Overshirt',
  'Echo Crew',
  'Axis Heavy Tee',
  'Dusk Track Pant',
  'Outline Hoodie',
  'Field Jacket',
  'Mono Longsleeve',
  'Sector Short',
  'Phase Sweatshirt',
  'Blank Canvas Tee',
];
const categoryNames = [
  'Oversized Tees',
  'Hoodies',
  'Outerwear',
  'Essentials',
  'Bottoms',
  'Sweatshirts',
];
const images = [
  '/product-tee.jpg',
  '/product-hoodie.jpg',
  '/product-rack.jpg',
  '/campaign.jpg',
  '/collection-store.jpg',
  '/collection-studio.jpg',
];
export const products: Product[] = names.map((name, index) => {
  const price = 199000 + (index % 6) * 45000;
  return {
    slug: name.toLowerCase().replaceAll(' ', '-'),
    name,
    category: categoryNames[index % categoryNames.length],
    collection:
      index % 3 === 0
        ? 'After Hours'
        : index % 3 === 1
          ? 'Core Forms'
          : 'City Utility',
    price,
    compareAt: index % 3 !== 2 ? price + 60000 : undefined,
    image: images[index % images.length],
    alternate: images[(index + 2) % images.length],
    rating: Number((4.6 + (index % 4) * 0.1).toFixed(1)),
    reviews: index % 5 === 0 ? 0 : 3 + index,
    stock: index === 17 ? 0 : index % 7 === 0 ? 3 : 8 + index,
    colors: index % 2 ? ['Obsidian', 'Bone'] : ['Washed Black', 'Concrete'],
    sizes: ['S', 'M', 'L', 'XL'],
    featured: index < 8,
    newArrival: index >= 16,
    description:
      'A considered everyday layer cut with a relaxed silhouette, reinforced seams and a substantial hand-feel. Designed in Karachi and made for repeat wear.',
  };
});
export const categories = [
  { name: 'Oversized Tees', slug: 'oversized-tees', image: '/product-tee.jpg' },
  { name: 'Hoodies', slug: 'hoodies', image: '/product-hoodie.jpg' },
  { name: 'Outerwear', slug: 'outerwear', image: '/campaign.jpg' },
  { name: 'Essentials', slug: 'essentials', image: '/product-rack.jpg' },
  { name: 'Bottoms', slug: 'bottoms', image: '/collection-studio.jpg' },
  { name: 'Sweatshirts', slug: 'sweatshirts', image: '/collection-store.jpg' },
];
export const money = (minor: number) =>
  `Rs. ${(minor / 100).toLocaleString('en-PK')}`;
export const productBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);
