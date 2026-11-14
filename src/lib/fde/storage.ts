'use client';
/** Browser storage for workspaces: metadata in localStorage, evidence files in IndexedDB. Every call tolerates storage being blocked or empty. */
import {
  ImplementationPlaybookSchema,
  type ImplementationPlaybook,
} from '../../schemas/implementation.schema';
import { withBase } from '../site';
import { verifyHistory, WORKSPACE_VERSION, type Workspace } from './workspace';
import { toHex } from './sha256';

const KEY = 'bs-fde-workspaces-v1';
const ACTIVE = 'bs-fde-active-v1';

export function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Workspace[];
    return Array.isArray(list)
      ? list.filter((w) => w?.version === WORKSPACE_VERSION && Array.isArray(w.history))
      : [];
  } catch {
    return [];
  }
}
export function saveWorkspaces(list: Workspace[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
export const getActive = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE);
  } catch {
    return null;
  }
};
export const setActive = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ACTIVE, id);
    else localStorage.removeItem(ACTIVE);
  } catch {
    /* storage unavailable */
  }
};

/** Parse an exported workspace, refusing a file whose history chain does not verify. */
export function parseWorkspaceFile(
  text: string,
): { ok: true; workspace: Workspace } | { ok: false; reason: string } {
  let w: Workspace;
  try {
    w = JSON.parse(text) as Workspace;
  } catch {
    return { ok: false, reason: 'The file is not valid JSON.' };
  }
  if (
    w?.version !== WORKSPACE_VERSION ||
    typeof w.id !== 'string' ||
    typeof w.slug !== 'string' ||
    !Array.isArray(w.history)
  )
    return { ok: false, reason: 'This is not a BrainSiphon workspace export.' };
  const v = verifyHistory(w);
  if (!v.ok)
    return {
      ok: false,
      reason: `The change history was altered at entry ${v.brokenAt}; refusing to import it.`,
    };
  return { ok: true, workspace: w };
}

const playbooks = new Map<string, Promise<ImplementationPlaybook>>();
/** The playbook JSON published beside the site (`/implementation/<slug>.json`), validated. */
export function fetchPlaybook(slug: string): Promise<ImplementationPlaybook> {
  let p = playbooks.get(slug);
  if (!p) {
    p = fetch(withBase(`/implementation/${slug}.json`)).then(async (r) => {
      if (!r.ok) throw new Error(`No implementation playbook for ${slug} (HTTP ${r.status})`);
      return ImplementationPlaybookSchema.parse(await r.json());
    });
    p.catch(() => playbooks.delete(slug));
    playbooks.set(slug, p);
  }
  return p;
}

/* ---- evidence files */
const DB = 'bs-fde-evidence';
const open = (): Promise<IDBDatabase> =>
  new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'key' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
const tx = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((res, rej) => {
    const r = f(db.transaction('files', mode).objectStore('files'));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
};
export const putEvidenceFile = (wsId: string, evId: string, file: Blob, name: string) =>
  tx('readwrite', (s) => s.put({ key: `${wsId}/${evId}`, name, blob: file }));
export const getEvidenceFile = (wsId: string, evId: string) =>
  tx<{ name: string; blob: Blob } | undefined>('readonly', (s) => s.get(`${wsId}/${evId}`));
export const sha256File = async (file: Blob): Promise<string> =>
  toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())));

export function download(name: string, data: BlobPart, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
