import { NextRequest, NextResponse } from "next/server";

const SHEET_RE = /\((.+?)\)\s+(\d+-\d+)/;
const DEFAULT_SID = "14CbSiN8DsAPCeYlyfOZAVyOdGk3EBU-XBxco5mttQlM";

async function getAccessToken(): Promise<string> {
  const keyJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error("GCP_SERVICE_ACCOUNT_JSON 없음");
  const key = JSON.parse(keyJson);

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  // Node.js crypto로 RS256 서명
  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(key.private_key, "base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("토큰 발급 실패: " + JSON.stringify(data));
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    const token = await getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };

    if (action === "list") {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_SID}?fields=sheets.properties`,
        { headers }
      );
      const data = await res.json();
      const sheets = (data.sheets || []).map((s: any) => ({
        name: s.properties.title,
        gid: String(s.properties.sheetId),
      }));
      const seen: string[] = [];
      const weeks: string[] = [];
      for (const s of sheets) {
        const m = SHEET_RE.exec(s.name);
        if (m && !seen.includes(m[1])) { seen.push(m[1]); weeks.push(m[1]); }
      }
      return NextResponse.json({ sheets, weeks });
    }

    if (action === "export") {
      const gid = searchParams.get("gid");
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${DEFAULT_SID}/export?format=pdf&gid=${gid}&portrait=true&size=A4&scale=4&gridlines=false&r1=0&c1=0&r2=22&c2=6&fitw=true&top_margin=0.25&bottom_margin=0.00&left_margin=0.25&right_margin=0.25`,
        { headers }
      );
      const pdf = await res.arrayBuffer();
      return new NextResponse(pdf, {
        headers: { "Content-Type": "application/pdf" },
      });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
