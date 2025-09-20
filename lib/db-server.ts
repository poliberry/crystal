import { ScyllaDBAdapter } from "./scylla-adapter";

declare global {
  var scyllaDb: ScyllaDBAdapter | undefined;
}

// Only create the adapter on the server side
let dbInstance: ScyllaDBAdapter | null = null;

if (typeof window === 'undefined') {
  // Server-side only
  dbInstance = globalThis.scyllaDb || new ScyllaDBAdapter();
  if (process.env.NODE_ENV !== "production") {
    globalThis.scyllaDb = dbInstance;
  }
}

export const db = dbInstance as ScyllaDBAdapter;
