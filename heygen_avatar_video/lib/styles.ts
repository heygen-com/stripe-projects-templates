// The composition styles the app can render. Each id maps 1:1 to a self-contained HyperFrames
// project under styles/<id>/. They share the same asset + variable contract (the pipeline stages
// avatar.mp4 + transcript.json and passes the scalar vars below), so adding a style is: drop a new
// HyperFrames project in styles/<id>/ that reads those vars, then add an entry here.
export type StyleId = "product-launch" | "social" | "spokesperson";
export type AspectRatio = "16:9" | "9:16";

export type VideoStyle = {
  id: StyleId;
  label: string;
  description: string;
  aspectRatio: AspectRatio;
  // The color + tagline the composition was designed around. Passed as the brandColor/tagline
  // variables so each style renders in its own palette (overridable later from the UI).
  accent: string;
  tagline: string;
};

export const STYLES: VideoStyle[] = [
  {
    id: "product-launch",
    label: "Product launch",
    description: "Browser-style product UI with floating status chips and your avatar in a card.",
    aspectRatio: "16:9",
    accent: "#2dd4bf",
    tagline: "Built with HeyGen · Stripe Projects",
  },
  {
    id: "social",
    label: "Social",
    description: "Full-bleed vertical video with punchy kinetic captions — for Reels, Shorts, TikTok.",
    aspectRatio: "9:16",
    accent: "#22d3ee",
    tagline: "@heygen",
  },
  {
    id: "spokesperson",
    label: "Spokesperson",
    description: "Cinematic close-up presenter over a clean caption bar.",
    aspectRatio: "16:9",
    accent: "#6d4aff",
    tagline: "Built with HeyGen · Stripe Projects",
  },
];

export const DEFAULT_STYLE: StyleId = "product-launch";

export function getStyle(id?: string | null): VideoStyle {
  return STYLES.find((s) => s.id === id) ?? STYLES.find((s) => s.id === DEFAULT_STYLE)!;
}

export function isStyleId(id: unknown): id is StyleId {
  return typeof id === "string" && STYLES.some((s) => s.id === id);
}
