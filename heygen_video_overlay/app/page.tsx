"use client";

import { useEffect, useMemo, useState } from "react";
import { AVATARS, DEFAULT_AVATAR_ID } from "@/lib/avatars";

const DEFAULT_TITLE = "Meet Nova";
const DEFAULT_SCRIPT =
  "Hi, I'm Nova — your AI spokesperson. Type a script, pick a look, and I'll turn it into a branded video in minutes. No camera, no crew.";
const SCRIPT_MAX = 280; // keeps speech under the composition's ~20s body window (no truncation)
const DEMO_URL = "/demo.mp4";

const STEPS = ["Generating avatar (HeyGen API)", "Fetching captions", "Rendering composition (HyperFrames)"];

type Status = "processing" | "done" | "error";
type Video = {
  id: string; title: string; avatar: string; status: Status; createdAt: string;
  url?: string; error?: string; billing?: boolean; pricingUrl?: string;
};
type Account = { firstName: string; email: string; balance: string | null };
type Tab = "create" | "library";

export default function Home() {
  const [tab, setTab] = useState<Tab>("create");
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [videos, setVideos] = useState<Video[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(DEMO_URL); // free demo plays out of the box

  async function loadVideos() {
    try {
      const data = await (await fetch("/api/renders")).json();
      const vids: Video[] = data.videos ?? [];
      setVideos(vids);
      setActiveId((cur) => cur ?? vids.find((v) => v.status === "processing")?.id ?? null);
    } catch {
      /* best-effort */
    }
  }
  useEffect(() => {
    loadVideos();
    fetch("/api/account").then((r) => r.json()).then(setAccount).catch(() => {});
  }, []);

  const hasProcessing = videos.some((v) => v.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const t = setInterval(loadVideos, 4000);
    return () => clearInterval(t);
  }, [hasProcessing]);

  const active = useMemo(() => videos.find((v) => v.id === activeId), [videos, activeId]);
  useEffect(() => {
    if (active?.status === "done" && active.url) setVideoUrl(active.url);
  }, [active]);

  const running = active?.status === "processing";
  const errored = active?.status === "error" ? active : null;
  const done = videos.filter((v) => v.status === "done");
  const showingDemo = videoUrl === DEMO_URL;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, script, avatarId }),
      });
      const data = await res.json();
      if (!res.ok) return;
      setActiveId(data.jobId);
      loadVideos();
    } catch {
      /* job may still run server-side; polling will surface it */
    }
  }

  const initial = (account?.firstName || account?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <div className="brand">
            <img className="orb" src="/heygen-orb.svg" alt="" />
            <span className="hg">HeyGen&nbsp;Studio</span>
          </div>
          <div className="acct">
            {account?.balance && (
              <span className="credits" title="HeyGen wallet balance">
                <span className="coin" aria-hidden="true">◆</span> {account.balance}
              </span>
            )}
            {(account?.firstName || account?.email) && (
              <span className="avatar-initial" title={`${account?.firstName || ""}  ${account?.email || ""}`.trim()}>
                {initial}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="wrap">
        {account?.firstName && <p className="welcome">Welcome back, {account.firstName}.</p>}

        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "create"} className="tab" onClick={() => setTab("create")}>
            Create
          </button>
          <button role="tab" aria-selected={tab === "library"} className="tab" onClick={() => setTab("library")}>
            Library{done.length ? <span className="count">{done.length}</span> : null}
          </button>
        </nav>

        {tab === "create" && (
          <div className="create">
            <section className="player-col">
              <div className="stage">
                {running ? (
                  <div className="generating">
                    <div className="spinner" />
                    <span>Generating… this keeps running even if you refresh.</span>
                  </div>
                ) : (
                  <>
                    <video key={videoUrl} src={videoUrl} controls autoPlay={!showingDemo} playsInline />
                    {showingDemo && <span className="demo-pill">Demo · free to watch</span>}
                  </>
                )}
              </div>

              {running && (
                <ol className="steps">
                  {STEPS.map((s, i) => (
                    <li key={s} data-on="active">
                      <span className="mark">{i + 1}</span> {s}
                    </li>
                  ))}
                </ol>
              )}

              {errored && (
                <div className="err">
                  <span>⚠</span>
                  <span>
                    {errored.billing ? "Out of HeyGen credits. " : ""}
                    {errored.error}
                    {errored.billing && errored.pricingUrl && (
                      <>
                        {" "}
                        <a href={errored.pricingUrl} target="_blank" rel="noopener">Check pricing / top up</a>.
                      </>
                    )}
                  </span>
                </div>
              )}
            </section>

            <form className="card compose" onSubmit={onSubmit}>
              <h2>New video</h2>
              <label className="fld">
                <span className="lab">Title</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </label>
              <label className="fld">
                <span className="lab">
                  Script <span className="hint">— what the avatar says</span>
                </span>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value.slice(0, SCRIPT_MAX))}
                  maxLength={SCRIPT_MAX}
                />
                <span className={`counter ${script.length > SCRIPT_MAX - 30 ? "near" : ""}`}>
                  {script.length}/{SCRIPT_MAX}
                </span>
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
                  <a href="https://developers.heygen.com/docs/pricing" target="_blank" rel="noopener">pay-as-you-go</a>
                  ). The demo above is free; captions and rendering are local.
                </span>
              </div>
              <button className="btn" type="submit" disabled={running || !script.trim()}>
                {running ? "Generating…" : "Generate video"}
              </button>
            </form>
          </div>
        )}

        {tab === "library" && (
          <div className="library">
            {done.length === 0 ? (
              <div className="empty">
                No videos yet. Head to <button className="link" onClick={() => setTab("create")}>Create</button> to make your first one.
              </div>
            ) : (
              <div className="lib-grid">
                {done.map((v) => (
                  <div className="lib-card" key={v.id}>
                    <video src={v.url} controls preload="metadata" playsInline />
                    <div className="meta">
                      <span className="t">{v.title}</span>
                      <span className="sub2">{v.avatar} · {new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <a className="dl" href={v.url} download>↓ Download</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="foot">
          <span className="dot" /> Provisioned via Stripe Projects · <code>heygen/api</code>
        </footer>
      </div>
    </>
  );
}
