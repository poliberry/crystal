#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// Pure parsing/validation helpers (no Tauri/GTK deps — tested separately).
use crystal_audio_utils::{is_valid_node_id, AudioOutputNode as UtilsNode};

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/// Serializable error wrapper for Tauri command return types.
///
/// Tauri requires errors to implement [`serde::Serialize`]. This type wraps
/// [`anyhow::Error`] and serialises it as a plain string so that callers
/// receive a human-readable message over IPC, while internally we get the
/// ergonomic `?` propagation and context-chaining that anyhow provides.
#[derive(Debug)]
struct CommandError(anyhow::Error);

impl Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl<E: Into<anyhow::Error>> From<E> for CommandError {
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

/// Alias used by all Tauri commands in this module.
type Result<T> = std::result::Result<T, CommandError>;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// Represents a PipeWire audio output node (sink).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioOutputNode {
    pub id: String,
    pub name: String,
    pub description: String,
}

impl From<UtilsNode> for AudioOutputNode {
    fn from(n: UtilsNode) -> Self {
        AudioOutputNode { id: n.id, name: n.name, description: n.description }
    }
}

/// Tracks the state of an active PipeWire audio capture session.
#[derive(Default)]
struct AudioCaptureState {
    /// Optional spawned pw-loopback process handle.
    process: Option<std::process::Child>,
    /// pactl module ID for the Crystal Mix null-sink, if loaded.
    module_id: Option<u32>,
}

struct AppState {
    audio_capture: Mutex<AudioCaptureState>,
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Returns `true` when PipeWire is running and available on this system.
/// On non-Linux platforms this always returns `false`.
#[tauri::command]
fn check_pipewire_available() -> bool {
    #[cfg(target_os = "linux")]
    {
        // Primary check: PipeWire socket under the current user's XDG_RUNTIME_DIR.
        // Use libc::getuid() to avoid spawning a child process just to read the UID.
        let uid = unsafe { libc::getuid() };
        let path = std::env::var("XDG_RUNTIME_DIR")
            .unwrap_or_else(|_| format!("/run/user/{uid}"));
        if std::path::Path::new(&path).join("pipewire-0").exists() {
            return true;
        }

        // Fallback: check if pw-cli is on PATH and responds.
        std::process::Command::new("pw-cli")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "linux"))]
    {
        false
    }
}

/// Returns a list of PipeWire audio output nodes (sinks) available on the system.
/// On non-Linux platforms this returns an empty list.
#[tauri::command]
fn get_audio_output_nodes() -> Vec<AudioOutputNode> {
    #[cfg(target_os = "linux")]
    {
        get_pipewire_audio_nodes()
    }

    #[cfg(not(target_os = "linux"))]
    {
        vec![]
    }
}

/// Starts capturing audio from the PipeWire node with the given `node_id`.
///
/// Creates a Crystal Mix virtual null-sink and a pw-loopback that routes the
/// selected node's output into it.  The Crystal Mix monitor source can then be
/// selected in the browser as a microphone for screenshare audio.
///
/// On non-Linux platforms this command returns an error.
#[tauri::command]
fn start_pipewire_audio_capture(
    node_id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        // Validate the node_id using the shared utility (safe chars only).
        if !is_valid_node_id(&node_id) {
            return Err(anyhow::anyhow!("Invalid node_id: {node_id}").into());
        }

        let mut capture = state
            .audio_capture
            .lock()
            .map_err(|e| anyhow::anyhow!("Mutex poisoned: {e}"))?;

        // Stop any previously active capture first.
        stop_capture_internal(&mut capture);

        // 1. Create the Crystal Mix virtual null-sink.
        let load_result = std::process::Command::new("pactl")
            .args([
                "load-module",
                "module-null-sink",
                "sink_name=crystal-mix",
                "sink_properties=device.description=Crystal-Mix",
            ])
            .output()
            .map_err(|e| anyhow::anyhow!("Failed to create Crystal Mix sink: {e}"))?;

        if load_result.status.success() {
            let id_str = String::from_utf8_lossy(&load_result.stdout)
                .trim()
                .to_string();
            capture.module_id = id_str.parse::<u32>().ok();
        }

        // 2. Use pw-loopback to route the selected PipeWire node into crystal-mix.
        match std::process::Command::new("pw-loopback")
            .args([
                format!(
                    "--capture-props=media.class=Audio/Sink,node.target={}",
                    node_id
                ),
                "--playback-props=media.class=Audio/Source,node.name=crystal-screenshare,node.description=Crystal-Screenshare".into(),
            ])
            .spawn()
        {
            Ok(child) => {
                capture.process = Some(child);
                Ok(())
            }
            Err(_) => {
                // Fallback: pactl loopback module routing node monitor → crystal-mix.
                let fb = std::process::Command::new("pactl")
                    .args([
                        "load-module",
                        "module-loopback",
                        &format!("source={node_id}.monitor"),
                        "sink=crystal-mix",
                    ])
                    .output()
                    .map_err(|e| anyhow::anyhow!("Loopback fallback failed: {e}"))?;

                if fb.status.success() {
                    Ok(())
                } else {
                    Err(anyhow::anyhow!("Failed to start PipeWire audio capture").into())
                }
            }
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _node_id = node_id;
        Err(anyhow::anyhow!("PipeWire audio capture is only supported on Linux").into())
    }
}

/// Stops any active PipeWire audio capture session and cleans up resources.
#[tauri::command]
fn stop_pipewire_audio_capture(state: State<'_, AppState>) -> Result<()> {
    let mut capture = state
        .audio_capture
        .lock()
        .map_err(|e| anyhow::anyhow!("Mutex poisoned: {e}"))?;
    stop_capture_internal(&mut capture);
    Ok(())
}

// ---------------------------------------------------------------------------
// Platform-specific helpers (Linux) — delegate to crystal-audio-utils
// ---------------------------------------------------------------------------

#[cfg(target_os = "linux")]
fn get_pipewire_audio_nodes() -> Vec<AudioOutputNode> {
    use crystal_audio_utils::{parse_pactl_sinks, parse_pw_dump_nodes};

    // Try pactl first — widely available and easy to parse.
    if let Ok(out) = std::process::Command::new("pactl")
        .args(["list", "sinks"])
        .output()
    {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            let nodes = parse_pactl_sinks(&text);
            if !nodes.is_empty() {
                return nodes.into_iter().map(Into::into).collect();
            }
        }
    }

    // Fallback: pw-dump JSON output.
    if let Ok(out) = std::process::Command::new("pw-dump").output() {
        if out.status.success() {
            if let Ok(nodes) = parse_pw_dump_nodes(&out.stdout) {
                return nodes.into_iter().map(Into::into).collect();
            }
        }
    }

    vec![]
}

/// Tear down any active audio capture (process + pactl module).
fn stop_capture_internal(capture: &mut AudioCaptureState) {
    if let Some(mut child) = capture.process.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    if let Some(module_id) = capture.module_id.take() {
        let _ = std::process::Command::new("pactl")
            .args(["unload-module", &module_id.to_string()])
            .output();
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(AppState {
            audio_capture: Mutex::new(AudioCaptureState::default()),
        })
        .invoke_handler(tauri::generate_handler![
            check_pipewire_available,
            get_audio_output_nodes,
            start_pipewire_audio_capture,
            stop_pipewire_audio_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Tests for the pure parsing/validation logic live in src-tauri/audio-utils/.
// Run them with:  cargo test --manifest-path src-tauri/audio-utils/Cargo.toml
