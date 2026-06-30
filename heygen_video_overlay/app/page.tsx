"use client";

import { useState } from "react";
import { AVATARS, DEFAULT_AVATAR_ID } from "@/lib/avatars";

const DEFAULT_TITLE = "Introducing Nova";
const DEFAULT_SCRIPT =
  "Hi, I'm your HeyGen avatar. This starter was provisioned in a single command with Stripe Projects. Edit the script, pick an avatar, and ship your own AI video in minutes.";

// User-facing progress groups. The matting + render are the long ones, so they get sub-status.
const STEPS = [
  { key: "avatar", label: "Generating avatar (HeyGen API)", note: "" },
  { key: "transcribe", label: "Fetching captions", note: "" },
  { key: "render", label: "Rendering composition (HyperFrames)", note: "local" },
];

type Phase = "idle" | "running" | "done" | "error";

export default function Home() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [phase, setPhase] = useState<Phase>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; billing?: boolean; pricingUrl?: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("running");
    setError(null);
    setVideoUrl(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, script, avatarId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error, billing: data.billing, pricingUrl: data.pricingUrl });
        setPhase("error");
        return;
      }
      setVideoUrl(data.url);
      setPhase("done");
    } catch {
      setError({ message: "Network error — is the dev server still running?" });
      setPhase("error");
    }
  }

  const running = phase === "running";

  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <div className="brand">
            <img className="orb" src="/heygen-orb.svg" alt="" />
            <span className="hg">HeyGen</span>
            <span className="slash">/</span>
            <span className="sub">AI Video Overlay</span>
          </div>
          <span className="badge">
            <span className="dot" /> provisioned via Stripe Projects · <code>heygen/api</code>
          </span>
        </div>
      </header>

      <div className="wrap">
        <section className="lede">
          <h1>Turn a script into a branded AI video</h1>
          <p>
            Pick an avatar, write a line, and generate a motion-graphics video with word-synced
            captions — rendered locally with HyperFrames. The avatar step runs on the HeyGen API key
            your Stripe Projects scaffold pulled in.
          </p>
        </section>

        <div className="grid">
          <form className="card" onSubmit={onSubmit}>
            <h2>Compose</h2>

            <label className="fld">
              <span className="lab">
                Title <span className="hint">— shown as the on-screen headline</span>
              </span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>

            <label className="fld">
              <span className="lab">
                Script <span className="hint">— what the avatar says</span>
              </span>
              <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            </label>

            <span className="pick-lab">Avatar</span>
            <div className="avatars" role="group" aria-label="Choose an avatar">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="avatar"
                  aria-pressed={avatarId === a.id}
                  onClick={() => setAvatarId(a.id)}
                >
                  <img className="thumb" src={a.thumbnailUrl} alt={a.name} />
                  <span className="chk">✓</span>
                  <span className="nm">{a.name}</span>
                </button>
              ))}
            </div>

            <div className="notice">
              <span className="i">!</span>
              <span>
                Generating spends <b>HeyGen credits</b> (
                <a href="https://developers.heygen.com/docs/pricing" target="_blank" rel="noopener">
                  pay-as-you-go pricing
                </a>
                ). Captions, motion graphics, and rendering are free and run locally.
              </span>
            </div>

            <button className="btn" type="submit" disabled={running}>
              {running ? "Generating…" : "Generate video"}
            </button>
          </form>

          <section className="card">
            <h2>Result</h2>
            <div className="stage">
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay playsInline />
              ) : (
                <span className="placeholder">
                  {running ? "Generating… this takes a few minutes" : "Your video will play here"}
                </span>
              )}
            </div>

            {(running || phase === "done") && (
              <ol className="steps">
                {STEPS.map((s, i) => (
                  <li key={s.key} data-on={phase === "done" ? "done" : running ? "active" : "idle"}>
                    <span className="mark">{i + 1}</span> {s.label}
                    {s.note && <span className="note"> ({s.note})</span>}
                  </li>
                ))}
              </ol>
            )}

            {videoUrl && (
              <a className="dl" href={videoUrl} download>
                ↓ Download final.mp4
              </a>
            )}

            {error && (
              <div className="err">
                <span>⚠</span>
                <span>
                  {error.billing ? "Out of HeyGen credits. " : ""}
                  {error.message}
                  {error.billing && error.pricingUrl && (
                    <>
                      {" "}
                      <a href={error.pricingUrl} target="_blank" rel="noopener">
                        Check pricing / top up
                      </a>
                      .
                    </>
                  )}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
