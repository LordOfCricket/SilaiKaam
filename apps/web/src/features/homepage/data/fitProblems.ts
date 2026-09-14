import type { FitProblem } from '../types';

export const fitProblems: FitProblem[] = [
  {
    id: 'sleeve',
    figure: 'Fig. 01',
    title: 'Sleeves run long',
    description: 'The size is right, but the cuff sits past the wrist instead of at it.',
  },
  {
    id: 'waist',
    figure: 'Fig. 02',
    title: 'Waist sits wrong',
    description: 'Loose enough to gather, or tight enough to pull — rarely just right.',
  },
  {
    id: 'shoulder',
    figure: 'Fig. 03',
    title: 'Shoulders misalign',
    description: 'The seam falls short of — or past — where your shoulder actually breaks.',
  },
  {
    id: 'trouser',
    figure: 'Fig. 04',
    title: 'Trousers pool',
    description: 'Off-the-rack lengths are a guess. Yours is rarely the average.',
  },
];
