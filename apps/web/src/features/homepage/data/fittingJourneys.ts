import type { FittingJourney } from '../types';

export const fittingJourneys: FittingJourney[] = [
  {
    id: 'buy-and-fit',
    eyebrow: 'Buy + Fit Together',
    title: 'Find a garment you love, then make the fit yours.',
    narrative:
      'Discover something new on SilaiKaam and have it measured and fitted to you before it ever reaches your door.',
    steps: ['Discover', 'Choose', 'Fit', 'Wear'],
    ctaLabel: 'Explore & Fit',
    ctaHref: '#marketplace',
  },
  {
    id: 'existing-clothes',
    eyebrow: 'Already Own It? Fit It.',
    title: 'That shirt, trouser, kurta, dress, or jacket in your wardrobe can fit better too.',
    narrative:
      'Bring or send a garment you already own, tell us what needs to change, and our fitting team takes it from there.',
    steps: ['Bring Your Garment', 'Tell Us', 'Measure', 'Expert Fitting'],
    ctaLabel: 'Fit My Clothes',
    ctaHref: '#get-fit',
  },
];
