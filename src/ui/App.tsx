import { useState, useEffect, useCallback } from "react";
import type { FeedPost } from "../core/types";
import { PostPage } from "./PostPage";

// Paper-rustle synthesized from Web Audio noise — no external asset needed.
// ponytail: 200ms noise burst; replace with recorded sample if too digital.
function playPageTurn(dir: "next" | "prev") {
  try {
    const ctx  = new AudioContext();
    const len  = ctx.sampleRate * 0.18;
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Pink-ish noise: accumulate 3 white noise layers at different speeds
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      data[i] = (b0 + b1 + b2 + w * 0.5362) * 0.11;
    }
    // Exponential decay envelope
    for (let i = 0; i < len; i++) data[i] *= Math.exp(-i / (len * 0.28));

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = "bandpass";
    filter.frequency.value = dir === "next" ? 2200 : 1800;
    filter.Q.value = 0.6;

    const gain     = ctx.createGain();
    gain.gain.value = 0.55;

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.onended = () => ctx.close();
  } catch { /* ignore — AudioContext blocked or unavailable */ }
}

export function App({ posts }: { posts: FeedPost[] }) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [animKey, setAnimKey] = useState(0); // bumped to re-trigger animation

  const go = useCallback(
    (delta: 1 | -1) => {
      setCurrent((c) => {
        const next = Math.max(0, Math.min(posts.length - 1, c + delta));
        if (next === c) return c;
        const d = delta === 1 ? "next" : "prev";
        setDir(d);
        setAnimKey((k) => k + 1);
        playPageTurn(d);
        return next;
      });
    },
    [posts.length],
  );

  // Keyboard: left/right arrow keys turn pages
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  // Keep current in bounds if posts list grows
  useEffect(() => {
    setCurrent((c) => Math.min(c, Math.max(0, posts.length - 1)));
  }, [posts.length]);

  const post = posts[current];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #f0e8dc 0%, #e8ddd0 100%)",
        gap: "0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {posts.length === 0 ? (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "18px",
            color: "#a8998c",
            textAlign: "center",
            lineHeight: "1.7",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>📖</div>
          Loading your feed…
        </div>
      ) : (
        <>
          {/* The post card — animated on page turn */}
          <div
            key={animKey}
            className={dir === "next" ? "mfm-turn-next" : "mfm-turn-prev"}
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <PostPage post={post} />
          </div>

          {/* Navigation bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "18px",
              flexShrink: 0,
            }}
          >
            <NavBtn
              onClick={() => go(-1)}
              disabled={current === 0}
              label="‹ Prev"
            />

            {/* Page indicator */}
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "13px",
                color: "#9b8a7a",
                letterSpacing: "0.04em",
                minWidth: "80px",
                textAlign: "center",
              }}
            >
              {current + 1} / {posts.length}
            </span>

            <NavBtn
              onClick={() => go(1)}
              disabled={current === posts.length - 1}
              label="Next ›"
            />
          </div>
        </>
      )}
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: disabled ? "#c8bdb2" : "#6b5a4a",
        background: disabled ? "transparent" : "rgba(255,255,255,0.7)",
        border: `1px solid ${disabled ? "#ddd4c8" : "#c8b9a8"}`,
        borderRadius: "8px",
        padding: "7px 18px",
        cursor: disabled ? "default" : "pointer",
        letterSpacing: "0.02em",
        transition: "all 0.15s",
        backdropFilter: "blur(4px)",
      }}
    >
      {label}
    </button>
  );
}
