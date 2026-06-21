/** In-memory AsyncStorage stand-in for tests (aliased via vitest.config). */
const mem = new Map<string, string>();

const AsyncStorageMock = {
  getItem: async (key: string): Promise<string | null> =>
    mem.has(key) ? mem.get(key)! : null,
  setItem: async (key: string, value: string): Promise<void> => {
    mem.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    mem.delete(key);
  },
  clear: async (): Promise<void> => {
    mem.clear();
  },
};

export default AsyncStorageMock;
