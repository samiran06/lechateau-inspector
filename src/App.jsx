import React, { useState, useRef } from "react";

const COLORS = {
  bg: "#14181D",
  card: "#1C232A",
  cardBorder: "#2B333B",
  brass: "#C2A05F",
  brassDim: "#8A7245",
  cream: "#EDE8DC",
  creamDim: "#9CA0A0",
  good: "#7FA07A",
  goodBg: "#1E2620",
  mid: "#D0A050",
  midBg: "#2A2317",
  low: "#C06A50",
  lowBg: "#2A1E19",
};

function scoreTone(score) {
  if (score >= 8) return { fg: COLORS.good, bg: COLORS.goodBg, label: "Excellent" };
  if (score >= 5) return { fg: COLORS.mid, bg: COLORS.midBg, label: "Needs attention" };
  return { fg: COLORS.low, bg: COLORS.lowBg, label: "Requires re-clean" };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [dataUrl, setDataUrl] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [roomLabel, setRoomLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const b64 = await fileToBase64(file);
      setBase64(b64);
      setMediaType(file.type || "image/jpeg");
      setDataUrl(`data:${file.type};base64,${b64}`);
    } catch (err) {
      setError("Could not read that photo. Try again.");
    }
  }

  async function runInspection() {
    if (!base64) {
      setError("Add a photo first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // This calls OUR OWN backend at /api/inspect, not Anthropic directly.
      // The backend holds the secret API key so it never reaches the browser.
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      });

      if (!response.ok) {
        throw new Error("Inspection request failed");
      }

      const finalResult = await response.json();
      setResult(finalResult);
      setHistory((h) => [
        {
          id: Date.now(),
          thumb: dataUrl,
          room: roomLabel.trim() || "Unlabeled area",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ...finalResult,
        },
        ...h,
      ]);
    } catch (err) {
      setError("Inspection couldn't be completed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetCapture() {
    setDataUrl(null);
    setBase64(null);
    setMediaType(null);
    setResult(null);
    setError(null);
    setRoomLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const tone = result ? scoreTone(result.score) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.cream,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .lc-fade { animation: lcFadeIn 0.35s ease; }
        @keyframes lcFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lc-btn { transition: opacity 0.15s ease, transform 0.1s ease; cursor: pointer; }
        .lc-btn:hover { opacity: 0.88; }
        .lc-btn:active { transform: scale(0.98); }
        .lc-input:focus { outline: none; border-color: ${COLORS.brass} !important; }
        @media (prefers-reduced-motion: reduce) { .lc-fade { animation: none; } }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px 64px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.14em", color: COLORS.brass, fontWeight: 500, marginBottom: 10 }}>
            LE CHATEAU · QUALITY ASSURANCE
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500, margin: 0, lineHeight: 1.15 }}>
            Room inspection
          </h1>
          <p style={{ color: COLORS.creamDim, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            Photograph the area you've just serviced. The inspector scores it out of 10 and flags what still needs work.
          </p>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: COLORS.creamDim, display: "block", marginBottom: 6 }}>Area label</label>
          <input
            className="lc-input"
            type="text"
            placeholder="e.g. Master bedroom — Villa 12"
            value={roomLabel}
            onChange={(e) => setRoomLabel(e.target.value)}
            style={{ width: "100%", background: "#151A1F", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "10px 12px", color: COLORS.cream, fontSize: 14, fontFamily: "inherit", marginBottom: 16 }}
          />

          {!dataUrl ? (
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="lc-btn"
              style={{ border: `1.5px dashed ${COLORS.brassDim}`, borderRadius: 10, padding: "36px 16px", textAlign: "center", background: "#181F25" }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.cream }}>Take or upload a photo</div>
              <div style={{ fontSize: 12, color: COLORS.creamDim, marginTop: 4 }}>Capture the full room from the doorway for the best read</div>
            </div>
          ) : (
            <div className="lc-fade">
              <img src={dataUrl} alt="Captured room" style={{ width: "100%", borderRadius: 10, display: "block", maxHeight: 320, objectFit: "cover", border: `1px solid ${COLORS.cardBorder}` }} />
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="lc-btn" onClick={resetCapture} style={{ flex: "0 0 auto", background: "transparent", border: `1px solid ${COLORS.cardBorder}`, color: COLORS.creamDim, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "inherit" }}>
                  Retake
                </button>
                <button className="lc-btn" onClick={runInspection} disabled={loading} style={{ flex: 1, background: COLORS.brass, border: "none", color: "#1C1607", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Inspecting…" : "Run inspection"}
                </button>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

          {error && <div style={{ color: COLORS.low, fontSize: 13, marginTop: 12 }}>{error}</div>}
        </div>

        {result && tone && (
          <div className="lc-fade" style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
              <div style={{ width: 76, height: 76, borderRadius: "50%", border: `2.5px solid ${COLORS.brass}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#181F25" }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{result.score}</div>
                <div style={{ fontSize: 9, color: COLORS.brass, letterSpacing: "0.08em" }}>OUT OF 10</div>
              </div>
              <div>
                <div style={{ display: "inline-block", background: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, marginBottom: 6 }}>
                  {tone.label}
                </div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17 }}>{result.verdict || (roomLabel.trim() || "Room")}</div>
              </div>
            </div>

            {result.issues.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.1em", color: COLORS.creamDim, marginBottom: 10 }}>FLAGGED FOR FOLLOW-UP</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {result.issues.map((issue, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i === 0 ? "none" : `1px solid ${COLORS.cardBorder}`, fontSize: 14, color: COLORS.cream }}>
                      <span style={{ color: COLORS.low, flexShrink: 0 }}>—</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: COLORS.good }}>No issues flagged — the area is ready.</div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: COLORS.creamDim, marginBottom: 12 }}>THIS SESSION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((h) => {
                const t = scoreTone(h.score);
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, padding: 10 }}>
                    <img src={h.thumb} alt={h.room} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.room}</div>
                      <div style={{ fontSize: 12, color: COLORS.creamDim }}>{h.time}</div>
                    </div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: t.fg, background: t.bg, borderRadius: 8, padding: "4px 10px", flexShrink: 0 }}>
                      {h.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
