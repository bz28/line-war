import type { RecipeDef } from '@line-war/sim';

/** First-version menu (design doc: Rules reference > Recipes). */
export const RECIPES: RecipeDef[] = [
  {
    id: 'salad',
    name: 'Salad',
    ingredients: [
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
    premium: false,
    baseValue: 40,
    weight: 3,
  },
  {
    id: 'burger',
    name: 'Burger',
    ingredients: [
      { kind: 'bun', state: 'raw' },
      { kind: 'meat', state: 'cooked' },
    ],
    premium: false,
    baseValue: 60,
    weight: 3,
  },
  {
    id: 'soup',
    name: 'Tomato soup',
    ingredients: [
      { kind: 'tomato', state: 'cooked' },
      { kind: 'tomato', state: 'cooked' },
      { kind: 'tomato', state: 'cooked' },
    ],
    premium: false,
    baseValue: 80,
    weight: 2,
  },
  {
    id: 'steak',
    name: 'Steak',
    ingredients: [
      { kind: 'steak', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
    premium: true,
    baseValue: 100,
    weight: 1.5,
  },
  {
    id: 'fish',
    name: 'Grilled fish',
    ingredients: [
      { kind: 'fish', state: 'cooked' },
      { kind: 'tomato', state: 'chopped' },
    ],
    premium: true,
    baseValue: 100,
    weight: 1.5,
  },
];
