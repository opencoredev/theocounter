import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

export const getCount = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("subscribers").collect();
    return all.filter((s) => s.confirmed !== false).length;
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

export const getByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscribers")
      .withIndex("by_confirmationToken", (q) =>
        q.eq("confirmationToken", args.token),
      )
      .first();
  },
});

export const upsertPending = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        confirmationToken: args.token,
        tokenExpiresAt: args.tokenExpiresAt,
        subscribedAt: Date.now(),
        confirmed: false,
      });
    } else {
      await ctx.db.insert("subscribers", {
        email: args.email,
        subscribedAt: Date.now(),
        confirmed: false,
        confirmationToken: args.token,
        tokenExpiresAt: args.tokenExpiresAt,
      });
    }
  },
});

export const markConfirmed = internalMutation({
  args: { id: v.id("subscribers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      confirmed: true,
      confirmationToken: undefined,
      tokenExpiresAt: undefined,
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
    if (!turnstileSecret) throw new Error("Server configuration error");

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: turnstileSecret, response: args.turnstileToken }),
      },
    );
    const verifyData = (await verifyRes.json()) as { success: boolean; "error-codes"?: string[] };
    if (!verifyData.success) {
      console.error("Turnstile failed:", verifyData["error-codes"]);
      throw new Error("Verification failed. Please try again.");
    }

    const existing = await ctx.runQuery(internal.subscribers.getByEmail, {
      email: args.email,
    });

    if (existing?.confirmed === true || (existing && existing.confirmed === undefined)) {
      return { success: true };
    }

    if (
      existing?.confirmed === false &&
      existing.subscribedAt > Date.now() - RESEND_COOLDOWN_MS
    ) {
      return { success: true };
    }

    const token = crypto.randomUUID();
    const tokenExpiresAt = Date.now() + TOKEN_TTL_MS;

    await ctx.runMutation(internal.subscribers.upsertPending, {
      email: args.email,
      token,
      tokenExpiresAt,
    });

    await ctx.runAction(internal.emails.sendConfirmationEmail, {
      email: args.email,
      token,
    });

    return { success: true };
  },
});

export const confirmSubscription = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.runQuery(internal.subscribers.getByToken, {
      token: args.token,
    });

    if (!subscriber) return { status: "invalid" as const };
    if (subscriber.confirmed === true) return { status: "already_confirmed" as const };
    if ((subscriber.tokenExpiresAt ?? 0) < Date.now()) return { status: "expired" as const };

    await ctx.runMutation(internal.subscribers.markConfirmed, {
      id: subscriber._id,
    });

    try {
      const resendKey = process.env.RESEND_API_KEY;
      const audienceId = process.env.RESEND_AUDIENCE_ID;
      if (resendKey && audienceId) {
        await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: subscriber.email }),
        });
      }
    } catch (_) {}

    return { status: "confirmed" };
  },
});
