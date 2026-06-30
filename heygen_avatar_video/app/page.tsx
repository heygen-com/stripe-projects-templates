import Link from "next/link";
import DemoGrid from "./DemoGrid";

const STEPS = [
  { n: "1", t: "Write a script", d: "Type a title and a few lines. Pick a style and an avatar." },
  { n: "2", t: "HeyGen speaks it", d: "The HeyGen API renders a talking avatar — provisioned in one command via Stripe Projects." },
  { n: "3", t: "HyperFrames composes it", d: "Locally and free: motion graphics, synced captions, your branded video." },
];

export default function Landing() {
  return (
    <>
      <header className="bar">
        <div className="bar-inner">
          <a className="brand" href="/" aria-label="HeyGen Studio home">
            <img className="orb" src="/heygen-orb.svg" alt="" />
            <span className="hg">HeyGen&nbsp;Studio</span>
          </a>
          <Link className="bar-link" href="/studio">Open Studio →</Link>
        </div>
      </header>

      <main className="lp">
        <section className="lp-hero">
          <p className="lp-eyebrow">HeyGen × HyperFrames · provisioned via Stripe Projects</p>
          <h1 className="lp-title">Turn a script into a branded AI video.</h1>
          <p className="lp-sub">
            A HeyGen avatar composed over motion graphics with word-synced captions, rendered locally
            with HyperFrames. Type a script, pick a style, and generate, no camera, no crew.
          </p>
          <div className="lp-actions">
            <Link className="lp-cta" href="/studio">
              Create your own video <span className="arr" aria-hidden="true">→</span>
            </Link>
            <a className="lp-ghost" href="#styles">See the styles</a>
          </div>
        </section>

        <section id="styles" className="lp-demos">
          <h2 className="lp-h2">Three styles, one script</h2>
          <p className="lp-lede">Every video starts from the same script. The style decides the look, layout, captions, and shape.</p>
          <DemoGrid />
        </section>

        <section className="lp-how">
          <h2 className="lp-h2">How it works</h2>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="lp-num">{s.n}</span>
                <span className="lp-step-t">{s.t}</span>
                <span className="lp-step-d">{s.d}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-band">
          <h2 className="lp-band-h">Make your first one in a minute.</h2>
          <Link className="lp-cta lp-cta-lg" href="/studio">
            Create your own video <span className="arr" aria-hidden="true">→</span>
          </Link>
          <p className="lp-band-note">Works instantly with a bundled demo; add the <code>heygen/api</code> service to render your own script.</p>
        </section>
      </main>

      <footer className="lp-foot">
        <span className="dot" /> Provisioned via Stripe Projects · <code>heygen/api</code> · built with HeyGen + HyperFrames
      </footer>
    </>
  );
}
