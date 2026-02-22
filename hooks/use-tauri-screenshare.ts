"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkPipewireAvailable,
  getAudioOutputNodes,
  isTauriRuntime,
  startPipewireAudioCapture,
  stopPipewireAudioCapture,
  TauriAudioOutputNode,
} from "@/lib/tauri-bridge";

export interface UseTauriScreenshareReturn {
  /** Whether Tauri Pipewire audio capture is available on this system. */
  pipewireAvailable: boolean;
  /** List of available PipeWire audio output nodes. */
  audioOutputNodes: TauriAudioOutputNode[];
  /** Start audio capture for the given PipeWire node ID.  */
  startAudioCapture: (nodeId: string) => Promise<void>;
  /** Stop any running audio capture and clean up. */
  stopAudioCapture: () => Promise<void>;
  /** Whether we are currently running inside a Tauri window. */
  isTauri: boolean;
}

/**
 * Encapsulates all Tauri-specific screenshare audio logic.
 *
 * On non-Tauri runtimes all values are safe defaults (false / empty array / no-ops).
 */
export function useTauriScreenshare(): UseTauriScreenshareReturn {
  const [pipewireAvailable, setPipewireAvailable] = useState(false);
  const [audioOutputNodes, setAudioOutputNodes] = useState<TauriAudioOutputNode[]>([]);
  // Track whether we have an active capture so we can clean up on unmount.
  const captureActiveRef = useRef(false);

  const isTauri = isTauriRuntime();

  // On mount, check PipeWire availability and populate the node list.
  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    (async () => {
      try {
        const available = await checkPipewireAvailable();
        if (cancelled) return;
        setPipewireAvailable(available);

        if (!available) return;

        const nodes = await getAudioOutputNodes();
        if (cancelled) return;
        setAudioOutputNodes(nodes);
      } catch (err) {
        console.error("[useTauriScreenshare] Failed to initialize PipeWire:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTauri]);

  // Cleanup: stop any active capture when the component unmounts.
  useEffect(() => {
    return () => {
      if (captureActiveRef.current) {
        stopPipewireAudioCapture().catch((err) => {
          console.error("[useTauriScreenshare] Failed to stop PipeWire capture on unmount:", err);
        });
        captureActiveRef.current = false;
      }
    };
  }, []);

  const startAudioCapture = useCallback(async (nodeId: string) => {
    await startPipewireAudioCapture(nodeId);
    captureActiveRef.current = true;
  }, []);

  const stopAudioCapture = useCallback(async () => {
    await stopPipewireAudioCapture();
    captureActiveRef.current = false;
  }, []);

  return {
    pipewireAvailable,
    audioOutputNodes,
    startAudioCapture,
    stopAudioCapture,
    isTauri,
  };
}
