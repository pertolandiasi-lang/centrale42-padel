import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
    const value = await redis.get(`booking:${key}`);
    return NextResponse.json({ exists: value !== null });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
