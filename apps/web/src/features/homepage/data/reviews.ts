import type { Review } from '../types';

// Sample/demo content — SilaiKaam does not yet have a live review system.
export const reviews: Review[] = [
  {
    id: 'r1',
    quote: 'The kurta fit like it was made for me — the sleeves finally sat right.',
    name: 'Ananya R.',
    garmentType: 'Hand-Embroidered Kurta',
    rating: 5,
    location: 'Bengaluru',
  },
  {
    id: 'r2',
    quote:
      'I sent in a blazer that never sat right on the shoulders. It came back completely different — actually mine now.',
    name: 'Vikram S.',
    garmentType: 'Structured Blazer',
    rating: 5,
    location: 'Mumbai',
  },
  {
    id: 'r3',
    quote:
      'Trouser length has always been a guess for me. SilaiKaam actually asked, and got it right.',
    name: 'Priya M.',
    garmentType: 'Wool Trousers',
    rating: 4,
    location: 'Delhi',
  },
];
