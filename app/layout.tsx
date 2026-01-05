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
                  if (!window.RTCPeerConnection && window.webkitRTCPeerConnection) {
                    window.RTCPeerConnection = window.webkitRTCPeerConnection;
                  }
                  if (!window.RTCSessionDescription && window.webkitRTCSessionDescription) {
                    window.RTCSessionDescription = window.webkitRTCSessionDescription;
                  }
                  if (!window.RTCIceCandidate && window.webkitRTCIceCandidate) {
                    window.RTCIceCandidate = window.webkitRTCIceCandidate;
                  }
                  
                  // Patch window.onerror to catch LiveKit browser detection errors
                  const originalOnError = window.onerror;
                  window.onerror = function(message, source, lineno, colno, error) {
                    const messageStr = message?.toString() || '';
                    if (messageStr.includes('LiveKit doesn\\'t seem to be supported') || 
                        messageStr.includes('webRTC') ||
                        messageStr.includes('WebRTC')) {
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
                        reason.includes('WebRTC')) {
                      console.warn('LiveKit browser detection warning (suppressed for Tauri/WebKit):', event.reason);
                      event.preventDefault(); // Suppress the error
                    }
                  });
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
