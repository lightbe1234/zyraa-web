export type HomeCollectionCard = {
  key: string;
  eyebrow: string;
  title: string;
  image: string;
  collectionSlug: string;
  sortOrder: number;
  enabled: boolean;
};

export const defaultHomeCollectionCards: HomeCollectionCard[] = [
  {
    key: 'featured-one',
    eyebrow: 'Collection / 001',
    title: 'Anime Collection',
    image: '/anime-collection.jpeg',
    collectionSlug: 'outerwear',
    sortOrder: 1,
    enabled: true,
  },
  {
    key: 'featured-two',
    eyebrow: 'Collection / 002',
    title: 'Street Wear',
    image: '/street-wear.jpeg',
    collectionSlug: 'hoodies',
    sortOrder: 2,
    enabled: true,
  },
];
