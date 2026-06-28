import { useState, useEffect, useRef } from "react";
import type { FeedPost, Slide } from "../core/types";

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function PostPage({ post }: { post: FeedPost }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => { setSlide(0); }, [post.id]);

  const slides = post.slides;

  return (
    <article
      style={{
        width: "86vw",
        maxWidth: "1080px",
        height: "80vh",
        minHeight: "460px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow:
          "0 6px 40px rgba(40,25,10,0.14), 0 1px 4px rgba(40,25,10,0.07)",
        border: "1px solid #d8cfc4",
        background: "#ffffff",
      }}
    >
      {/* ── LEFT: media ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "#111",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <MediaPanel slides={slides} slide={slide} onSlide={setSlide} />
      </div>

      {/* ── RIGHT: content ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#faf7f2",
          borderLeft: "1px solid #e2d9ce",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Author header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "24px 28px 18px",
            borderBottom: "1px solid #e2d9ce",
            flexShrink: 0,
          }}
        >
          {post.author.avatarUrl && (
            <img
              src={post.author.avatarUrl}
              alt={post.author.username}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: "2px solid #e2d9ce",
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <a
              href={post.author.profileUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 700,
                fontSize: "14px",
                color: "#1a1209",
                textDecoration: "none",
                letterSpacing: "0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {post.author.username}
            </a>
            {post.timestamp && (
              <time style={{ fontFamily: "-apple-system, sans-serif", fontSize: "11px", color: "#a8998a" }}>
                {formatDate(post.timestamp)}
              </time>
            )}
          </div>
        </header>

        {/* Caption */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            scrollbarWidth: "thin",
            scrollbarColor: "#d0c5b8 transparent",
          }}
        >
          {post.caption ? (
            <p
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "16px",
                lineHeight: "1.9",
                color: "#2c2010",
                letterSpacing: "0.012em",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {post.caption}
            </p>
          ) : (
            <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#b5a99a", fontStyle: "italic", margin: 0 }}>
              No caption.
            </p>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: "10px 28px",
            borderTop: "1px solid #e2d9ce",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <a
            href={`https://www.instagram.com/p/${post.id}/`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: "-apple-system, sans-serif",
              fontSize: "10px",
              color: "#b5a99a",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Open ›
          </a>
        </footer>
      </div>
    </article>
  );
}

// ── MediaPanel ────────────────────────────────────────────────────────────────

function MediaPanel({
  slides,
  slide,
  onSlide,
}: {
  slides: Slide[];
  slide: number;
  onSlide: (n: number) => void;
}) {
  if (slides.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a4a3a", fontFamily: "Georgia, serif", fontSize: "13px" }}>
        No media
      </div>
    );
  }

  const prev = () => onSlide(Math.max(0, slide - 1));
  const next = () => onSlide(Math.min(slides.length - 1, slide + 1));

  return (
    <>
      <SlideView s={slides[slide]} />

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div style={{ position: "absolute", bottom: "12px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "5px", pointerEvents: "none" }}>
          {slides.map((_, i) => (
            <span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "white", opacity: i === slide ? 1 : 0.35, transition: "opacity 0.2s" }} />
          ))}
        </div>
      )}

      {slides.length > 1 && slide > 0 && (
        <button onClick={prev} style={arrowBtn("left")} aria-label="Prev">‹</button>
      )}
      {slides.length > 1 && slide < slides.length - 1 && (
        <button onClick={next} style={arrowBtn("right")} aria-label="Next">›</button>
      )}
    </>
  );
}

// ── SlideView — renders one slide (image or video) ────────────────────────────

function SlideView({ s }: { s: Slide }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause/play when slide becomes active/inactive
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch(() => {});
    return () => { el.pause(); };
  }, [s]);

  if (s.type === 'video' && s.url && s.url !== s.poster) {
    return (
      <video
        ref={videoRef}
        src={s.url}
        poster={s.poster}
        controls
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", background: "#111", display: "block" }}
      />
    );
  }

  // Image slide, or video with no CDN url (use poster as static image)
  const src = s.type === 'video' ? (s.poster || '') : s.url;
  return (
    <img
      src={src}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
    />
  );
}

function arrowBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.45)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(3px)",
  };
}
