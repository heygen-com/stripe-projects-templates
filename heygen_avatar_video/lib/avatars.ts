// The 3 public avatars shipped with this template. These were validated against the
// HeyGen v3 API (POST /v3/videos, output_format: mp4) and proven to render cleanly. Each is a
// digital-twin look (Avatar IV/V capable) — studio
// avatars are Avatar III and are rejected by /v3/videos, so don't swap those in here.
//
// Thumbnails come from the avatar-looks API (preview_image_url). To refresh, run:
//   heygen avatar looks list --ownership public --avatar-type digital_twin
export type Avatar = {
  id: string; // avatar_id passed to /v3/videos
  name: string;
  voiceId: string; // the look's default_voice_id
  thumbnailUrl: string;
};

export const AVATARS: Avatar[] = [
  {
    id: "e33bb5643adb4ad7a6e154d803e9543b",
    name: "Melina",
    voiceId: "3c7bd3d885e1467b870c9088e6a3cc24",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/e33bb5643adb4ad7a6e154d803e9543b/half/2.2/preview_target.webp",
  },
  {
    id: "c8f428c549ea448488fdb2214dbcad57",
    name: "Kevin",
    voiceId: "5141743c956d4a1298b7126c9639d416",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/c8f428c549ea448488fdb2214dbcad57/half/2.2/preview_target.webp",
  },
  {
    id: "e17d58cf1ccb41ebb7ab21bc2f0bdef3",
    name: "Jayla",
    voiceId: "2875d2da38294e739e28a2f151a0b427",
    thumbnailUrl:
      "https://files2.heygen.ai/avatar/v3/e17d58cf1ccb41ebb7ab21bc2f0bdef3/half/2.2/preview_target.webp",
  },
];

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function getAvatar(id: string): Avatar | undefined {
  return AVATARS.find((a) => a.id === id);
}
