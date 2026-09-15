import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { encrypt, decrypt } from "@/lib/crypto";

const SB_URL = process.env.SUPABASE_URL!;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sbHeaders() {
    return {
          apikey: SB_SERVICE_KEY,
          Authorization: `Bearer ${SB_SERVICE_KEY}`,
          "Content-Type": "application/json",
    };
}

export async function GET() {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const resp = await fetch(
        `${SB_URL}/rest/v1/user_settings?owner_email=eq.${encodeURIComponent(email)}&select=*`,
    { headers: sbHeaders() }
      );
    if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
    const rows = await resp.json();
    const row = rows[0];
          if (!row) return NextResponse.json({ apiKey: "", defaultEffort: "자세히", standard: "TEKS (Texas)" });  

  return NextResponse.json({
        apiKey: row.api_key_enc ? decrypt(row.api_key_enc) : "",
            defaultEffort: row.default_effort || "자세히",
        standard: row.standard || "TEKS (Texas)",
  });
}

export async function POST(req: NextRequest) {
    try {
          const session = await auth();
          const email = session?.user?.email;
              if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

      const body = await req.json();
          const row = {
                  owner_email: email,
                  api_key_enc: body.apiKey ? encrypt(body.apiKey) : "",
                  default_effort: body.defaultEffort,
                  standard: body.standard,
                  updated_at: new Date().toISOString(),
          };

      const resp = await fetch(`${SB_URL}/rest/v1/user_settings`, {
              method: "POST",
              headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
              body: JSON.stringify([row]),
      });
          if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
          return NextResponse.json({ ok: true });
    } catch (err: any) {
              return NextResponse.json({ error: "서버 예외: " + (err?.message || String(err)) }, { status: 500 });
    }
}
