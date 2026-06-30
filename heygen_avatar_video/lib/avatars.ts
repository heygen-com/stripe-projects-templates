// The 3 public avatars shipped with this template. Each is a digital-twin look from HeyGen's public
// catalog, Avatar IV/V capable with a default voice. Studio avatars are Avatar III and are rejected
// by /v3/videos (supported_api_engines is empty), so don't swap those in here.
//
// Thumbnails come from the avatar-looks API (preview_image_url). To refresh, run:
//   heygen avatar looks list --ownership public --avatar-type digital_twin
export type Avatar = {
  id: string; // avatar_id passed to /v3/videos
  name: string;
  voiceId: string; // the look's default_voice_id
  thumbnailUrl: string;
  speed?: number; // voice speed multiplier (1.0 = normal); set <1 to slow a fast voice
};

export const AVATARS: Avatar[] = [
  {
    id: "222ff1a5d33645e8ab97d0f07fad94e7",
    name: "Eric",
    voiceId: "dcbdda2d26bc4a33a817154e00440bf9",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/222ff1a5d33645e8ab97d0f07fad94e7/half/2.2/preview_target.webp",
  },
  {
    id: "ab1db5a0aeff4778bb0b8d9cce82ea4a",
    name: "Valeria",
    // Her catalog default_voice_id (2d4c…) 404s on /v3/videos ("Voice not found"); use a valid
    // platform voice (Jessica Anne Bogart, from GET /v2/voices) instead.
    voiceId: "b966c31caf124c2a99f19ff1479c964f",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/ab1db5a0aeff4778bb0b8d9cce82ea4a/half/2.2/preview_target.webp",
  },
  {
    id: "660d840fa6a5491cb60e4e1a3148feb3",
    name: "Zain",
    voiceId: "356156e8f0e84c9e982744e4b0cd3208",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/660d840fa6a5491cb60e4e1a3148feb3/half/2.2/preview_target.webp",
    speed: 0.9, // his default voice runs fast; ease it down a touch
  },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function getAvatar(id: string): Avatar | undefined {
  return AVATARS.find((a) => a.id === id);
}
