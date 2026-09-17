import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
vi.mock("@/auth", () => ({ auth }));

describe("POST /api/lp-explorer", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    auth.mockReset();
    auth.mockResolvedValue({ user: { email: "teacher@example.com" } });
  });

  it("does not let a caller overwrite a known public activity ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(new NextRequest("http://localhost/api/lp-explorer", {
      method: "POST",
      body: JSON.stringify({ id: "act_public", name: "Changed", is_public: true }),
    }));

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    const inserted = JSON.parse(options.body)[0];
    expect(inserted.id).not.toBe("act_public");
    expect(inserted.owner_email).toBe("teacher@example.com");
    expect(options.headers).not.toHaveProperty("Prefer");
  });

  it("rejects a caller without a session before writing", async () => {
    auth.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(new NextRequest("http://localhost/api/lp-explorer", {
      method: "POST",
      body: JSON.stringify({ id: "act_public", name: "Changed" }),
    }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
