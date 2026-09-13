/**
 * Read and write nested IVMS101 values by JSON path, so the quick-edit form and
 * the raw JSON editor can stay in sync over one object.
 */
const STEP = /([^.[\]]+)|\[(\d+)\]/g;

function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  for (const m of path.matchAll(STEP)) {
    parts.push(m[1] !== undefined ? m[1] : Number(m[2]));
  }
  return parts;
}

export function getAt(root: unknown, path: string): unknown {
  let node: any = root;
  for (const key of parsePath(path)) {
    if (node == null) return undefined;
    node = node[key as keyof typeof node];
  }
  return node;
}

/** Immutably set a value, creating objects/arrays along the way as needed. */
export function setAt<T>(root: T, path: string, value: unknown): T {
  const keys = parsePath(path);

  const walk = (node: any, depth: number): any => {
    const key = keys[depth];
    const isLast = depth === keys.length - 1;
    const container = node ?? (typeof key === 'number' ? [] : {});
    const clone = Array.isArray(container) ? [...container] : { ...container };
    clone[key as any] = isLast ? value : walk(clone[key as any], depth + 1);
    return clone;
  };

  return walk(root, 0) as T;
}

const ORIG = 'originator.originatorPerson[0].naturalPerson';
const BENF = 'beneficiary.beneficiaryPerson[0].naturalPerson';

/** The handful of fields worth a form; everything else stays in the JSON editor. */
export const QUICK_FIELDS: { label: string; path: string; group: 'Originator' | 'Beneficiary' }[] = [
  { group: 'Originator', label: 'Last name', path: `${ORIG}.name.nameIdentifier[0].primaryIdentifier` },
  { group: 'Originator', label: 'First name', path: `${ORIG}.name.nameIdentifier[0].secondaryIdentifier` },
  { group: 'Originator', label: 'Date of birth', path: `${ORIG}.dateAndPlaceOfBirth.dateOfBirth` },
  { group: 'Originator', label: 'Street', path: `${ORIG}.geographicAddress[0].addressLine[0]` },
  { group: 'Originator', label: 'Town', path: `${ORIG}.geographicAddress[0].townName` },
  { group: 'Originator', label: 'Country', path: `${ORIG}.geographicAddress[0].country` },
  { group: 'Originator', label: 'Account', path: 'originator.accountNumber' },
  { group: 'Beneficiary', label: 'Last name', path: `${BENF}.name.nameIdentifier[0].primaryIdentifier` },
  { group: 'Beneficiary', label: 'First name', path: `${BENF}.name.nameIdentifier[0].secondaryIdentifier` },
  { group: 'Beneficiary', label: 'Account', path: 'beneficiary.accountNumber' },
];
