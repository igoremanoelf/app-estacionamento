import { Timestamp } from 'firebase/firestore';

/**
 * Base de dados local (em memória, persistida no dispositivo).
 *
 * Implementa o subconjunto da API do Cloud Firestore usado pela app
 * (collection, doc, query/where, getDoc(s), setDoc, updateDoc, writeBatch,
 * runTransaction, onSnapshot, arrayUnion, arrayRemove, increment,
 * serverTimestamp). Assim, os serviços e os ecrãs usam exatamente o mesmo
 * código nos dois modos e a troca para o Firebase é só de configuração.
 *
 * Os documentos ficam num Map por coleção ("parks/P1/spots" -> id -> dados)
 * e são gravados em JSON no armazenamento local (AsyncStorage) sempre que
 * mudam. Os listeners (onSnapshot) são notificados depois de cada escrita,
 * o que mantém todas as vistas sincronizadas.
 *
 * Este ficheiro não depende de React Native para poder ser testado em Node.
 */

export type DocData = Record<string, unknown>;

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class LocalDbError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------- referências

export class CollectionRef {
  readonly type = 'collection' as const;
  constructor(readonly path: string) {}
  get id(): string {
    return this.path.split('/').at(-1)!;
  }
}

export class DocRef {
  readonly type = 'document' as const;
  constructor(
    readonly collectionPath: string,
    readonly id: string,
  ) {}
  get path(): string {
    return `${this.collectionPath}/${this.id}`;
  }
  get parent(): CollectionRef {
    return new CollectionRef(this.collectionPath);
  }
}

export type WhereOp = '==' | '!=' | 'in' | 'not-in' | '<' | '<=' | '>' | '>=' | 'array-contains';

export interface Filter {
  field: string;
  op: WhereOp;
  value: unknown;
}

export class Query {
  readonly type = 'query' as const;
  constructor(
    readonly collection: CollectionRef,
    readonly filters: Filter[],
  ) {}
}

// ------------------------------------------------------------------ snapshots

export class DocSnapshot {
  constructor(
    readonly ref: DocRef,
    private readonly value: DocData | undefined,
  ) {}
  get id(): string {
    return this.ref.id;
  }
  exists(): boolean {
    return this.value !== undefined;
  }
  data(): DocData | undefined {
    return this.value === undefined ? undefined : clone(this.value);
  }
}

export class QuerySnapshot {
  constructor(readonly docs: DocSnapshot[]) {}
  get size(): number {
    return this.docs.length;
  }
  get empty(): boolean {
    return this.docs.length === 0;
  }
  forEach(cb: (d: DocSnapshot) => void): void {
    this.docs.forEach(cb);
  }
}

// ------------------------------------------------------------------ sentinelas

const SENTINEL = '__localSentinel';
type Sentinel =
  | { [SENTINEL]: 'serverTimestamp' }
  | { [SENTINEL]: 'increment'; by: number }
  | { [SENTINEL]: 'arrayUnion'; items: unknown[] }
  | { [SENTINEL]: 'arrayRemove'; items: unknown[] }
  | { [SENTINEL]: 'delete' };

export const serverTimestamp = (): unknown => ({ [SENTINEL]: 'serverTimestamp' });
export const increment = (by: number): unknown => ({ [SENTINEL]: 'increment', by });
export const arrayUnion = (...items: unknown[]): unknown => ({ [SENTINEL]: 'arrayUnion', items });
export const arrayRemove = (...items: unknown[]): unknown => ({ [SENTINEL]: 'arrayRemove', items });
export const deleteField = (): unknown => ({ [SENTINEL]: 'delete' });

function isSentinel(v: unknown): v is Sentinel {
  return typeof v === 'object' && v !== null && SENTINEL in v;
}

/** Aplica valores especiais (incremento, arrayUnion, ...) sobre o valor atual. */
function resolveValue(current: unknown, v: unknown): unknown {
  if (!isSentinel(v)) return clone(v);
  switch (v[SENTINEL]) {
    case 'serverTimestamp':
      return Timestamp.now();
    case 'increment':
      return (typeof current === 'number' ? current : 0) + v.by;
    case 'arrayUnion': {
      const arr = Array.isArray(current) ? [...current] : [];
      for (const it of v.items) if (!arr.some((x) => deepEqual(x, it))) arr.push(clone(it));
      return arr;
    }
    case 'arrayRemove': {
      const arr = Array.isArray(current) ? current : [];
      return arr.filter((x) => !v.items.some((it) => deepEqual(x, it)));
    }
    case 'delete':
      return undefined;
  }
}

