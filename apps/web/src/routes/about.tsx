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
    <div className="flex-1 px-6 sm:px-10 py-10 sm:py-16 max-w-xl mx-auto w-full flex flex-col gap-6">
      <p className="font-sans text-base text-white/60 leading-relaxed">
        <a
          href="https://www.youtube.com/@t3dotgg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/70 transition-colors"
        >
          Theo
        </a>{" "}
        posts on YouTube a lot. like, constantly. so when he doesn't, people notice.
      </p>

      <p className="font-sans text-base text-white/60 leading-relaxed">
        this site just tracks how long it's been since his last video. that's it.
        when he posts, the counter resets.
      </p>

      <p className="font-sans text-base text-white/60 leading-relaxed">
        the history tab shows every gap between uploads ranked by how long they were.
        some of them are rough.
      </p>

      <p className="font-sans text-base text-white/60 leading-relaxed">
        you can leave your email on the home page and we'll ping you when he's back.
        no spam, just the one email.
      </p>

      <p className="font-mono text-xs text-white/20 mt-4">made for fun</p>
    </div>
  );
}
