import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | theocounter" },
      {
        name: "description",
        content:
          "What is theocounter.com and why does it exist? Everything you need to know.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="flex-1 px-6 sm:px-10 py-10 sm:py-16 max-w-2xl mx-auto w-full">
      <section className="mb-12">
        <p className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-4">
          The subject
        </p>
        <h2 className="font-mono text-2xl sm:text-3xl font-bold text-white/90 mb-4 leading-snug">
          Theo posts constantly.
          <br />
          Until he doesn't.
        </h2>
        <p className="font-sans text-sm sm:text-base text-white/45 leading-relaxed">
          <a
            href="https://www.youtube.com/@t3dotgg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60"
          >
            Theo (t3dotgg)
          </a>{" "}
          is one of the most prolific voices in developer YouTube — covering TypeScript,
          React, AI, and whatever is currently on fire in the web dev world. He uploads
          with an intensity that makes the rest of us feel unproductive. When he goes
          quiet, the community notices immediately.
        </p>
      </section>

      <section className="mb-12">
        <p className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-4">
          What this is
        </p>
        <h2 className="font-mono text-2xl sm:text-3xl font-bold text-white/90 mb-4 leading-snug">
          A live measure of the silence.
        </h2>
        <p className="font-sans text-sm sm:text-base text-white/45 leading-relaxed mb-4">
          theocounter.com tracks exactly how long it's been since Theo last uploaded to
          YouTube — down to the second. When a new video drops, the counter resets.
        </p>
        <p className="font-sans text-sm sm:text-base text-white/45 leading-relaxed">
          The{" "}
          <span className="text-white/60 font-medium">History</span>{" "}
          tab records every gap between uploads — the droughts — ranked by duration. A
          permanent record of every time Theo made us wait.
        </p>
      </section>

      <section className="mb-0">
        <p className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-4">
          Stay informed
        </p>
        <h2 className="font-mono text-2xl sm:text-3xl font-bold text-white/90 mb-4 leading-snug">
          Know the moment it ends.
        </h2>
        <p className="font-sans text-sm sm:text-base text-white/45 leading-relaxed mb-8">
          Drop your email on the home screen. The instant Theo posts again, you'll get a
          notification. No spam, no newsletter — just the one signal you actually care
          about.
        </p>

        <div className="border border-white/[0.06] rounded-2xl p-6">
          <p className="font-mono text-xs text-white/20 tracking-wide">
            built because someone had to
          </p>
        </div>
      </section>
    </div>
  );
}