function applyFields(base: DocData, fields: DocData): DocData {
  const out: DocData = { ...base };
  for (const [k, v] of Object.entries(fields)) {
    const resolved = resolveValue(out[k], v);
    if (resolved === undefined) delete out[k];
    else out[k] = resolved;
  }
  return out;
}

// ----------------------------------------------------------- utilitários dados

export function clone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Timestamp) return v; // imutável
  if (Array.isArray(v)) return v.map(clone) as T;
  const out: DocData = {};
  for (const [k, x] of Object.entries(v as DocData)) if (x !== undefined) out[k] = clone(x);
  return out as T;
}

function comparable(v: unknown): unknown {
  return v instanceof Timestamp ? v.toMillis() : v;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  a = comparable(a);
  b = comparable(b);
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as DocData);
  const kb = Object.keys(b as DocData);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as DocData)[k], (b as DocData)[k]));
}

function getField(data: DocData, field: string): unknown {
  return field.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as DocData)[k] : undefined), data);
}

function matches(data: DocData, f: Filter): boolean {
  const v = comparable(getField(data, f.field));
  const target = comparable(f.value);
  switch (f.op) {
    case '==':
      return deepEqual(v, target);
    case '!=':
      return !deepEqual(v, target);
    case 'in':
      return (f.value as unknown[]).some((x) => deepEqual(v, x));
    case 'not-in':
      return !(f.value as unknown[]).some((x) => deepEqual(v, x));
    case 'array-contains':
      return Array.isArray(v) && v.some((x) => deepEqual(x, f.value));
    case '<':
      return (v as number) < (target as number);
    case '<=':
      return (v as number) <= (target as number);
    case '>':
      return (v as number) > (target as number);
    case '>=':
      return (v as number) >= (target as number);
  }
}

/** JSON com Timestamps: { "__ts": [segundos, nanossegundos] }. */
export function serialize(state: Record<string, Record<string, DocData>>): string {
  return JSON.stringify(state, function (this: DocData, key, value) {
    const raw = this[key];
    if (raw instanceof Timestamp) return { __ts: [raw.seconds, raw.nanoseconds] };
    return value;
  });
}

export function deserialize(json: string): Record<string, Record<string, DocData>> {
  return JSON.parse(json, (_k, v) => {
    if (v && typeof v === 'object' && Array.isArray(v.__ts)) return new Timestamp(v.__ts[0], v.__ts[1]);
    return v;
  });
}

const AUTO_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function autoId(): string {
  let s = '';
  for (let i = 0; i < 20; i++) s += AUTO_ID[Math.floor(Math.random() * AUTO_ID.length)];
  return s;
}

// ---------------------------------------------------------------- base de dados

type Write =
  | { kind: 'set'; ref: DocRef; data: DocData; merge: boolean }
  | { kind: 'update'; ref: DocRef; data: DocData }
  | { kind: 'delete'; ref: DocRef };

interface Listener {
  target: DocRef | Query | CollectionRef;
  last: string | null;
  next: (snap: DocSnapshot | QuerySnapshot) => void;
}

export type Seed = () => Record<string, Record<string, DocData>>;

export interface LocalDbOptions {
  storage?: StorageAdapter;
  key?: string;
  seed?: Seed;
  /** atraso da notificação dos listeners (simula a latência da rede) */
  notifyDelayMs?: number;
}

export class LocalDb {
  private collections = new Map<string, Map<string, DocData>>();
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  readonly ready: Promise<void>;

  constructor(private readonly opts: LocalDbOptions = {}) {
    this.ready = this.load();
  }

  // ----- carregamento / persistência

  private async load(): Promise<void> {
    const { storage, key, seed } = this.opts;
    let loaded = false;
    if (storage && key) {
      try {
        const json = await storage.getItem(key);
        if (json) {
          this.replaceAll(deserialize(json));
          loaded = true;
        }
      } catch {
        // dados corrompidos: volta aos dados de demonstração
      }
    }
    if (!loaded && seed) {
      this.replaceAll(seed());
      this.scheduleSave();
    }
  }

