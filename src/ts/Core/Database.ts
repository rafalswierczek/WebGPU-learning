export class Database
{
    private static instance?: Database;
    private readonly DB_NAME: string = 'vita';
    private readonly MAP_STORE: string = 'map_store';
    private readonly SPRITESHEET_STORE: string = 'spritesheet_store';
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
            const req = indexedDB.open(this.DB_NAME, 1);

            req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(this.MAP_STORE)) {
                    db.createObjectStore(this.MAP_STORE);
                    console.log(`Object store "${this.MAP_STORE}" has been created`);
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

    public async saveSpritesheets(spritesheets: Record<uint, ImageBitmap>): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.SPRITESHEET_STORE, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(this.SPRITESHEET_STORE);

            for (const [id, image] of Object.entries(spritesheets)) {
                store.put(image, id);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async getSpritesheets(): Promise<Record<uint, ImageBitmap>>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.SPRITESHEET_STORE, 'readonly');
            const store: IDBObjectStore = transaction.objectStore(this.SPRITESHEET_STORE);
            const result: Record<uint, ImageBitmap> = {};
            const request = store.openCursor();

            request.onsuccess = (e: Event) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;

                if (cursor) {
                    result[cursor.key as uint] = cursor.value as ImageBitmap;
                    cursor.continue();
                }
            };
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async saveMap(mapBin: Record<string, Blob>): Promise<void>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readwrite');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);

            for (const [chunkName, chunkBlob] of Object.entries(mapBin)) {
                store.put(chunkBlob, chunkName);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    public async getMap(): Promise<Record<string, Blob>>
    {
        const db = this.getDb();

        return new Promise((resolve, reject) => {
            const transaction: IDBTransaction = db.transaction(this.MAP_STORE, 'readonly');
            const store: IDBObjectStore = transaction.objectStore(this.MAP_STORE);
            const result: Record<string, Blob> = {};
            const request = store.openCursor();

            request.onsuccess = (e: Event) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;

                if (cursor) {
                    result[cursor.key.toString()] = cursor.value as Blob;
                    cursor.continue();
                }
            };
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
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
