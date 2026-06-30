"use client";

import { useEffect, useMemo, useState } from "react";
import { AVATARS, DEFAULT_AVATAR_ID } from "@/lib/avatars";
import { STYLES, DEFAULT_STYLE } from "@/lib/styles";

const DEFAULT_TITLE = "Meet Nova";
const DEFAULT_SCRIPT =
  "Hi, I'm Nova — your AI spokesperson. Type a script, pick a look, and I'll turn it into a branded video in minutes. No camera, no crew.";
const SCRIPT_MAX = 280; // keeps speech under the composition's ~20s body window (no truncation)
const SAMPLE = { url: "/demo.mp4", title: "Sample · Meet Nova", avatar: "Melina" }; // bundled free example

const STEPS = ["Generating avatar (HeyGen API)", "Fetching captions", "Rendering composition (HyperFrames)"];

type Status = "processing" | "done" | "error";
type Video = {
  id: string; title: string; avatar: string; status: Status; createdAt: string;
  style?: string; aspectRatio?: string;
  url?: string; error?: string; billing?: boolean; pricingUrl?: string;
};
type Account = { firstName: string; email: string; balance: string | null };
type Tab = "create" | "library";

export default function Home() {
  const [tab, setTab] = useState<Tab>("create");
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [styleId, setStyleId] = useState<string>(DEFAULT_STYLE);
  const [videos, setVideos] = useState<Video[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // result slot = YOUR video only
  const [resultAr, setResultAr] = useState<string | null>(null); // aspect ratio of the shown result
  const [sampleOpen, setSampleOpen] = useState(false); // sample plays in a modal, never the result slot
  const [barOpen, setBarOpen] = useState(true);
  const [demoNote, setDemoNote] = useState<string | null>(null); // set when Generate runs in demo mode (no key)

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

  useEffect(() => {
    if (!sampleOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setSampleOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sampleOpen]);

  const active = useMemo(() => videos.find((v) => v.id === activeId), [videos, activeId]);
  useEffect(() => {
    if (active?.status === "done" && active.url) {
      setVideoUrl(active.url);
      setResultAr(active.aspectRatio ?? "16:9");
      setDemoNote(null);
    }
  }, [active]);

  const selectedStyle = useMemo(() => STYLES.find((s) => s.id === styleId) ?? STYLES[0], [styleId]);
  // The stage shape: a finished result uses its own ratio; before that, preview the selected style's.
  const stageAr = videoUrl ? resultAr ?? "16:9" : selectedStyle.aspectRatio;

  const running = active?.status === "processing";
  const errored = active?.status === "error" ? active : null;
  const done = videos.filter((v) => v.status === "done");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, script, avatarId, style: styleId }),
      });
      const data = await res.json();
      if (!res.ok) return;
      if (data.demo) {
        // No key yet — show the bundled sample as the result, clearly labeled.
        setVideoUrl(data.url);
        setResultAr("16:9"); // the bundled demo is 16:9
        setDemoNote(data.message);
        return;
      }
      setDemoNote(null);
      setActiveId(data.jobId);
      loadVideos();
    } catch {
      /* job may still run server-side; polling will surface it */
    }
  }

  async function deleteVideo(id: string) {
    const v = videos.find((x) => x.id === id);
    await fetch(`/api/renders/${id}`, { method: "DELETE" }).catch(() => {});
    if (v?.url && videoUrl === v.url) setVideoUrl(null);
    if (activeId === id) setActiveId(null);
    loadVideos();
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
              <span className="credits" title="Your HeyGen wallet — generating draws from this">
                <span className="wlab">Wallet</span> <span className="coin" aria-hidden="true">◆</span> {account.balance}
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
        <section className="hero">
          <p className="hero-eyebrow">
            {account?.firstName ? `Welcome back, ${account.firstName}` : "HeyGen × HyperFrames"}
          </p>
          <h1 className="hero-title">Turn a script into a branded AI video.</h1>
          <p className="hero-sub">
            A HeyGen avatar composed over motion graphics with synced captions, rendered locally with
            HyperFrames — with the HeyGen API provisioned in one command via Stripe Projects. Type a
            script, pick a look, and generate.
          </p>
        </section>

        {barOpen && (
          <div className="sample-bar">
            <span>👋 New here? Watch a 15-second sample made with HeyGen&nbsp;+&nbsp;HyperFrames.</span>
            <div className="sample-bar-actions">
              <button type="button" className="sample-cta" onClick={() => setSampleOpen(true)}>
                ▶ Watch sample
              </button>
              <button type="button" className="bar-x" aria-label="Dismiss" onClick={() => setBarOpen(false)}>
                ✕
              </button>
            </div>
          </div>
        )}

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
              <div className="stage" data-ar={stageAr}>
                {running ? (
                  <div className="generating">
                    <div className="spinner" />
                    <span>Generating… this keeps running even if you refresh.</span>
                  </div>
                ) : videoUrl ? (
                  <video key={videoUrl} src={videoUrl} controls autoPlay playsInline />
                ) : (
                  <span className="placeholder">Your video will appear here</span>
                )}
              </div>

              {demoNote && (
                <div className="demo-result">
                  <span className="d-badge">Demo</span>
                  <span>{demoNote}</span>
                </div>
              )}

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
              <span className="pick-lab">Style</span>
              <div className="styles-pick" role="group" aria-label="Choose a composition style">
                {STYLES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="style-opt"
                    aria-pressed={styleId === s.id}
                    onClick={() => setStyleId(s.id)}
                    title={s.description}
                  >
                    <span className="so-name">{s.label}</span>
                    <span className="so-ar">{s.aspectRatio}</span>
                  </button>
                ))}
              </div>
              <p className="style-desc">{selectedStyle.description}</p>

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
                  ). The sample is free to watch; captions and rendering are local.
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
            <div className="lib-grid">
              {/* Pinned bundled sample — always present, free, not deletable */}
              <div className="lib-card" data-status="sample">
                <video src={SAMPLE.url} controls preload="metadata" playsInline />
                <div className="meta">
                  <span className="t">{SAMPLE.title} <span className="tag">Sample</span></span>
                  <span className="sub2">{SAMPLE.avatar} · bundled example, free to watch</span>
                </div>
                <div className="card-actions">
                  <a className="dl" href={SAMPLE.url} download>↓ Download</a>
                </div>
              </div>
              {videos.length === 0 && (
                <div className="lib-card empty-card">
                  <div className="lib-ph">
                    <span>Your videos will appear here</span>
                    <button className="link" onClick={() => setTab("create")}>Create one →</button>
                  </div>
                </div>
              )}
              {videos.map((v) => (
                  <div className="lib-card" key={v.id} data-status={v.status} data-ar={v.aspectRatio ?? "16:9"}>
                    {v.status === "done" && v.url ? (
                      <video src={v.url} controls preload="metadata" playsInline />
                    ) : v.status === "processing" ? (
                      <div className="lib-ph">
                        <div className="spinner" />
                        <span>Generating…</span>
                      </div>
                    ) : (
                      <div className="lib-ph err-ph">
                        <span>⚠ Generation failed</span>
                      </div>
                    )}
                    <div className="meta">
                      <span className="t">{v.title}</span>
                      <span className="sub2">{v.avatar} · {new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="card-actions">
                      {v.status === "done" && v.url && (
                        <a className="dl" href={v.url} download>↓ Download</a>
                      )}
                      <button className="del" onClick={() => deleteVideo(v.id)} aria-label="Delete video" title="Delete">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <footer className="foot">
          <span className="dot" /> Provisioned via Stripe Projects · <code>heygen/api</code>
        </footer>
      </div>

      {sampleOpen && (
        <div className="modal-backdrop" onClick={() => setSampleOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Sample video" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Sample · {SAMPLE.title.replace("Sample · ", "")}</span>
              <button type="button" className="bar-x" aria-label="Close" onClick={() => setSampleOpen(false)}>✕</button>
            </div>
            <video src={SAMPLE.url} controls autoPlay playsInline />
            <p className="modal-note">A bundled example made with this template — a HeyGen avatar composed in HyperFrames. Free to watch; making your own spends credits.</p>
          </div>
        </div>
      )}
    </>
  );
}
