import type { IngredientDef, IngredientKind } from '@line-war/sim';

export const INGREDIENTS: Record<IngredientKind, IngredientDef> = {
  lettuce: { kind: 'lettuce', name: 'Lettuce', premium: false, choppable: true, cook: null },
  tomato: { kind: 'tomato', name: 'Tomato', premium: false, choppable: true, cook: { vessel: 'pot', from: 'chopped' } },
  bun: { kind: 'bun', name: 'Bun', premium: false, choppable: false, cook: null },
  meat: { kind: 'meat', name: 'Meat', premium: false, choppable: false, cook: { vessel: 'pan', from: 'raw' } },
  steak: { kind: 'steak', name: 'Steak', premium: true, choppable: false, cook: { vessel: 'pan', from: 'raw' } },
  fish: { kind: 'fish', name: 'Fish', premium: true, choppable: false, cook: { vessel: 'pan', from: 'raw' } },
};
