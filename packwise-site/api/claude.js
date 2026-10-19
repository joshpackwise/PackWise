// PackWise's behind-the-scenes helper.
// The web page sends its question here; this code adds the secret key and asks Claude.
// Visitors never see the key, and they never need a Claude account.
//
// Settings (set these in Vercel > Project > Settings > Environment Variables):
//   ANTHROPIC_API_KEY   required. Your key from the Claude Console.
//   PACKWISE_MODEL      optional. Defaults to claude-sonnet-5-5.
//   PACKWISE_QUICK_MODEL optional. Cheaper model for small jobs. Defaults to claude-haiku-5-5.
//   PACKWISE_PER_MINUTE optional. Requests allowed per visitor per minute. Defaults to 8.

const API_URL = "https://api.anthropic.com/v1/messages";
const MAX_PROMPT_CHARS = 24000;
const MAX_IMAGES = 2;
const MAX_IMAGE_CHARS = 2_000_000; // about 1.5 MB per image; the page shrinks photos first

// Simple per-visitor speed limit so one person can't run up the bill.
// It resets whenever the server restarts, which is fine for a prototype.
const hits = new Map();
function tooFast(ip, perMinute) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > perMinute;
}

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "invalid", message: "Use POST." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 500, { code: "not_granted", message: "ANTHROPIC_API_KEY is not set." });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const perMinute = Number(process.env.PACKWISE_PER_MINUTE) || 8;
  if (tooFast(ip, perMinute)) return send(res, 429, { code: "rate_limited" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const prompt = body && typeof body.prompt === "string" ? body.prompt : "";
  const images = Array.isArray(body && body.images) ? body.images : [];
  if (!prompt.trim() || prompt.length > MAX_PROMPT_CHARS) return send(res, 400, { code: "invalid" });
  if (images.length > MAX_IMAGES || images.some((i) => typeof i !== "string" || i.length > MAX_IMAGE_CHARS)) {
    return send(res, 400, { code: "image_rejected" });
  }

  const model = body.tier === "quick"
    ? process.env.PACKWISE_QUICK_MODEL || "claude-haiku-5-5"
    : process.env.PACKWISE_MODEL || "claude-sonnet-5-5";

  const content = [
    ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
    { type: "text", text: prompt },
  ];

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: "You are the AI inside PackWise, a travel packing app. When asked for JSON, reply with only valid JSON and nothing else.",
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const t = data && data.error && data.error.type;
      console.error("Claude API error", r.status, t, data && data.error && data.error.message);
      if (r.status === 429) return send(res, 429, { code: "rate_limited" });
      if (r.status === 529 || t === "overloaded_error") return send(res, 503, { code: "busy" });
      if (r.status === 400 && /image/i.test(JSON.stringify(data))) return send(res, 400, { code: "image_rejected" });
      if (r.status === 401 || r.status === 403) return send(res, 500, { code: "not_granted" });
      return send(res, 502, { code: "upstream_error" });
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (!text) return send(res, 502, { code: "refused" });
    return send(res, 200, { text });
  } catch (e) {
    console.error("Request to Claude failed", e);
    return send(res, 502, { code: "upstream_error" });
  }
}
