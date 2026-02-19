import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (days === 0 && minutes > 0)
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  return parts.join(", ") || "moments";
}

function buildEmailHtml({
  videoId,
  title,
  droughtDurationMs,
  subscriberCount,
}: {
  videoId: string;
  title: string;
  droughtDurationMs: number;
  subscriberCount: number;
}): string {
  const videoUrl = `https://youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const droughtText =
    droughtDurationMs > 0
      ? `After ${formatDuration(droughtDurationMs)}, Theo has returned!`
      : "Theo just posted a new video!";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Theo Posted: ${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9f9f9;color:#111;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
      <tr><td style="padding:32px 32px 0;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#888;">theocounter.com</p>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#111;">The Drought Is Over!</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#555;">${droughtText}</p>
      </td></tr>
      <tr><td style="padding:0 32px;">
        <a href="${videoUrl}" target="_blank" style="display:block;text-decoration:none;">
          <img src="${thumbnailUrl}" alt="${title}" width="100%" style="display:block;border-radius:8px;border:0;" />
        </a>
      </td></tr>
      <tr><td style="padding:20px 32px 24px;">
        <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111;">${title}</h2>
        <a href="${videoUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Watch now →</a>
      </td></tr>
      <tr><td style="padding:0 32px 24px;">
        <p style="margin:0;font-size:13px;color:#888;">${subscriberCount.toLocaleString()} people were watching the counter alongside you.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:12px;color:#aaa;">You&apos;re receiving this because you subscribed at <a href="https://theocounter.com" style="color:#888;">theocounter.com</a>. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888;">Unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export const sendNewVideoBroadcast = internalAction({
  args: {
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.string(),
    droughtDurationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!resendKey || !audienceId) {
      console.error(
        "RESEND_API_KEY or RESEND_AUDIENCE_ID not set — skipping broadcast",
      );
      return;
    }

    const subscriberCount = await ctx.runQuery(api.subscribers.getCount);

    const html = buildEmailHtml({
      videoId: args.videoId,
      title: args.title,
      droughtDurationMs: args.droughtDurationMs,
      subscriberCount,
    });

    const res = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `New Video: ${args.title}`,
        audienceId,
        from: "Theo Counter <notifications@theocounter.com>",
        subject: `Theo Posted: ${args.title}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Resend broadcast failed: ${res.status} — ${err}`);
    } else {
      console.info(`Broadcast sent for video: ${args.title}`);
    }
  },
});
