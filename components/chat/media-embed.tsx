// components/chat/media-embed.tsx

"use client";

import { useEffect } from "react";

type MediaEmbedProps = {
    url: string;
};

function sanitizeUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function isTwitterUrl(url: string) {
    return /x\.com\/[^/]+\/status\/\d+/.test(url) || /twitter\.com\/[^/]+\/status\/\d+/.test(url);
}

function isInstagramUrl(url: string) {
    return /instagram\.com\/p\/[A-Za-z0-9_-]+/.test(url);
}

function isFacebookUrl(url: string) {
    return /facebook\.com\/[^/]+\/posts\/\d+/.test(url);
}

function isRedditUrl(url: string) {
    return /reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+/i.test(url);
}

function isYouTubeUrl(url: string) {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/.test(url);
}

function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}

function isTikTokUrl(url: string) {
    return /tiktok\.com\/@[^/]+\/video\/\d+/.test(url);
}

function isBlueskyUrl(url: string) {
    return /bsky\.app\/profile\/[^/]+\/post\/[a-z0-9]+/i.test(url);
}

function isThreadsUrl(url: string) {
    return /threads\.net\/@[^/]+\/post\/\d+/i.test(url);
}

function isSpotifyUrl(url: string) {
    return /open\.spotify\.com\/(track|album|playlist|episode)\/[a-zA-Z0-9]+/i.test(url);
}

function isAppleMusicUrl(url: string) {
    return /music\.apple\.com\/[a-z]{2}\/album\/[^/]+\/[0-9]+/i.test(url);
}


export function isSocialEmbed(url: string): boolean {
    return (
        isTwitterUrl(url) ||
        isInstagramUrl(url) ||
        isFacebookUrl(url) ||
        isRedditUrl(url) ||
        isYouTubeUrl(url) ||
        isTikTokUrl(url) ||
        isBlueskyUrl(url) ||
        isThreadsUrl(url) ||
        isSpotifyUrl(url) ||
        isAppleMusicUrl(url)
    );
}

export const MediaEmbed = ({ url }: MediaEmbedProps) => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return null;

    // Twitter
    useEffect(() => {
        if (isTwitterUrl(url)) {
            if (window?.twttr) {
                window.twttr.widgets.load();
            } else {
                const script = document.createElement("script");
                script.src = "https://platform.twitter.com/widgets.js";
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [url]);

    // Instagram
    useEffect(() => {
        if (isInstagramUrl(url)) {
            const script = document.createElement("script");
            script.src = "https://www.instagram.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, [url]);

    // Facebook
    useEffect(() => {
        if (isFacebookUrl(url)) {
            if (!document.getElementById("facebook-jssdk")) {
                const script = document.createElement("script");
                script.id = "facebook-jssdk";
                script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v17.0";
                script.async = true;
                document.body.appendChild(script);
            } else if (window?.FB?.XFBML?.parse) {
                window.FB.XFBML.parse();
            }
        }
    }, [url]);

    // TikTok
    useEffect(() => {
        if (isTikTokUrl(url)) {
            const script = document.createElement("script");
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, [url]);

    // --- Render specific embeds ---
    if (isTwitterUrl(url)) {
        return (
            <blockquote
                className="twitter-tweet"
                data-theme="dark"
                style={{ maxWidth: 400, marginTop: 8, marginBottom: 8 }}
            >
                <a href={safeUrl}>{safeUrl}</a>
            </blockquote>
        );
    }

    if (isInstagramUrl(url)) {
        const shortcode = safeUrl.split("/p/")[1]?.split("/")[0];
        return (
            <iframe
                src={`https://www.instagram.com/p/${shortcode}/embed`}
                width="400"
                height="480"
                frameBorder="0"
                scrolling="no"
                allowTransparency
                className="rounded-lg mt-2"
                style={{ background: "#fff" }}
            ></iframe>
        );
    }

    if (isFacebookUrl(url)) {
        return (
            <iframe
                src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
                    safeUrl
                )}&show_text=true&width=400`}
                width="400"
                height="480"
                style={{ border: "none", overflow: "hidden", marginTop: 8 }}
                scrolling="no"
                frameBorder="0"
                allow="encrypted-media"
                allowFullScreen
                className="rounded-lg"
            ></iframe>
        );
    }

    if (isRedditUrl(url)) {
        const path = new URL(safeUrl).pathname;
        return (
            <iframe
                src={`https://www.redditmedia.com${path}?ref_source=embed&ref=share&embed=true`}
                sandbox="allow-scripts allow-same-origin allow-popups"
                style={{
                    border: "none",
                    overflow: "hidden",
                    width: "100%",
                    maxWidth: 400,
                    height: 450,
                    marginTop: 8,
                    borderRadius: 8,
                }}
                scrolling="no"
                frameBorder="0"
                allowFullScreen
            ></iframe>
        );
    }

    if (isYouTubeUrl(url)) {
        const videoId = getYouTubeId(url);
        if (!videoId) return null;
        return (
            <iframe
                width="400"
                height="225"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg mt-2"
            ></iframe>
        );
    }

    if (isTikTokUrl(url)) {
        return (
            <blockquote
                className="tiktok-embed mt-2"
                cite={safeUrl}
                data-video-id
                style={{ maxWidth: 400 }}
            >
                <a href={safeUrl}>{safeUrl}</a>
            </blockquote>
        );
    }

    if (isBlueskyUrl(url)) {
        const path = new URL(safeUrl).pathname;
        return (
            <iframe
                src={`https://bsky.app/embed${path}`}
                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-popups"
                height="600"
                width="100%"
                style={{ maxWidth: 400, marginTop: 8, borderRadius: 8 }}
                frameBorder="0"
            ></iframe>
        );
    }

    if (isThreadsUrl(url)) {
        return (
            <iframe
                src={`https://www.threads.net/embed${new URL(safeUrl).pathname}`}
                width="400"
                height="600"
                style={{ border: "none", marginTop: 8 }}
                allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="rounded-lg"
            ></iframe>
        );
    }

    if (isSpotifyUrl(url)) {
        const embedUrl = safeUrl.replace("open.spotify.com", "open.spotify.com/embed");
        return (
            <iframe
                src={embedUrl}
                width="400"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="rounded-lg mt-2"
            ></iframe>
        );
    }

    if (isAppleMusicUrl(url)) {
        const appleEmbedUrl = safeUrl.replace("music.apple.com", "embed.music.apple.com");
        return (
            <iframe
                allow="autoplay *; encrypted-media *; fullscreen *"
                frameBorder="0"
                height="175"
                style={{ width: "100%", maxWidth: 400, marginTop: 8, borderRadius: 8 }}
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                src={appleEmbedUrl}
            ></iframe>
        );
    }

    return null;
};
