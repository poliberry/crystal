/**
 * Typed TypeScript bridge for Crystal's Tauri backend commands.
 *
 * All functions are no-ops when not running inside Tauri so they can be
 * imported unconditionally from any component.
 */

export interface TauriAudioOutputNode {
  id: string;
  name: string;
  description: string;
}

/** Returns true when the code is running inside a Tauri window. */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/** Typed wrapper around `window.__TAURI__.invoke`. */
async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const tauri = (window as any).__TAURI__;
  if (!tauri) {
    throw new Error("Not running in Tauri");
  }
  return tauri.invoke(command, args) as Promise<T>;
}

/**
 * Check whether PipeWire is available on the current Linux system.
 * Returns `false` on non-Linux or when not running in Tauri.
 */
export async function checkPipewireAvailable(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  try {
    return await invoke<boolean>("check_pipewire_available");
  } catch {
    return false;
  }
}

/**
 * Retrieve the list of PipeWire audio output nodes (sinks).
 * Returns an empty array when not on Linux or not running in Tauri.
 */
export async function getAudioOutputNodes(): Promise<TauriAudioOutputNode[]> {
  if (!isTauriRuntime()) return [];
  try {
    return await invoke<TauriAudioOutputNode[]>("get_audio_output_nodes");
  } catch {
    return [];
  }
}

/**
 * Start capturing audio from the PipeWire node with the given `nodeId`.
 *
 * Creates a Crystal Mix virtual null-sink and routes the selected node's
 * output through a pw-loopback so the browser can use it as a mic.
 *
 * @throws When not running in Tauri or when the Rust command returns an error.
 */
export async function startPipewireAudioCapture(nodeId: string): Promise<void> {
  if (!isTauriRuntime()) return;
  await invoke<void>("start_pipewire_audio_capture", { nodeId });
}

/**
 * Stop any active PipeWire audio capture session and release resources
 * (kill pw-loopback process, unload pactl module).
 */
export async function stopPipewireAudioCapture(): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await invoke<void>("stop_pipewire_audio_capture");
  } catch {
    // best-effort cleanup — ignore errors
  }
}