  private replaceAll(state: Record<string, Record<string, DocData>>): void {
    this.collections.clear();
    for (const [path, docs] of Object.entries(state)) this.collections.set(path, new Map(Object.entries(docs)));
  }

  /** Estado completo (útil para testes e para exportar). */
  dump(): Record<string, Record<string, DocData>> {
    const out: Record<string, Record<string, DocData>> = {};
    for (const [path, docs] of this.collections) out[path] = Object.fromEntries(docs);
    return out;
  }

  private scheduleSave(): void {
    const { storage, key } = this.opts;
    if (!storage || !key) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      storage.setItem(key, serialize(this.dump())).catch(() => {});
    }, 150);
  }

  /** Repõe os dados de demonstração (apaga tudo o que foi feito na app). */
  async reset(): Promise<void> {
    await this.ready;
    this.replaceAll(this.opts.seed ? this.opts.seed() : {});
    this.scheduleSave();
    this.notify();
  }

  // ----- leitura

  private read(ref: DocRef): DocData | undefined {
    return this.collections.get(ref.collectionPath)?.get(ref.id);
  }

  private snapDoc(ref: DocRef): DocSnapshot {
    return new DocSnapshot(ref, this.read(ref));
  }

  private snapQuery(q: Query | CollectionRef): QuerySnapshot {
    const query = q instanceof Query ? q : new Query(q, []);
    const docs = this.collections.get(query.collection.path) ?? new Map<string, DocData>();
    const out: DocSnapshot[] = [];
    for (const [id, data] of docs) {
      if (query.filters.every((f) => matches(data, f))) out.push(new DocSnapshot(new DocRef(query.collection.path, id), data));
    }
    return new QuerySnapshot(out);
  }

  async getDoc(ref: DocRef): Promise<DocSnapshot> {
    await this.ready;
    return this.snapDoc(ref);
  }

  async getDocs(q: Query | CollectionRef): Promise<QuerySnapshot> {
    await this.ready;
    return this.snapQuery(q);
  }

  // ----- escrita (sempre atómica: aplica todas as escritas ou nenhuma)

  async commit(writes: Write[]): Promise<void> {
    await this.ready;
    // valida primeiro (updateDoc exige que o documento exista)
    const staged = new Map<string, DocData | undefined>();
    const current = (ref: DocRef) => (staged.has(ref.path) ? staged.get(ref.path) : this.read(ref));
    for (const w of writes) {
      if (w.kind === 'delete') staged.set(w.ref.path, undefined);
      else if (w.kind === 'set') staged.set(w.ref.path, applyFields(w.merge ? current(w.ref) ?? {} : {}, w.data));
      else {
        const base = current(w.ref);
        if (!base) throw new LocalDbError('not-found', `Documento não encontrado: ${w.ref.path}`);
        staged.set(w.ref.path, applyFields(base, w.data));
      }
    }
    for (const w of writes) {
      const value = staged.get(w.ref.path);
      let col = this.collections.get(w.ref.collectionPath);
      if (value === undefined) {
        col?.delete(w.ref.id);
      } else {
        if (!col) this.collections.set(w.ref.collectionPath, (col = new Map()));
        col.set(w.ref.id, value);
      }
    }
    this.scheduleSave();
    this.notify();
  }

  async runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    await this.ready;
    const tx = new Transaction(this);
    const result = await fn(tx);
    await this.commit(tx.writes);
    return result;
  }

  // ----- tempo real

  onSnapshot(
    target: DocRef | Query | CollectionRef,
    next: (snap: DocSnapshot | QuerySnapshot) => void,
    error?: (e: Error) => void,
  ): () => void {
    const listener: Listener = { target, last: null, next };
    this.listeners.add(listener);
    this.ready
      .then(() => {
        if (this.listeners.has(listener)) this.emit(listener);
      })
      .catch((e) => error?.(e));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(l: Listener): void {
    const snap = l.target instanceof DocRef ? this.snapDoc(l.target) : this.snapQuery(l.target);
    // só notifica quando o resultado mudou (como o Firestore)
    const sig =
      snap instanceof DocSnapshot
        ? serialize({ d: { v: (snap.data() ?? null) as DocData } })
        : serialize({ d: Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as DocData])) });
    if (sig === l.last) return;
    l.last = sig;
    try {
      l.next(snap);
    } catch {
      // um erro num ecrã não pode parar a base de dados
    }
  }

  private notify(): void {
    const run = () => this.listeners.forEach((l) => this.emit(l));
    const delay = this.opts.notifyDelayMs ?? 0;
    if (delay > 0) setTimeout(run, delay);
    else Promise.resolve().then(run);
  }
}

