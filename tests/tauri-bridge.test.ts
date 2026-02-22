/**
 * Unit tests for lib/tauri-bridge.ts
 *
 * Tests the TypeScript bridge in a plain Node.js environment (no browser, no
 * Tauri runtime) using Node's built-in test runner (node:test / node:assert).
 *
 * Run with:
 *   node --experimental-strip-types tests/tauri-bridge.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Minimal browser-like global shim so the module can be imported in Node.
// We do NOT inject __TAURI__ — that simulates the "running in browser" path.
// ---------------------------------------------------------------------------
(globalThis as any).window = globalThis;

// Dynamic import after global shim so module-level `typeof window` check works.
const {
  isTauriRuntime,
  checkPipewireAvailable,
  getAudioOutputNodes,
  startPipewireAudioCapture,
  stopPipewireAudioCapture,
} = await import("../lib/tauri-bridge.ts");

// ---------------------------------------------------------------------------
// isTauriRuntime
// ---------------------------------------------------------------------------

test("isTauriRuntime returns false when __TAURI__ is absent", () => {
  delete (globalThis as any).__TAURI__;
  assert.equal(isTauriRuntime(), false);
});

test("isTauriRuntime returns true when __TAURI__ is present", () => {
  (globalThis as any).__TAURI__ = { invoke: async () => {} };
  assert.equal(isTauriRuntime(), true);
  delete (globalThis as any).__TAURI__;
});

// ---------------------------------------------------------------------------
// Bridge no-ops when NOT in Tauri
// ---------------------------------------------------------------------------

test("checkPipewireAvailable returns false outside Tauri", async () => {
  delete (globalThis as any).__TAURI__;
  const result = await checkPipewireAvailable();
  assert.equal(result, false);
});

test("getAudioOutputNodes returns [] outside Tauri", async () => {
  delete (globalThis as any).__TAURI__;
  const result = await getAudioOutputNodes();
  assert.deepEqual(result, []);
});

test("startPipewireAudioCapture is a no-op outside Tauri", async () => {
  delete (globalThis as any).__TAURI__;
  await assert.doesNotReject(() => startPipewireAudioCapture("42"));
});

test("stopPipewireAudioCapture is a no-op outside Tauri", async () => {
  delete (globalThis as any).__TAURI__;
  await assert.doesNotReject(() => stopPipewireAudioCapture());
});

// ---------------------------------------------------------------------------
// Bridge delegates to __TAURI__.invoke when in Tauri
// ---------------------------------------------------------------------------

test("checkPipewireAvailable calls invoke with correct command", async () => {
  let capturedCommand: string | null = null;
  (globalThis as any).__TAURI__ = {
    invoke: async (cmd: string) => {
      capturedCommand = cmd;
      return true;
    },
  };

  const result = await checkPipewireAvailable();
  assert.equal(result, true);
  assert.equal(capturedCommand, "check_pipewire_available");
  delete (globalThis as any).__TAURI__;
});

test("getAudioOutputNodes calls invoke with correct command", async () => {
  const fakeNodes = [{ id: "1", name: "test-sink", description: "Test Sink" }];
  let capturedCommand: string | null = null;
  (globalThis as any).__TAURI__ = {
    invoke: async (cmd: string) => {
      capturedCommand = cmd;
      return fakeNodes;
    },
  };

  const result = await getAudioOutputNodes();
  assert.deepEqual(result, fakeNodes);
  assert.equal(capturedCommand, "get_audio_output_nodes");
  delete (globalThis as any).__TAURI__;
});

test("startPipewireAudioCapture passes nodeId to invoke", async () => {
  let capturedArgs: Record<string, unknown> | undefined;
  (globalThis as any).__TAURI__ = {
    invoke: async (_cmd: string, args?: Record<string, unknown>) => {
      capturedArgs = args;
    },
  };

  await startPipewireAudioCapture("alsa_output.pci-0");
  assert.deepEqual(capturedArgs, { nodeId: "alsa_output.pci-0" });
  delete (globalThis as any).__TAURI__;
});

test("stopPipewireAudioCapture silences invoke errors", async () => {
  (globalThis as any).__TAURI__ = {
    invoke: async () => {
      throw new Error("simulated backend error");
    },
  };

  // Must not throw — errors are swallowed for best-effort cleanup.
  await assert.doesNotReject(() => stopPipewireAudioCapture());
  delete (globalThis as any).__TAURI__;
});

test("checkPipewireAvailable returns false when invoke throws", async () => {
  (globalThis as any).__TAURI__ = {
    invoke: async () => {
      throw new Error("IPC error");
    },
  };

  const result = await checkPipewireAvailable();
  assert.equal(result, false);
  delete (globalThis as any).__TAURI__;
});

test("getAudioOutputNodes returns [] when invoke throws", async () => {
  (globalThis as any).__TAURI__ = {
    invoke: async () => {
      throw new Error("IPC error");
    },
  };

  const result = await getAudioOutputNodes();
  assert.deepEqual(result, []);
  delete (globalThis as any).__TAURI__;
});
