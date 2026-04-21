import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const keys = await redis.keys("booking:*");
    const result: Record<string, unknown> = {};
    if (keys.length > 0) {
      const values = await redis.mget<unknown[]>(...keys);
      keys.forEach((key, i) => {
        if (values[i] !== null) {
          result[key.replace("booking:", "")] = values[i];
        }
      });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, name, phone } = await req.json();
    if (!key || !name || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const data = { name, phone, createdAt: new Date().toISOString() };
    await redis.set(`booking:${key}`, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
    await redis.del(`booking:${key}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
