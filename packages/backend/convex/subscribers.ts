import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getCount = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("subscribers").collect();
    return all.length;
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const addSubscriber = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("subscribers", {
      email: args.email,
      subscribedAt: Date.now(),
    });
  },
});

export const subscribe = action({
  args: {
    email: v.string(),
    turnstileToken: v.string(),
  },
  handler: async (ctx, args) => {
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      throw new Error("Server configuration error");
    }

    const formData = new FormData();
    formData.append("secret", turnstileSecret);
    formData.append("response", args.turnstileToken);

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData },
    );
    const verifyData = (await verifyRes.json()) as { success: boolean };

    if (!verifyData.success) {
      throw new Error("Verification failed. Please try again.");
    }

    // Privacy: always return success even for duplicates
    const existing = await ctx.runQuery(internal.subscribers.getByEmail, {
      email: args.email,
    });
    if (existing) {
      return { success: true };
    }

    await ctx.runMutation(internal.subscribers.addSubscriber, {
      email: args.email,
    });

    // Resend audience sync is non-critical — don't fail the subscription
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const audienceId = process.env.RESEND_AUDIENCE_ID;

      if (resendKey && audienceId) {
        const resendRes = await fetch(
          `https://api.resend.com/audiences/${audienceId}/contacts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: args.email }),
          },
        );
        if (!resendRes.ok) {
          console.error(`Resend contact creation failed: ${resendRes.status}`);
        }
      }
    } catch (err) {
      console.error("Resend error (non-critical):", err);
    }

    return { success: true };
  },
});
