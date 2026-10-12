import { brushConfigJson } from "./Textures/BrushConfigJson";
import { textureRow } from "./Textures/TextureLibrary";

export class Database
{
    private static instance?: Database;
    private readonly DB_NAME: string = 'vita';
    /**
     * IndexedDB wymaga numeru, zeby w ogole zawolac onupgradeneeded - i tylko po to tu jest.
     * Nie sledzi ukladu danych; zmiana formatu = skasowanie bazy w narzedziach przegladarki.
     *
     * NIE WOLNO go zmniejszac: przegladarka odmawia otwarcia bazy numerem nizszym niz zapisany
     * i wywala VersionError. Stad zostaje tam, gdzie doszedl.
     */
    private readonly DB_VERSION: uint = 8;
    private readonly MAP_STORE: string = 'map_store';
    private readonly TEXTURE_STORE: string = 'texture_store';
    private readonly REGISTRY_STORE: string = 'registry_store';
    private readonly SETTINGS_STORE: string = 'settings_store';
    private readonly MAP_META_STORE: string = 'map_meta_store';
    private db: IDBDatabase|null = null;
    private initPromise?: Promise<void>;

    private constructor()
    {
    }

    public static getInstance(): Database
    {
        if (!this.instance) {
            this.instance = new Database();
        }

        return this.instance;
    }

    public async init(): Promise<void>
    {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;

                // Bez migracji: zmiana ukladu danych = skasowanie bazy w przegladarce.
                // Wersjonowanie przyjdzie razem z gra, ktora ma zapisy warte utrzymywania.
                for (const store of [
                    this.MAP_STORE,
                    this.TEXTURE_STORE,
                    this.REGISTRY_STORE,
                    this.SETTINGS_STORE,
                    this.MAP_META_STORE,
                ]) {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store);
                        console.log(`Object store "${store}" has been created`);
                    }
                }
            };

            req.onsuccess = (e: Event) => {
                this.db = (e.target as IDBOpenDBRequest).result;
                resolve();
            };
            req.onerror = () => {
                this.initPromise = undefined;
                reject(req.error?.message);
            }
            req.onblocked = () => {
                reject('Database open blocked');
            };
        });

        return this.initPromise;
    }

    /**
     * Wiersze tekstur w jednej transakcji: klucz to sciezka w drzewie, wartosc to png i config.
     *
     * Sciezka jako klucz daje za darmo dwie rzeczy: odtworzenie drzewa (rozbicie po "/")
     * i naturalne sortowanie kursora, wiec wiersze wracaja z bazy w kolejnosci alfabetycznej.
     */
    public async saveTextureRows(rows: textureRow[]): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.TEXTURE_STORE, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(this.TEXTURE_STORE);

            for (const row of rows) {
                store.put({ texture: row.texture, config: row.config }, row.path);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async getTextureRows(): Promise<textureRow[]>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.TEXTURE_STORE, 'readonly');
            const store: IDBObjectStore = transaction.objectStore(this.TEXTURE_STORE);
            const rows: textureRow[] = [];
            const request = store.openCursor();

            request.onsuccess = (e: Event) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;

                if (cursor) {
                    const value = cursor.value as { texture: Blob, config: brushConfigJson|null };

                    rows.push({ path: String(cursor.key), texture: value.texture, config: value.config });
                    cursor.continue();
                }
            };
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => resolve(rows);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async clearTextures(): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.TEXTURE_STORE, 'readwrite');

            transaction.objectStore(this.TEXTURE_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    /**
     * Zapisuje chunki w jednej transakcji. Klucz to indeks chunka, wartość to zakodowany plik VTMP.
     * Zapisujemy tylko przekazane chunki, więc edycja jednego kafla to zapis jednego rekordu.
     */
    public async saveChunks(chunks: Map<uint, ArrayBuffer>): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);

            for (const [chunkIndex, buffer] of chunks) {
                store.put(buffer, chunkIndex);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    /**
     * Czyta wszystkie chunki jednym kursorem, a nie osobnym zapytaniem na chunk.
     * Kursor to jedno żądanie, które przechodzi po rekordach - narzut nie rośnie z liczbą chunków.
     */
    public async getAllChunks(): Promise<Map<uint, ArrayBuffer>>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readonly');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);
            const result: Map<uint, ArrayBuffer> = new Map<uint, ArrayBuffer>();
            const request = store.openCursor();

            request.onsuccess = (e: Event) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;

                if (cursor) {
                    result.set(Number(cursor.key) as uint, cursor.value as ArrayBuffer);
                    cursor.continue();
                }
            };
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async getChunk(chunkIndex: uint): Promise<ArrayBuffer|null>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readonly');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);
            const request = store.get(chunkIndex);

            request.onsuccess = () => resolve((request.result as ArrayBuffer|undefined) ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    public async deleteChunks(chunkIndexes: uint[]): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);

            for (const chunkIndex of chunkIndexes) {
                store.delete(chunkIndex);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async clearMap(): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readwrite');

            transaction.objectStore(this.MAP_STORE).clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    /** Rejestry tile i obiektow siedza w jednym magazynie pod roznymi kluczami */
    public async saveRegistry(key: string, buffer: ArrayBuffer): Promise<void>
    {
        return this.put(this.REGISTRY_STORE, key, buffer);
    }

    public async getRegistry(key: string): Promise<ArrayBuffer|null>
    {
        return this.get<ArrayBuffer>(this.REGISTRY_STORE, key);
    }

    /** Ustawienia gry pod jednym kluczem: wspolne dla gry i edytora mapy */
    public async saveSettings(record: Record<string, uint>): Promise<void>
    {
        return this.put(this.SETTINGS_STORE, 'settings', record);
    }

    public async getSettings(): Promise<Record<string, uint>|null>
    {
        return this.get<Record<string, uint>>(this.SETTINGS_STORE, 'settings');
    }

    /** Numer wersji mapy rosnie z kazdym zapisem; edytor pokazuje go w pasku menu */
    public async saveMapVersion(version: uint): Promise<void>
    {
        return this.put(this.MAP_META_STORE, 'version', version);
    }

    public async getMapVersion(): Promise<uint|null>
    {
        return this.get<uint>(this.MAP_META_STORE, 'version');
    }

    private async put(store: string, key: string, value: unknown): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(store, 'readwrite');

            transaction.objectStore(store).put(value, key);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    private async get<T>(store: string, key: string): Promise<T|null>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(store, 'readonly');
            const request = transaction.objectStore(store).get(key);

            request.onsuccess = () => resolve((request.result as T|undefined) ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    public closeDb(): void
    {
        this.getDb().close();
        this.db = null;
    }

    private getDb(): IDBDatabase
    {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }

        return this.db;
    }
}
