"use client";

import { useEffect, useState } from "react";
import { Track } from "livekit-client";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Window, Volume2, VolumeX } from "lucide-react";

type DesktopSource = {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string | null;
  displayId?: string | null;
};

interface ScreenSharePickerProps {
  /**
   * Called when the user has selected a source and the streams are ready.
   * You should publish these to LiveKit:
   *
   * - videoStream.getVideoTracks()[0] as Track.Source.ScreenShare
   * - audioStream?.getAudioTracks()[0] as Track.Source.ScreenShareAudio
   */
  onStart: (streams: { videoStream: MediaStream; audioStream?: MediaStream }) => void;

  /**
   * Called when the user cancels the picker (or an error occurs).
   */
  onCancel: () => void;
}

declare global {
  interface Window {
    CrystalDesktop?: {
      isVesktop?: boolean;
      getDesktopSources?: (options?: {
        types?: string[];
        thumbnailSize?: { width: number; height: number };
        fetchWindowIcons?: boolean;
      }) => Promise<DesktopSource[]>;
      virtmic?: {
        list(): Promise<{
          ok: boolean;
          targets: any[];
          hasPipewirePulse: boolean;
        }>;
        start(includeSources: any[]): Promise<void>;
        startSystem(excludeSources: any[]): Promise<void>;
        stop(): Promise<void>;
      };
      platform?: {
        get(): string;
        isWindows(): boolean;
        isLinux(): boolean;
        isMacOS(): boolean;
      };
    };
  }
}

/**
 * Minimal screen share picker that:
 * - Uses CrystalDesktop.getDesktopSources to list desktop/window sources when in Vesktop
 * - Falls back to getDisplayMedia in a plain browser
 * - Returns MediaStreams to the caller, which can then be published into LiveKit
 */
