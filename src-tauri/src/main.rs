#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Represents a PipeWire audio output node (sink).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioOutputNode {
    pub id: String,
    pub name: String,
    pub description: String,
}

/// Tracks the state of an active PipeWire audio capture session.
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
        let socket_available = std::process::Command::new("id")
            .arg("-u")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|uid| {
                let uid = uid.trim().to_string();
                let path =
                    std::env::var("XDG_RUNTIME_DIR").unwrap_or(format!("/run/user/{uid}"));
                std::path::Path::new(&path).join("pipewire-0").exists()
            })
            .unwrap_or(false);

        if socket_available {
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
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Validate the node_id to only allow safe characters (digits, letters,
        // hyphens, underscores, dots) so it cannot be used for command injection
        // when interpolated into pw-loopback / pactl arguments.
        if !node_id
            .chars()
            .all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '.'))
        {
            return Err(format!("Invalid node_id: {node_id}"));
        }
        let mut capture = state.audio_capture.lock().map_err(|e| e.to_string())?;

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
            .map_err(|e| format!("Failed to create Crystal Mix sink: {e}"))?;

        if load_result.status.success() {
            let id_str = String::from_utf8_lossy(&load_result.stdout)
                .trim()
                .to_string();
            capture.module_id = id_str.parse::<u32>().ok();
        }

        // 2. Use pw-loopback to route the selected PipeWire node into crystal-mix.
        let loopback = std::process::Command::new("pw-loopback")
            .args([
                format!(
                    "--capture-props=media.class=Audio/Sink,node.target={}",
                    node_id
                ),
                "--playback-props=media.class=Audio/Source,node.name=crystal-screenshare,node.description=Crystal-Screenshare".into(),
            ])
            .spawn();

        match loopback {
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
                    .map_err(|e| format!("Loopback fallback failed: {e}"))?;

                if fb.status.success() {
                    Ok(())
                } else {
                    Err("Failed to start PipeWire audio capture".to_string())
                }
            }
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _node_id = node_id;
        Err("PipeWire audio capture is only supported on Linux".to_string())
    }
}

/// Stops any active PipeWire audio capture session and cleans up resources.
#[tauri::command]
fn stop_pipewire_audio_capture(state: State<'_, AppState>) -> Result<(), String> {
    let mut capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    stop_capture_internal(&mut capture);
    Ok(())
}

// ---------------------------------------------------------------------------
// Platform-specific helpers (Linux)
// ---------------------------------------------------------------------------

#[cfg(target_os = "linux")]
fn get_pipewire_audio_nodes() -> Vec<AudioOutputNode> {
    // Try pactl first — widely available and easy to parse.
    if let Ok(out) = std::process::Command::new("pactl")
        .args(["list", "sinks"])
        .output()
    {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            let nodes = parse_pactl_sinks(&text);
            if !nodes.is_empty() {
                return nodes;
            }
        }
    }

    // Fallback: pw-dump JSON output.
    if let Ok(out) = std::process::Command::new("pw-dump").output() {
        if out.status.success() {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                return parse_pw_dump_nodes(&json);
            }
        }
    }

    vec![]
}

/// Parse `pactl list sinks` output into a list of [`AudioOutputNode`].
#[cfg(target_os = "linux")]
fn parse_pactl_sinks(text: &str) -> Vec<AudioOutputNode> {
    let mut nodes: Vec<AudioOutputNode> = Vec::new();
    let mut id = String::new();
    let mut name = String::new();
    let mut desc = String::new();

    let flush = |id: &mut String, name: &mut String, desc: &mut String, nodes: &mut Vec<AudioOutputNode>| {
        if !name.is_empty() {
            let d = if desc.is_empty() { name.clone() } else { desc.clone() };
            nodes.push(AudioOutputNode {
                id: id.clone(),
                name: name.clone(),
                description: d,
            });
        }
        id.clear();
        name.clear();
        desc.clear();
    };

    for line in text.lines() {
        let t = line.trim();
        if let Some(rest) = t.strip_prefix("Sink #") {
            flush(&mut id, &mut name, &mut desc, &mut nodes);
            id = rest.to_string();
        } else if let Some(rest) = t.strip_prefix("Name: ") {
            name = rest.to_string();
        } else if let Some(rest) = t.strip_prefix("Description: ") {
            desc = rest.to_string();
        }
    }
    flush(&mut id, &mut name, &mut desc, &mut nodes);

    nodes
}

/// Parse `pw-dump` JSON output into a list of [`AudioOutputNode`].
#[cfg(target_os = "linux")]
fn parse_pw_dump_nodes(json: &serde_json::Value) -> Vec<AudioOutputNode> {
    let mut nodes = Vec::new();

    if let Some(arr) = json.as_array() {
        for item in arr {
            let media_class = item["info"]["props"]["media.class"]
                .as_str()
                .unwrap_or("");

            if !matches!(media_class, "Audio/Sink" | "Audio/Duplex") {
                continue;
            }

            let id = match item["id"].as_u64() {
                Some(n) => n.to_string(),
                None => continue,
            };
            let name = item["info"]["props"]["node.name"]
                .as_str()
                .unwrap_or(&id)
                .to_string();
            let description = item["info"]["props"]["node.description"]
                .as_str()
                .or_else(|| item["info"]["props"]["node.nick"].as_str())
                .unwrap_or(&name)
                .to_string();

            nodes.push(AudioOutputNode { id, name, description });
        }
    }

    nodes
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
    let state = AppState {
        audio_capture: Mutex::new(AudioCaptureState {
            process: None,
            module_id: None,
        }),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            check_pipewire_available,
            get_audio_output_nodes,
            start_pipewire_audio_capture,
            stop_pipewire_audio_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
