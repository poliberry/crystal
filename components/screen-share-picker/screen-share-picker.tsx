import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const StreamResolutions = ["480", "720", "1080", "1440", "2160"] as const;
const StreamFps = ["15", "30", "60"] as const;

type StreamResolution = (typeof StreamResolutions)[number];
type StreamFps = (typeof StreamFps)[number];

interface AudioNode {
  "application.name"?: string;
  "application.process.binary"?: string;
  "application.process.id"?: string;
  "node.name"?: string;
  "media.class"?: string;
  "media.name"?: string;
  "device.id"?: string;
}

type SpecialSource = "None" | "Entire System";
type AudioSource = SpecialSource | AudioNode;
type AudioSources = SpecialSource | AudioNode[];

interface AudioItem {
  name: string;
  value: AudioSource;
}

interface StreamSettings {
  audio: boolean;
  contentHint?: "motion" | "detail";
  includeSources?: AudioSources;
  excludeSources?: AudioSources;
}

interface StreamPick extends StreamSettings {
  id: string;
}

interface Source {
  id: string;
  name: string;
  url: string;
}

interface ScreenPickerProps {
  screens: Source[];
  onSubmit: (data: StreamPick) => void;
  onCancel: () => void;
  skipPicker?: boolean;
}

interface QualitySettings {
  resolution: StreamResolution;
  frameRate: StreamFps;
}

function ScreenPicker({ screens, onSelect }: { screens: Source[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {screens.map(({ id, name, url }) => (
        <label key={id} className="relative block cursor-pointer group">
          <input
            type="radio"
            name="screen"
            value={id}
            className="sr-only peer"
            onChange={() => onSelect(id)}
          />
          <Card className="overflow-hidden peer-checked:ring-2 peer-checked:ring-primary transition-all">
            <div className="aspect-video relative">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-2 text-sm font-medium">{name}</div>
          </Card>
        </label>
      ))}
    </div>
  );
}

function QualityPicker({ settings, onChange }: { settings: QualitySettings; onChange: (settings: QualitySettings) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Resolution</h3>
        <div className="flex flex-wrap gap-2">
          {StreamResolutions.map(res => (
            <Button
              key={res}
              variant={settings.resolution === res ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ ...settings, resolution: res })}
            >
              {res}p
            </Button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Frame Rate</h3>
        <div className="flex flex-wrap gap-2">
          {StreamFps.map(fps => (
            <Button
              key={fps}
              variant={settings.frameRate === fps ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ ...settings, frameRate: fps })}
            >
              {fps} FPS
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AudioSourcePicker({ sources, includeSources, excludeSources, onIncludeChange, onExcludeChange }: {
  sources: AudioItem[];
  includeSources?: AudioSources;
  excludeSources?: AudioSources;
  onIncludeChange: (sources: AudioSources) => void;
  onExcludeChange: (sources: AudioSources) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Audio Sources</h3>
        <Select
          onValueChange={value => onIncludeChange(value as AudioSources)}
          value={includeSources as string}
        >
          {sources.map(({ name, value }) => (
            <option key={name} value={JSON.stringify(value)}>
              {name}
            </option>
          ))}
        </Select>
      </div>
      {includeSources === "Entire System" && (
        <div>
          <h3 className="text-sm font-medium mb-2">Exclude Sources</h3>
          <Select
            onValueChange={value => onExcludeChange(value as AudioSources)}
            value={excludeSources as string}
          >
            {sources
              .filter(x => x.name !== "Entire System")
              .map(({ name, value }) => (
                <option key={name} value={JSON.stringify(value)}>
                  {name}
                </option>
              ))}
          </Select>
        </div>
      )}
    </div>
  );
}

export function ScreenSharePicker({ screens, onSubmit, onCancel, skipPicker }: ScreenPickerProps) {
  const [selected, setSelected] = useState<string | undefined>(skipPicker ? screens[0]?.id : undefined);
  const [settings, setSettings] = useState<StreamSettings>({
    contentHint: "motion",
    audio: true,
    includeSources: "None"
  });
  const [quality, setQuality] = useState<QualitySettings>({
    resolution: "720",
    frameRate: "30"
  });

  const isLinux = window.platform === 'linux';
  const isWindows = window.platform === 'win32';

  // Load audio sources on Linux
  const [audioSources, setAudioSources] = useState<AudioItem[]>([]);
  useEffect(() => {
    if (isLinux && window.VesktopNative) {
      window.VesktopNative.virtmic.list().then(result => {
        if (result.ok) {
          const sources: AudioItem[] = [
            { name: "None", value: "None" },
            { name: "Entire System", value: "Entire System" },
            ...result.targets.map(node => ({
              name: node["application.name"] || node["node.name"] || "Unknown",
              value: node
            }))
          ];
          setAudioSources(sources);
        }
      });
    }
  }, [isLinux]);

  const handleSubmit = () => {
    if (!selected) return;

    onSubmit({
      id: selected,
      audio: settings.audio,
      contentHint: settings.contentHint,
      includeSources: settings.includeSources,
      excludeSources: settings.excludeSources
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Screen Share</h2>
      </div>

      <div className="flex-1 overflow-auto">
        {!selected || skipPicker ? (
          <ScreenPicker screens={screens} onSelect={setSelected} />
        ) : (
          <div className="space-y-6 p-4">
            <Card>
              <div className="aspect-video relative">
                <img
                  src={screens.find(s => s.id === selected)?.url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Stream Settings</h3>
              
              <QualityPicker settings={quality} onChange={setQuality} />

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Content Type</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={settings.contentHint === "motion" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(s => ({ ...s, contentHint: "motion" }))}
                    >
                      Prefer Smoothness
                    </Button>
                    <Button
                      variant={settings.contentHint === "detail" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings(s => ({ ...s, contentHint: "detail" }))}
                    >
                      Prefer Clarity
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choosing "Prefer Clarity" will result in a significantly lower framerate in exchange for a much sharper image.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.audio}
                    onCheckedChange={checked => setSettings(s => ({ ...s, audio: checked }))}
                  />
                  <label className="text-sm font-medium">Share System Audio</label>
                </div>
              </div>

              {isLinux && audioSources.length > 0 && (
                <AudioSourcePicker
                  sources={audioSources}
                  includeSources={settings.includeSources}
                  excludeSources={settings.excludeSources}
                  onIncludeChange={sources => setSettings(s => ({ ...s, includeSources: sources }))}
                  onExcludeChange={sources => setSettings(s => ({ ...s, excludeSources: sources }))}
                />
              )}
            </Card>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!selected} onClick={handleSubmit}>
          Go Live
        </Button>
      </div>
    </div>
  );
}