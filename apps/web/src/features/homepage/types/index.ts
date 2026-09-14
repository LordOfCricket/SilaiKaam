export interface NavLink {
  label: string;
  href: string;
}

export type FitProblemVariant = 'sleeve' | 'waist' | 'shoulder' | 'trouser';

export interface FitProblem {
  id: FitProblemVariant;
  figure: string;
  title: string;
  description: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export type ProductCategoryId = 'shirt' | 'trouser' | 'kurta' | 'dress' | 'blazer' | 'traditional';

export interface Product {
  id: string;
  name: string;
  category: ProductCategoryId;
  categoryLabel: string;
  price: number;
  sizes: string[];
  fitScore: number;
  fitScoreLabel: string;
  badge?: string;
}

export interface Category {
  id: ProductCategoryId;
  label: string;
  description: string;
}

export type FittingJourneyId = 'buy-and-fit' | 'existing-clothes';

export interface FittingJourney {
  id: FittingJourneyId;
  eyebrow: string;
  title: string;
  narrative: string;
  steps: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface TrustPillar {
  number: string;
  title: string;
  description: string;
}

export interface Review {
  id: string;
  quote: string;
  name: string;
  garmentType: string;
  rating: number;
  location?: string;
}

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
