# WebRTC Support in Tauri on Linux

## Issue
LiveKit shows error: "LiveKit doesn't seem to be supported on this browser" when running in Tauri on Linux.

## Root Cause
WebKitGTK (used by Tauri on Linux) may not have WebRTC enabled or may be missing required dependencies.

## Solutions

### 1. Install/Update WebKitGTK with WebRTC Support

**For Debian/Ubuntu:**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libwebkit2gtk-4.1-0
```

**Check WebKitGTK version (should be 2.36+):**
```bash
pkg-config --modversion webkit2gtk-4.1
```

### 2. Install Required GStreamer Plugins

WebKitGTK uses GStreamer for WebRTC. Install required plugins:

```bash
sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav
```

### 3. Verify WebRTC is Available

Open the Tauri app's developer console and run:
```javascript
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined' ? 'Available' : 'Not Available');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined' ? 'Available' : 'Not Available');
```

### 4. Check System Dependencies

Ensure all required libraries are installed:
```bash
sudo apt install libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 5. Environment Variables

The app sets these automatically, but you can also set them manually:
```bash
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_DMABUF_RENDERER=1
```

### 6. Alternative: Use Tauri Dev Branch (Advanced)

If the stable version doesn't work, you can try the dev branch which has `set_enable_webrtc`:

1. Clone Tauri dev branch
2. Point your `Cargo.toml` to the local clone
3. Use `set_enable_webrtc(true)` in your Rust code

See: https://github.com/tauri-apps/tauri/discussions/8426

## Testing

After installing dependencies, rebuild the Tauri app:
```bash
cd crystal-app
npm run tauri build
```

Then test if WebRTC is available in the app's console.

