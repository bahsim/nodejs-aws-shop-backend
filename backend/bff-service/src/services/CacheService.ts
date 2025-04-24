export class CacheService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private ttl: number;

  constructor(ttlSeconds: number) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, value: any): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
}
