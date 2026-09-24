import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomUUID } from "node:crypto";

const SB_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sbHeaders() {
  return {
    apikey: SB_SERVICE_KEY,
    Authorization: `Bearer ${SB_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const mine = new URL(req.url).searchParams.get("mine");
  const e = encodeURIComponent(email);
  const filter = mine ? `owner_email=eq.${e}` : `or=(is_public.eq.true,owner_email.eq.${e})`;
  const resp = await fetch(`${SB_URL}/rest/v1/activities?select=*&${filter}`, { headers: sbHeaders() });
  if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
  return NextResponse.json(await resp.json());
}

export async function POST(req: NextRequest) {
  try {
    if (!SB_URL || !SB_SERVICE_KEY) {
      return NextResponse.json({ error: "서버에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = await req.json();
    if (body.id) {
      const chk = await fetch(`${SB_URL}/rest/v1/activities?select=owner_email&id=eq.${encodeURIComponent(body.id)}`, { headers: sbHeaders() });
      const rows = chk.ok ? await chk.json() : [];
      if (rows[0] && rows[0].owner_email !== email) return NextResponse.json({ error: "본인 활동만 수정할 수 있습니다." }, { status: 403 });
    }
    const row = {
      id: body.id || `act_${randomUUID()}`,
      name: body.name,
      slot: body.slot,
      default_minutes: body.default_minutes,
      teks_subcategory: body.teks_subcategory,
      tags: body.tags,
      equipment: body.equipment,
      description: body.description,
      steps: body.steps,
      scoring: body.scoring,
      source: body.source,
      owner_email: email,
      is_public: !!body.is_public,
    };

    const resp = await fetch(`${SB_URL}/rest/v1/activities`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([row]),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `Supabase ${resp.status}: ${text || "빈 응답"}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 예외: " + (err?.message || String(err)) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

    const resp = await fetch(
      `${SB_URL}/rest/v1/activities?id=eq.${encodeURIComponent(id)}&owner_email=eq.${encodeURIComponent(email)}`,
      { method: "DELETE", headers: sbHeaders() }
    );
    if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "서버 예외: " + (err?.message || String(err)) }, { status: 500 });
  }
}
