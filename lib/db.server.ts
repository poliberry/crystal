// This file is server-only and should never be imported on the client
import { ScyllaDBAdapter } from "./scylla-adapter";

declare global {
  var scyllaDb: ScyllaDBAdapter | undefined;
}

export const db = globalThis.scyllaDb || new ScyllaDBAdapter();

if (process.env.NODE_ENV !== "production") globalThis.scyllaDb = db;
