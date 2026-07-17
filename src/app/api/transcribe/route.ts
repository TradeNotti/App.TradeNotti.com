import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/transcribe  (multipart form-data with field "audio")
// Sends the audio to OpenAI Whisper and returns { text }.
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Transcription is not configured (missing OPENAI_API_KEY)." },
      { status: 501 },
    );
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (audio.size > 24_000_000) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  // OpenAI infers the audio format from the file EXTENSION, so it must match the
  // real MIME type — Safari records audio/mp4, Chrome/Firefox audio/webm. A
  // hardcoded ".webm" name made Safari uploads fail to decode.
  const MIME_EXT: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "m4a",
    "audio/mpeg": "mp3",
    "audio/mpga": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
  };
  const mime = (audio.type || "").split(";")[0].trim().toLowerCase();
  let ext = MIME_EXT[mime];
  if (!ext) {
    const nameExt = ((audio as File).name || "").match(/\.(\w+)$/)?.[1];
    ext = nameExt || "webm";
  }

  const upstream = new FormData();
  upstream.append("file", audio, `note.${ext}`);
  upstream.append(
    "model",
    process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
  );
  upstream.append("response_format", "json");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[transcribe] OpenAI failed:", res.status, detail);
      // Turn OpenAI's error into one actionable sentence.
      let msg = "Couldn't transcribe the audio. Please try again.";
      let raw = "";
      try {
        raw = (JSON.parse(detail)?.error?.message as string) || "";
      } catch {
        raw = detail;
      }
      if (res.status === 429 || /quota|insufficient|billing|exceeded/i.test(raw)) {
        msg =
          "OpenAI credits are exhausted — add credits to your OpenAI account, then try again.";
      } else if (res.status === 401 || /api key|unauthorized|invalid.*key/i.test(raw)) {
        msg = "The OpenAI API key is missing or invalid on the server.";
      } else if (/model/i.test(raw) && /not (found|exist)|does not|unknown/i.test(raw)) {
        msg = "The transcription model isn't available on this OpenAI account.";
      } else if (/decode|format|invalid file|unsupported|corrupt/i.test(raw)) {
        msg = "That recording couldn't be read. Please record and try again.";
      }
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[transcribe] error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
