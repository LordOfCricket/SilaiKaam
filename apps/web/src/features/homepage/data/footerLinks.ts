import type { FooterColumn } from '../types';

// Links with no `href` are honest placeholders — the destination doesn't exist yet.
export const footerColumns: FooterColumn[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Marketplace', href: '#marketplace' },
      { label: 'Fitting', href: '#fitting-options' },
      { label: 'The Fit Problem', href: '#fit-problem' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Buy + Fit', href: '#fitting-options' },
      { label: 'Existing Clothes Fitting', href: '#fitting-options' },
      { label: 'Fit Profile' },
      { label: 'Custom Stitching' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Standard', href: '#quality-standard' },
      { label: 'Customer Stories', href: '#stories' },
      { label: 'How It Works', href: '#how-it-works' },
    ],
  },
  {
    title: 'Support',
    links: [{ label: 'Help' }, { label: 'Contact' }, { label: 'FAQs' }],
  },
];
