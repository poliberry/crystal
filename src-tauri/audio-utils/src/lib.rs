/// Audio output node returned by PipeWire/PulseAudio queries.
#[derive(Debug, PartialEq, Clone)]
pub struct AudioOutputNode {
    pub id: String,
    pub name: String,
    pub description: String,
}

// ---------------------------------------------------------------------------
// node_id validation
// ---------------------------------------------------------------------------

/// Returns `true` when `id` contains only safe characters for use as a
/// PipeWire / PulseAudio node identifier in shell arguments.
///
/// Allowed: alphanumeric characters, hyphens, underscores, and dots.
/// Anything else (spaces, semicolons, pipes, …) is rejected to prevent
/// command injection when the id is interpolated into `pw-loopback` /
/// `pactl` arguments.
pub fn is_valid_node_id(id: &str) -> bool {
    id.chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '.'))
}

// ---------------------------------------------------------------------------
// pactl list sinks parser
// ---------------------------------------------------------------------------

/// Parse the text output of `pactl list sinks` into a list of
/// [`AudioOutputNode`] values.
///
/// The output format looks like:
///
/// ```text
/// Sink #0
///     Name: alsa_output.pci-0000_00_1f.3.analog-stereo
///     Description: Built-in Audio Analog Stereo
/// ```
pub fn parse_pactl_sinks(text: &str) -> Vec<AudioOutputNode> {
    let mut nodes: Vec<AudioOutputNode> = Vec::new();
    let mut id = String::new();
    let mut name = String::new();
    let mut desc = String::new();

    let flush = |id: &mut String,
                 name: &mut String,
                 desc: &mut String,
                 nodes: &mut Vec<AudioOutputNode>| {
        if !name.is_empty() {
            let d = if desc.is_empty() {
                name.clone()
            } else {
                desc.clone()
            };
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

// ---------------------------------------------------------------------------
// pw-dump JSON parser
// ---------------------------------------------------------------------------

/// Parse the JSON output of `pw-dump` into a list of [`AudioOutputNode`].
///
/// Only nodes with `media.class` equal to `"Audio/Sink"` or `"Audio/Duplex"`
/// are included.
pub fn parse_pw_dump_nodes(json: &serde_json::Value) -> Vec<AudioOutputNode> {
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

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------
    // is_valid_node_id
    // ------------------------------------------------------------------

    #[test]
    fn node_id_valid_numeric() {
        assert!(is_valid_node_id("42"));
    }

    #[test]
    fn node_id_valid_with_separators() {
        assert!(is_valid_node_id("alsa_output.pci-0000_00_1f.3.analog-stereo"));
    }

    #[test]
    fn node_id_rejects_semicolon() {
        assert!(!is_valid_node_id("42;rm -rf /"));
    }

    #[test]
    fn node_id_rejects_pipe() {
        assert!(!is_valid_node_id("42|bad"));
    }

    #[test]
    fn node_id_rejects_space() {
        assert!(!is_valid_node_id("node id"));
    }

    #[test]
    fn node_id_rejects_ampersand() {
        assert!(!is_valid_node_id("42&&bad"));
    }

    #[test]
    fn node_id_rejects_backtick() {
        assert!(!is_valid_node_id("`cmd`"));
    }

    #[test]
    fn node_id_rejects_dollar_sign() {
        assert!(!is_valid_node_id("$(cmd)"));
    }

    #[test]
    fn node_id_empty_string_is_vacuously_valid_by_char_check() {
        // Empty string passes the char filter (vacuous truth).
        // The Rust command will reject an empty node ID at runtime.
        // This test documents the current behaviour.
        assert!(is_valid_node_id(""));
    }

    // ------------------------------------------------------------------
    // parse_pactl_sinks
    // ------------------------------------------------------------------

    #[test]
    fn pactl_sinks_parses_single_sink() {
        let input = "Sink #0\n\tName: alsa_output.usb-Focusrite.analog-stereo\n\tDescription: Focusrite USB Audio\n\tDriver: module-alsa-card.c\n";
        let nodes = parse_pactl_sinks(input);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].id, "0");
        assert_eq!(nodes[0].name, "alsa_output.usb-Focusrite.analog-stereo");
        assert_eq!(nodes[0].description, "Focusrite USB Audio");
    }

    #[test]
    fn pactl_sinks_parses_multiple_sinks() {
        let input = "Sink #0\n\tName: sink-one\n\tDescription: Sink One\n\nSink #1\n\tName: sink-two\n\tDescription: Sink Two\n";
        let nodes = parse_pactl_sinks(input);
        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].id, "0");
        assert_eq!(nodes[1].id, "1");
        assert_eq!(nodes[1].name, "sink-two");
        assert_eq!(nodes[1].description, "Sink Two");
    }

    #[test]
    fn pactl_sinks_falls_back_to_name_when_no_description() {
        let input = "Sink #5\n\tName: unnamed-sink\n";
        let nodes = parse_pactl_sinks(input);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].description, "unnamed-sink");
    }

    #[test]
    fn pactl_sinks_empty_input_returns_empty_vec() {
        let nodes = parse_pactl_sinks("");
        assert!(nodes.is_empty());
    }

    #[test]
    fn pactl_sinks_ignores_lines_before_first_sink() {
        let input = "Server info:\n  Default Sink: my-sink\n\nSink #0\n\tName: my-sink\n\tDescription: My Sink\n";
        let nodes = parse_pactl_sinks(input);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].name, "my-sink");
    }

    #[test]
    fn pactl_sinks_ignores_extra_fields() {
        let input = "Sink #2\n\tState: RUNNING\n\tName: active-sink\n\tDescription: Active Sink\n\tSample Specification: s16le 2ch 44100Hz\n";
        let nodes = parse_pactl_sinks(input);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].name, "active-sink");
    }

    // ------------------------------------------------------------------
    // parse_pw_dump_nodes
    // ------------------------------------------------------------------

    #[test]
    fn pw_dump_parses_audio_sink_node() {
        let json: serde_json::Value = serde_json::json!([
            {
                "id": 42,
                "info": {
                    "props": {
                        "media.class": "Audio/Sink",
                        "node.name": "alsa_output.pci",
                        "node.description": "Built-in Audio"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].id, "42");
        assert_eq!(nodes[0].name, "alsa_output.pci");
        assert_eq!(nodes[0].description, "Built-in Audio");
    }

    #[test]
    fn pw_dump_parses_duplex_node() {
        let json: serde_json::Value = serde_json::json!([
            {
                "id": 7,
                "info": {
                    "props": {
                        "media.class": "Audio/Duplex",
                        "node.name": "duplex-node",
                        "node.description": "Duplex Device"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].id, "7");
    }

    #[test]
    fn pw_dump_skips_non_sink_nodes() {
        let json: serde_json::Value = serde_json::json!([
            {
                "id": 1,
                "info": {
                    "props": {
                        "media.class": "Audio/Source",
                        "node.name": "mic-node",
                        "node.description": "Microphone"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert!(nodes.is_empty());
    }

    #[test]
    fn pw_dump_falls_back_to_nick_when_no_description() {
        let json: serde_json::Value = serde_json::json!([
            {
                "id": 99,
                "info": {
                    "props": {
                        "media.class": "Audio/Sink",
                        "node.name": "nickless",
                        "node.nick": "Nick Name"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert_eq!(nodes[0].description, "Nick Name");
    }

    #[test]
    fn pw_dump_falls_back_to_name_when_no_description_or_nick() {
        let json: serde_json::Value = serde_json::json!([
            {
                "id": 3,
                "info": {
                    "props": {
                        "media.class": "Audio/Sink",
                        "node.name": "bare-node"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert_eq!(nodes[0].description, "bare-node");
    }

    #[test]
    fn pw_dump_skips_node_without_id() {
        let json: serde_json::Value = serde_json::json!([
            {
                "info": {
                    "props": {
                        "media.class": "Audio/Sink",
                        "node.name": "no-id"
                    }
                }
            }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert!(nodes.is_empty());
    }

    #[test]
    fn pw_dump_empty_array_returns_empty_vec() {
        let json: serde_json::Value = serde_json::json!([]);
        let nodes = parse_pw_dump_nodes(&json);
        assert!(nodes.is_empty());
    }

    #[test]
    fn pw_dump_handles_multiple_sinks_and_skips_sources() {
        let json: serde_json::Value = serde_json::json!([
            { "id": 10, "info": { "props": { "media.class": "Audio/Sink", "node.name": "sink-a", "node.description": "Sink A" } } },
            { "id": 11, "info": { "props": { "media.class": "Audio/Source", "node.name": "src-b", "node.description": "Source B" } } },
            { "id": 12, "info": { "props": { "media.class": "Audio/Sink", "node.name": "sink-c", "node.description": "Sink C" } } }
        ]);
        let nodes = parse_pw_dump_nodes(&json);
        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].id, "10");
        assert_eq!(nodes[1].id, "12");
    }
}
