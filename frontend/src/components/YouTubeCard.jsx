/**
 * YouTubeCard.jsx
 * ----------------------------------------------------------------------------
 * Renders a single training module's companion video as a clickable
 * thumbnail "box" — visually similar to the cards on YouTube's own homepage
 * grid — rather than an inline <iframe> player. This was a deliberate team
 * choice (see chat/requirements): the clip does not need to play inside
 * Weblook Shield, it just needs to be clearly PRESENT on the module page,
 * and clicking it opens the real video on YouTube in a new tab.
 *
 * WHY A THUMBNAIL CARD INSTEAD OF AN <iframe> EMBED:
 *   1. No third-party script/cookie is loaded into the page until the user
 *      actually chooses to leave for YouTube — a small privacy/performance
 *      win (the page stays fully self-contained otherwise).
 *   2. It matches the Content-Security-Policy posture already set up by
 *      Helmet in backend/src/app.js — we don't need to special-case the
 *      CSP to allow youtube.com as a frame-src.
 *   3. YouTube's thumbnail CDN (img.youtube.com) is public and keyless —
 *      no API quota, no API key to manage/leak.
 *
 * HOW THE VIDEO ID IS FOUND:
 *   Accepts any of the common YouTube URL shapes a non-technical admin
 *   might paste in (watch?v=, youtu.be/, /embed/, with or without extra
 *   query params) and extracts the 11-character video ID with one regex.
 *   If the URL is missing or doesn't look like YouTube, the component
 *   renders nothing — a module simply has no video card rather than a
 *   broken-looking placeholder.
 * ----------------------------------------------------------------------------
 */
import React from 'react';

// Matches the video ID out of watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID —
// whatever shape of YouTube URL ends up pasted into the seed data or (later)
// an admin "edit module" form.
function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * @param {string} url   Full YouTube URL (from training_modules.video_url)
 * @param {string} title Module title, used for the thumbnail's alt text
 * @param {'default'|'compact'} variant
 *    'default' — larger card used on the module detail page, right under
 *                the topic heading.
 *    'compact' — smaller card used on the Training list page grid.
 */
export default function YouTubeCard({ url, title, variant = 'default' }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null; // no video configured for this module — render nothing

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // hqdefault.jpg exists for every uploaded video (unlike maxresdefault.jpg,
  // which is only generated for higher-resolution uploads), so it's the
  // safer default to rely on without a fallback-image handler.
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const isCompact = variant === 'compact';

  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Watch the companion video for ${title} on YouTube (opens in a new tab)`}
      className={`group relative block overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm transition hover:shadow-md ${
        isCompact ? 'aspect-video w-full' : 'mt-3 aspect-video w-full max-w-xl'
      }`}
    >
      <img
        src={thumbnailUrl}
        alt={`Video thumbnail for ${title}`}
        className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
        loading="lazy"
      />

      {/* Darkening gradient so the play button and label stay legible over any thumbnail */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Play button — brand red, matches the Red/Gray/White theme rather than YouTube's own red */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`flex items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition group-hover:scale-110 group-hover:bg-brand-500 ${
            isCompact ? 'h-10 w-10' : 'h-14 w-14'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={isCompact ? 'h-4 w-4' : 'h-6 w-6'}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* "Watch on YouTube" label, bottom-left, like a YouTube grid card's corner badge */}
      <span
        className={`absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 font-medium text-white ${
          isCompact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        Watch on YouTube ↗
      </span>
    </a>
  );
}
