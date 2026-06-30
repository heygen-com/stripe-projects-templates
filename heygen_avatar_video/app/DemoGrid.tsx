"use client";

import { useEffect, useRef } from "react";

const DEMOS = [
  { src: "/demos/product-launch.mp4", style: "Product launch", blurb: "Browser-style product UI, avatar in a card.", ar: "16:9" },
  { src: "/demos/social.mp4", style: "Social", blurb: "Full-bleed vertical with kinetic captions.", ar: "9:16" },
  { src: "/demos/spokesperson.mp4", style: "Spokesperson", blurb: "Cinematic presenter over a caption bar.", ar: "16:9" },
];

export default function DemoGrid() {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // Start all three together: hold playback until every clip can play, then play from 0 in lockstep
  // (the demos are near-identical length, so a synced start keeps them aligned through the loop).
  useEffect(() => {
    const vids = refs.current.filter(Boolean) as HTMLVideoElement[];
    if (!vids.length) return;
    let started = false;
    const start = () => {
      if (started || !vids.every((v) => v.readyState >= 3)) return;
      started = true;
      for (const v of vids) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };
    for (const v of vids) v.addEventListener("canplay", start);
    start();
    return () => {
      for (const v of vids) v.removeEventListener("canplay", start);
    };
  }, []);

  return (
    <div className="lp-grid">
      {DEMOS.map((d, i) => (
        <figure key={d.style} className="lp-card" data-ar={d.ar}>
          <div className="lp-vid">
            <video
              ref={(el) => {
                refs.current[i] = el;
              }}
              src={d.src}
              loop
              muted
              playsInline
              preload="auto"
            />
          </div>
          <figcaption>
            <span className="lp-style">{d.style} <span className="lp-ar">{d.ar}</span></span>
            <span className="lp-blurb">{d.blurb}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