export function ScreenSharePicker({ onStart, onCancel }: ScreenSharePickerProps) {
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVesktop =
    typeof window !== "undefined" && !!window.CrystalDesktop?.isVesktop;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isVesktop && window.CrystalDesktop?.getDesktopSources) {
          const result =
            (await window.CrystalDesktop.getDesktopSources({
              types: ["screen", "window"],
              thumbnailSize: { width: 320, height: 180 },
              fetchWindowIcons: true,
            })) ?? [];

          setSources(result);
          if (result.length > 0) {
            setSelectedId(result[0].id);
          }
        } else {
          // In a browser or non-Vesktop environment, we don't have a list of sources.
          // The caller should just show a simple "Share screen" UI and let
          // getDisplayMedia prompt directly.
          setSources([]);
          setSelectedId(null);
        }
      } catch (e: any) {
        console.error("Failed to load desktop sources:", e);
        setError("Failed to load screen share sources.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isVesktop]);

  const handleStart = async () => {
    if (typeof window === "undefined") return;

    setIsLoading(true);
    setError(null);

    try {
      let videoStream: MediaStream;
      let audioStream: MediaStream | undefined;

      if (isVesktop && selectedId && window.CrystalDesktop) {
        // In Vesktop: use chromeMediaSource to get video from the selected desktop source
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: selectedId,
            },
          } as any,
          audio: false,
        });

        const isLinux = window.CrystalDesktop.platform?.isLinux?.() ?? false;
        const isWindows = window.CrystalDesktop.platform?.isWindows?.() ?? false;
        const isMacOS = window.CrystalDesktop.platform?.isMacOS?.() ?? false;

        if (includeAudio) {
          if (isLinux && window.CrystalDesktop.virtmic) {
            // Linux: use Vesktop virtmic. For now, we start "Entire System".
            // You can extend this later to show the full virtmic source list.
            try {
              await window.CrystalDesktop.virtmic.startSystem([]);
            } catch (e) {
              console.warn("Failed to start virtmic, will try getDisplayMedia:", e);
            }

            // Try to capture from the created virtual mic device
            try {
              // Give the system a moment to register the device
              await new Promise((r) => setTimeout(r, 300));
              const devices = await navigator.mediaDevices.enumerateDevices();
              const virtmicDevice = devices.find(
                (d) =>
                  d.kind === "audioinput" &&
                  (d.label === "vencord-screen-share" ||
                    d.label === "crystal-screen-share" ||
                    d.label.toLowerCase().includes("virtmic") ||
                    d.label.toLowerCase().includes("vesktop")),
              );

              if (virtmicDevice) {
                audioStream = await navigator.mediaDevices.getUserMedia({
                  audio: {
                    deviceId: { exact: virtmicDevice.deviceId },
                    autoGainControl: false,
                    echoCancellation: false,
                    noiseSuppression: false,
                    channelCount: 2,
                    sampleRate: 48000,
                    sampleSize: 16,
                  } as any,
                });
              } else {
                console.warn(
                  "Vesktop virtmic device not found; system audio may be unavailable.",
                );
              }
            } catch (e) {
              console.warn(
                "Failed to capture from virtmic device; falling back to getDisplayMedia audio:",
                e,
              );
            }
          }

          // On Windows/macOS (and as a Linux fallback), try getDisplayMedia audio
          if (!audioStream && (isWindows || isMacOS)) {
            try {
              const loopback = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true,
              } as any);
              const audioTracks = loopback.getAudioTracks();
              if (audioTracks.length > 0) {
                audioStream = new MediaStream(audioTracks);
              } else {
                loopback.getTracks().forEach((t) => t.stop());
                console.warn("No loopback audio tracks for system audio.");
              }
            } catch (e) {
              console.warn("Failed to get loopback system audio:", e);
            }
          }
        }
      } else {
        // Browser / generic fallback: let getDisplayMedia do everything
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: includeAudio,
        } as any);

        videoStream = new MediaStream(displayStream.getVideoTracks());
        const tracks = displayStream.getAudioTracks();
        if (tracks.length > 0) {
          audioStream = new MediaStream(tracks);
        }
      }

      onStart({ videoStream, audioStream });
    } catch (e: any) {
      console.error("Failed to start screen share:", e);
      setError("Failed to start screen share.");
      onCancel();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVesktop) {
    // In plain browser, this picker is basically a thin wrapper around getDisplayMedia.
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Your environment does not expose per-window sources. Click below to
          select a screen or window to share.
        </p>
        <Button onClick={handleStart} disabled={isLoading}>
          {isLoading ? "Starting..." : "Share screen"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Share your screen</h2>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading && sources.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading sources...</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            onClick={() => setSelectedId(source.id)}
            className={cn(
              "border rounded-md overflow-hidden text-left focus:outline-none",
              "hover:border-primary/60 hover:shadow-sm transition-colors",
              selectedId === source.id
                ? "border-primary ring-2 ring-primary/40"
                : "border-border",
            )}
          >
            <div className="relative w-full h-28 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source.thumbnail}
                alt={source.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-xs text-white px-1 py-0.5 bg-black/50 rounded">
                {source.displayId ? (
                  <Monitor className="w-3 h-3" />
                ) : (
                  <Window className="w-3 h-3" />
                )}
                <span className="truncate max-w-[9rem]">{source.name}</span>
              </div>
            </div>
          </button>
        ))}

        {sources.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground col-span-full">
            No desktop sources available. You may need to grant screen recording
            permissions in your OS.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={() => setIncludeAudio((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 text-xs px-2 py-1 rounded border",
            includeAudio
              ? "border-primary text-primary bg-primary/5"
              : "border-border text-muted-foreground",
          )}
        >
          {includeAudio ? (
            <Volume2 className="w-3 h-3" />
          ) : (
            <VolumeX className="w-3 h-3" />
          )}
          {includeAudio ? "Include system audio" : "No system audio"}
        </button>

        <Button
          size="sm"
          onClick={handleStart}
          disabled={isLoading || !selectedId}
        >
          {isLoading ? "Starting..." : "Start share"}
        </Button>
      </div>
    </div>
  );
}