export class Transaction {
  readonly writes: Write[] = [];
  constructor(private readonly db: LocalDb) {}
  get(ref: DocRef): Promise<DocSnapshot> {
    return this.db.getDoc(ref);
  }
  set(ref: DocRef, data: DocData, opts?: { merge?: boolean }): this {
    this.writes.push({ kind: 'set', ref, data, merge: !!opts?.merge });
    return this;
  }
  update(ref: DocRef, data: DocData): this {
    this.writes.push({ kind: 'update', ref, data });
    return this;
  }
  delete(ref: DocRef): this {
    this.writes.push({ kind: 'delete', ref });
    return this;
  }
}

export class WriteBatch {
  private readonly writes: Write[] = [];
  private done = false;
  constructor(private readonly db: LocalDb) {}
  set(ref: DocRef, data: DocData, opts?: { merge?: boolean }): this {
    this.writes.push({ kind: 'set', ref, data, merge: !!opts?.merge });
    return this;
  }
  update(ref: DocRef, data: DocData): this {
    this.writes.push({ kind: 'update', ref, data });
    return this;
  }
  delete(ref: DocRef): this {
    this.writes.push({ kind: 'delete', ref });
    return this;
  }
  async commit(): Promise<void> {
    if (this.done) throw new LocalDbError('failed-precondition', 'Este batch já foi enviado.');
    this.done = true;
    await this.db.commit(this.writes);
  }
}

// ------------------------------------------------- API ao estilo do Firestore

/**
 * Funções com a mesma assinatura das do SDK modular do Firestore. O primeiro
 * argumento (db) é a instância LocalDb.
 */
export function createFirestoreApi(db: LocalDb) {
  function collection(_db: unknown, ...segments: string[]): CollectionRef {
    return new CollectionRef(segments.join('/'));
  }

  function doc(parent: unknown, ...segments: string[]): DocRef {
    if (parent instanceof CollectionRef) {
      if (segments.length === 0) return new DocRef(parent.path, autoId());
      const all = [parent.path, ...segments].join('/').split('/');
      return new DocRef(all.slice(0, -1).join('/'), all.at(-1)!);
    }
    const all = segments.join('/').split('/');
    if (all.length < 2 || all.length % 2 !== 0) throw new LocalDbError('invalid-argument', `Caminho de documento inválido: ${all.join('/')}`);
    return new DocRef(all.slice(0, -1).join('/'), all.at(-1)!);
  }

  function where(field: string, op: WhereOp, value: unknown): Filter {
    return { field, op, value };
  }

  function query(base: CollectionRef | Query, ...filters: Filter[]): Query {
    return base instanceof Query ? new Query(base.collection, [...base.filters, ...filters]) : new Query(base, filters);
  }

  return {
    db,
    collection,
    doc,
    where,
    query,
    getDoc: (ref: DocRef) => db.getDoc(ref),
    getDocs: (q: Query | CollectionRef) => db.getDocs(q),
    setDoc: (ref: DocRef, data: DocData, opts?: { merge?: boolean }) => db.commit([{ kind: 'set', ref, data, merge: !!opts?.merge }]),
    updateDoc: (ref: DocRef, data: DocData) => db.commit([{ kind: 'update', ref, data }]),
    deleteDoc: (ref: DocRef) => db.commit([{ kind: 'delete', ref }]),
    addDoc: async (col: CollectionRef, data: DocData) => {
      const ref = doc(col);
      await db.commit([{ kind: 'set', ref, data, merge: false }]);
      return ref;
    },
    writeBatch: (_db: unknown) => new WriteBatch(db),
    runTransaction: <T>(_db: unknown, fn: (tx: Transaction) => Promise<T>) => db.runTransaction(fn),
    onSnapshot: (
      target: DocRef | Query | CollectionRef,
      next: (snap: DocSnapshot | QuerySnapshot) => void,
      error?: (e: Error) => void,
    ) => db.onSnapshot(target, next, error),
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    deleteField,
  };
}

export type LocalFirestoreApi = ReturnType<typeof createFirestoreApi>;
