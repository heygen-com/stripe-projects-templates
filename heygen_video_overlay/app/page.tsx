"use client";

import { useEffect, useState } from "react";
import { AVATARS, DEFAULT_AVATAR_ID } from "@/lib/avatars";

const DEFAULT_TITLE = "Introducing Nova";
const DEFAULT_SCRIPT =
  "Hi, I'm your HeyGen avatar. This starter was provisioned in a single command with Stripe Projects. Edit the script, pick an avatar, and ship your own AI video in minutes.";

const STEPS = [
  { key: "avatar", label: "Generating avatar (HeyGen API)", note: "" },
  { key: "transcribe", label: "Fetching captions", note: "" },
  { key: "render", label: "Rendering composition (HyperFrames)", note: "local" },
];

type Phase = "idle" | "running" | "done" | "error";
type Video = { id: string; title: string; avatar: string; createdAt: string; url: string };
type Tab = "create" | "library";

export default function Home() {
  const [tab, setTab] = useState<Tab>("create");
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [phase, setPhase] = useState<Phase>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<{ message: string; billing?: boolean; pricingUrl?: string } | null>(null);

  async function loadVideos() {
    try {
      const res = await fetch("/api/renders");
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch {
      /* gallery is best-effort */
    }
  }
  useEffect(() => {
    loadVideos();
  }, []);

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
      loadVideos();
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
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "create"} className="tab" onClick={() => setTab("create")}>
            Create
          </button>
          <button role="tab" aria-selected={tab === "library"} className="tab" onClick={() => setTab("library")}>
            Library{videos.length ? <span className="count">{videos.length}</span> : null}
          </button>
        </nav>

        {tab === "create" && (
          <div className="create">
            <section className="player-col">
              <div className="stage">
                {videoUrl ? (
                  <video key={videoUrl} src={videoUrl} controls autoPlay playsInline />
                ) : (
                  <span className="placeholder">
                    {running ? "Generating… this takes a couple of minutes" : "Your video will play here"}
                  </span>
                )}
              </div>

              {running && (
                <ol className="steps">
                  {STEPS.map((s, i) => (
                    <li key={s.key} data-on="active">
                      <span className="mark">{i + 1}</span> {s.label}
                      {s.note && <span className="note"> ({s.note})</span>}
                    </li>
                  ))}
                </ol>
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

            <form className="card compose" onSubmit={onSubmit}>
              <h2>Compose</h2>
              <label className="fld">
                <span className="lab">Title</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="fld">
                <span className="lab">Script <span className="hint">— what the avatar says</span></span>
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
                    pay-as-you-go
                  </a>
                  ). Captions and rendering are free and local.
                </span>
              </div>
              <button className="btn" type="submit" disabled={running}>
                {running ? "Generating…" : "Generate video"}
              </button>
            </form>
          </div>
        )}

        {tab === "library" && (
          <div className="library">
            {videos.length === 0 ? (
              <div className="empty">
                No videos yet. Head to <button className="link" onClick={() => setTab("create")}>Create</button> to make your first one.
              </div>
            ) : (
              <div className="lib-grid">
                {videos.map((v) => (
                  <div className="lib-card" key={v.id}>
                    <video src={v.url} controls preload="metadata" playsInline />
                    <div className="meta">
                      <span className="t">{v.title}</span>
                      <span className="sub2">
                        {v.avatar} · {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <a className="dl" href={v.url} download>
                      ↓ Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
