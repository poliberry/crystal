import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Open_Sans, Overpass } from "next/font/google";

import { Providers } from "@/components/providers/providers";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";
import NotificationListener from "@/components/notification-listener";
import { Toaster } from "@/components/ui/sonner";
import { ModalProvider } from "@/components/providers/modal-provider";
import { LiveKitProvider } from "@/components/providers/media-room-provider";

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const viewport: Viewport = {
  themeColor: "#5865F2",
};

export let metadata: Metadata = siteConfig;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Patch LiveKit browser detection for Tauri/WebKit before LiveKit loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined' && '__TAURI__' in window) {
                  // Ensure WebRTC APIs are available with webkit prefix
                  if (!window.RTCPeerConnection) {
                    if (window.webkitRTCPeerConnection) {
                      window.RTCPeerConnection = window.webkitRTCPeerConnection;
                    } else if (window.mozRTCPeerConnection) {
                      window.RTCPeerConnection = window.mozRTCPeerConnection;
                    } else if (window.msRTCPeerConnection) {
                      window.RTCPeerConnection = window.msRTCPeerConnection;
                    }
                  }
                  if (!window.RTCSessionDescription) {
                    if (window.webkitRTCSessionDescription) {
                      window.RTCSessionDescription = window.webkitRTCSessionDescription;
                    } else if (window.mozRTCSessionDescription) {
                      window.RTCSessionDescription = window.mozRTCSessionDescription;
                    }
                  }
                  if (!window.RTCIceCandidate) {
                    if (window.webkitRTCIceCandidate) {
                      window.RTCIceCandidate = window.webkitRTCIceCandidate;
                    } else if (window.mozRTCIceCandidate) {
                      window.RTCIceCandidate = window.mozRTCIceCandidate;
                    }
                  }
                  
                  // Patch LiveKit's browser detection by intercepting module-level checks
                  // This needs to run before LiveKit modules are loaded
                  const originalDefineProperty = Object.defineProperty;
                  Object.defineProperty = function(obj, prop, descriptor) {
                    // Allow all property definitions to proceed normally
                    return originalDefineProperty.call(this, obj, prop, descriptor);
                  };
                  
                  // Patch window.onerror to catch LiveKit browser detection errors
                  const originalOnError = window.onerror;
                  window.onerror = function(message, source, lineno, colno, error) {
                    const messageStr = message?.toString() || '';
                    if (messageStr.includes('LiveKit doesn\\'t seem to be supported') || 
                        messageStr.includes('webRTC') ||
                        messageStr.includes('WebRTC') ||
                        messageStr.includes('browser')) {
                      console.warn('LiveKit browser detection warning (suppressed for Tauri/WebKit):', message);
                      return true; // Suppress the error
                    }
                    if (originalOnError) {
                      return originalOnError.call(window, message, source, lineno, colno, error);
                    }
                    return false;
                  };
                  
                  // Patch unhandled promise rejections
                  window.addEventListener('unhandledrejection', function(event) {
                    const reason = event.reason?.toString() || '';
                    if (reason.includes('LiveKit doesn\\'t seem to be supported') || 
                        reason.includes('webRTC') ||
                        reason.includes('WebRTC') ||
                        reason.includes('browser')) {
                      console.warn('LiveKit browser detection warning (suppressed for Tauri/WebKit):', event.reason);
                      event.preventDefault(); // Suppress the error
                    }
                  }, true); // Use capture phase to catch early
                  
                  // Also patch console.error to catch LiveKit errors
                  const originalConsoleError = console.error;
                  console.error = function(...args) {
                    const message = args[0]?.toString() || '';
                    if (message.includes('LiveKit doesn\\'t seem to be supported') || 
                        message.includes('webRTC') ||
                        message.includes('WebRTC')) {
                      console.warn('LiveKit browser detection warning (suppressed for Tauri/WebKit):', ...args);
                      return;
                    }
                    originalConsoleError.apply(console, args);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className="w-full h-screen bg-background">
        <Providers>
          <Toaster position="top-center" />
          {children}
          <NotificationListener />
        </Providers>
      </body>
    </html>
  );
}
