// This file runs on the SERVER (Vercel), never in the browser.
// That's what keeps your API keys secret.
//
// PROVIDER SWITCH: set INSPECT_PROVIDER env var to "bytez" or "gemini".
// Defaults to "bytez" since that's the current fallback for the demo.

const SYSTEM_INSTRUCTION =
  "You are a strict professional housekeeping quality inspector. You will be shown a photo of a room. Score its visible cleanliness and tidiness on a scale of 1 to 10, where 10 is spotless and perfectly arranged, and 1 is very dirty or disorganized. Judge only what is visible: dust, stains, streaks, clutter, misaligned or scattered items, unmade surfaces, trash, smudges. Be specific and concise. Respond ONLY with strict JSON, no markdown fences, no preamble, in this exact shape: {\"score\": <integer 1-10>, \"verdict\": \"<one short phrase, 2-5 words>\", \"issues\": [\"<short specific issue>\", ...]}. If the room looks excellent, issues can be an empty array. List at most 5 issues, most important first.";

function parseScoreJson(rawText) {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);
  const score = Math.max(1, Math.min(10, Math.round(Number(parsed.score))));
  return {
    score,
    verdict: parsed.verdict || "",
    issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
  };
}

async function callBytez(base64, mediaType) {
  const model = "google/gemma-3-4b-it";
  const response = await fetch(`https://api.bytez.com/models/v2/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.BYTEZ_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${SYSTEM_INSTRUCTION}\n\nScore this room's cleanliness and arrangement.`,
            },
            { type: "image", base64: `data:${mediaType};base64,${base64}` },
          ],
        },
      ],
      params: { temperature: 0 },
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    console.error("Bytez API error:", data.error || response.statusText);
    throw new Error("Bytez request failed");
  }

  const rawText = typeof data.output === "string" ? data.output : JSON.stringify(data.output);
  return parseScoreJson(rawText);
}

async function callGemini(base64, mediaType) {
  const model = "gemini-2.5-flash";
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
    throw new Error("Gemini request failed");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini");

  return parseScoreJson(text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64 || !mediaType) {
    return res.status(400).json({ error: "Missing image data" });
  }

  const provider = (process.env.INSPECT_PROVIDER || "bytez").toLowerCase();

  try {
    const result = provider === "gemini" ? await callGemini(base64, mediaType) : await callBytez(base64, mediaType);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "Inspection service failed" });
  }
}
