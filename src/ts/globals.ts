function empty(obj: Record<PropertyKey, unknown>): boolean {
    for (const _ in obj) return false;
    return true;
}

(globalThis as any).empty = empty;
