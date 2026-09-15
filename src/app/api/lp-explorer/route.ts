import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

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

  const resp = await fetch(`${SB_URL}/rest/v1/activities?select=*`, { headers: sbHeaders() });
    if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
    const all = await resp.json();

  const visible = all.filter((a: any) => a.is_public || (email && a.owner_email === email));
    return NextResponse.json(visible);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
    const row = {
          id: body.id,
          data: body,
          owner_email: email,
          is_public: !!body.is_public,
    };

  const resp = await fetch(`${SB_URL}/rest/v1/activities`, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify([row]),
  });
    if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
    return NextResponse.json({ ok: true });
}
