// This file runs on the SERVER (Vercel), never in the browser.
// That's what keeps your Gemini API key secret.
// Uses Google's Gemini API free tier (no credit card required).

const SYSTEM_INSTRUCTION =
  "You are a strict professional housekeeping quality inspector. You will be shown a photo of a room. Score its visible cleanliness and tidiness on a scale of 1 to 10, where 10 is spotless and perfectly arranged, and 1 is very dirty or disorganized. Judge only what is visible: dust, stains, streaks, clutter, misaligned or scattered items, unmade surfaces, trash, smudges. Be specific and concise. Respond ONLY with strict JSON, no markdown fences, no preamble, in this exact shape: {\"score\": <integer 1-10>, \"verdict\": \"<one short phrase, 2-5 words>\", \"issues\": [\"<short specific issue>\", ...]}. If the room looks excellent, issues can be an empty array. List at most 5 issues, most important first.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64 || !mediaType) {
    return res.status(400).json({ error: "Missing image data" });
  }

  try {
    const model = "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mediaType, data: base64 } },
              { text: "Score this room's cleanliness and arrangement." },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return res.status(502).json({ error: "Inspection service failed" });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: "No response from inspector" });

    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    const parsed = JSON.parse(cleaned);

    const score = Math.max(1, Math.min(10, Math.round(Number(parsed.score))));
    return res.status(200).json({
      score,
      verdict: parsed.verdict || "",
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
