import {validOwnerTaste,type Planet} from './owner-taste-level';

/** Check owner writes against a fresh, store-scoped dashboard read. */
type Row = Record<string, unknown>;
const row = (value: unknown): Row | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Row : null;

export type OwnerWriteExpectation =
  | {action:'status'; value:string}
  | {action:'soldout'; menuId:string; soldout:boolean}
  | {action:'taste'; menuId:string; level:number; flavor:string; category:string}
  | {action:'register'; menuId:string; name:string; price:number; level:number; flavor:string; category:string; photoPath:string};

export function ownerSaveReadbackMatches(snapshot: unknown, storeId: string,
  expected: OwnerWriteExpectation, planet: Planet = 'hot'): boolean {
  // Readback rejects out-of-range persisted and expected heat by planet: HOT 1..7, SWEET/RICH 1..5.
  if ((expected.action === 'taste' || expected.action === 'register') &&
      !validOwnerTaste(planet, expected.level)) return false;
  const root = row(snapshot);
  if (!root || root.storeId !== storeId || row(root.access)?.enabled !== true) return false;
  const state = row(root.state);
  if (!state) return false;
  if (expected.action === 'status') return row(state.status)?.value === expected.value;
  if (!Array.isArray(state.menus)) return false;
  // Duplicate menu IDs are ambiguous: never acknowledge an owner write.
  const matches = state.menus.map(row).filter((item): item is Row =>
    item !== null && item.id === expected.menuId);
  if (matches.length !== 1) return false;
  const menu = matches[0];
  if (expected.action === 'soldout') return menu.soldout === expected.soldout;
  if ((expected.action === 'taste' || expected.action === 'register') &&
      !validOwnerTaste(planet, menu.level)) return false;
  if (expected.action === 'taste') return menu.level === expected.level &&
    menu.flavor === expected.flavor && menu.category === expected.category;
  return menu.name === expected.name && menu.price === expected.price &&
    menu.level === expected.level && menu.flavor === expected.flavor &&
    menu.category === expected.category && menu.photoPath === expected.photoPath;
}
