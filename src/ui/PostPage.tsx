import { useState, useEffect, useRef } from "react";
import type { FeedPost } from "../core/types";

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

  // Reset carousel to first slide whenever the post changes
  useEffect(() => {
    setSlide(0);
  }, [post.id]);

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
      {/* ── LEFT: media ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "#111",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <MediaPanel post={post} slide={slide} onSlide={setSlide} />
      </div>

      {/* ── RIGHT: content ──────────────────────────────────────────────── */}
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
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
              <time
                style={{
                  fontFamily: "-apple-system, sans-serif",
                  fontSize: "11px",
                  color: "#a8998a",
                }}
              >
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
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "15px",
                color: "#b5a99a",
                fontStyle: "italic",
                margin: 0,
              }}
            >
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

// ── MediaPanel ───────────────────────────────────────────────────────────────

function MediaPanel({
  post,
  slide,
  onSlide,
}: {
  post: FeedPost;
  slide: number;
  onSlide: (n: number) => void;
}) {
  if (post.videoEl) return <VideoPanel videoEl={post.videoEl} />;

  const imgs = post.images;
  if (imgs.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5a4a3a",
          fontFamily: "Georgia, serif",
          fontSize: "13px",
        }}
      >
        No media
      </div>
    );
  }

  return (
    <PhotoCarousel
      imgs={imgs}
      slide={slide}
      onSlide={onSlide}
      username={post.author.username}
    />
  );
}

// ── PhotoCarousel — imperative scroll so snap actually moves ─────────────────

function PhotoCarousel({
  imgs,
  slide,
  onSlide,
  username,
}: {
  imgs: string[];
  slide: number;
  onSlide: (n: number) => void;
  username: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Imperatively scroll to the correct slide whenever `slide` changes
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: slideWidth * slide, behavior: "smooth" });
  }, [slide]);

  const prev = () => onSlide(Math.max(0, slide - 1));
  const next = () => onSlide(Math.min(imgs.length - 1, slide + 1));

  return (
    <>
      {/* Scroll track */}
      <div ref={trackRef} className="mfm-carousel" style={{ height: "100%" }}>
        {imgs.map((src, i) => (
          <div
            key={i}
            className="mfm-carousel-slide"
            style={{ background: "#111" }}
          >
            <img
              src={src}
              alt={`${username} — ${i + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {imgs.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: "5px",
            pointerEvents: "none",
          }}
        >
          {imgs.map((_, i) => (
            <span
              key={i}
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "white",
                opacity: i === slide ? 1 : 0.35,
                transition: "opacity 0.2s",
              }}
            />
          ))}
        </div>
      )}

      {/* Prev arrow */}
      {imgs.length > 1 && slide > 0 && (
        <button onClick={prev} style={arrowBtn("left")} aria-label="Prev">
          ‹
        </button>
      )}
      {/* Next arrow */}
      {imgs.length > 1 && slide < imgs.length - 1 && (
        <button onClick={next} style={arrowBtn("right")} aria-label="Next">
          ›
        </button>
      )}
    </>
  );
}

// ── VideoPanel ────────────────────────────────────────────────────────────────
// Two strategies depending on video type:
//
//  A) Direct src (MP4/CDN): move the <video> node into our container.
//     Works fine — src is a plain URL, survives DOM reparenting.
//
//  B) Blob src (DASH/MSE): IG uses MediaSource to feed a blob: URL.
//     The MSE binding is tied to the original document context and
//     breaks when the element is reparented across shadow roots.
//     Instead we position-track: keep the video in IG's DOM but
//     absolutely position it to exactly cover our panel using a
//     ResizeObserver + rAF loop. Invisible in IG's hidden feed
//     (visibility:hidden), fully visible in ours (forced visible).

function VideoPanel({ videoEl }: { videoEl: HTMLVideoElement }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el        = videoEl;
    const container = containerRef.current;
    if (!el || !container) return;

    const isBlob = el.src.startsWith("blob:");

    if (!isBlob) {
      // ── Strategy A: move the node ──────────────────────────────────────────
      const originalParent = el.parentElement;
      const nextSibling    = el.nextSibling;
      const placeholder    = document.createElement("div");
      placeholder.style.cssText = `width:${el.offsetWidth}px;height:${el.offsetHeight}px;`;
      originalParent?.insertBefore(placeholder, el);

      el.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;background:#111;";
      el.controls      = true;
      el.playsInline   = true;
      container.appendChild(el);

      return () => {
        el.style.cssText = "";
        if (originalParent && placeholder.parentElement === originalParent) {
          originalParent.insertBefore(el, nextSibling || placeholder);
          placeholder.remove();
        }
      };
    }

    // ── Strategy B: position-track the blob video ──────────────────────────
    // Keep video in IG's DOM but make it visible and overlay our panel exactly.
    const saved = {
      position:   el.style.position,
      top:        el.style.top,
      left:       el.style.left,
      width:      el.style.width,
      height:     el.style.height,
      zIndex:     el.style.zIndex,
      visibility: el.style.visibility,
      objectFit:  el.style.objectFit,
      background: el.style.background,
    };

    el.controls    = true;
    el.playsInline = true;

    let rafId = 0;
    function sync() {
      const rect = container.getBoundingClientRect();
      el.style.cssText = [
        `position:fixed`,
        `top:${rect.top}px`,
        `left:${rect.left}px`,
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        `z-index:9999`,
        `visibility:visible`,
        `object-fit:contain`,
        `background:#111`,
        `pointer-events:auto`,
      ].join(";");
      rafId = requestAnimationFrame(sync);
    }
    sync();

    return () => {
      cancelAnimationFrame(rafId);
      Object.assign(el.style, saved);
    };
  }, [videoEl]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", background: "#111" }}
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
