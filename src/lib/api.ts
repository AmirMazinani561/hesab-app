import { NextResponse } from "next/server";
import { translateDbError } from "@/db/client";
import { HttpError } from "@/lib/auth";

export function fail(err: unknown) {
  if (err instanceof HttpError)
    return NextResponse.json({ error: err.message }, { status: err.status });
  const msg = translateDbError(err);
  return NextResponse.json({ error: msg }, { status: 500 });
}

export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
