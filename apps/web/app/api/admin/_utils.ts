import { NextResponse } from "next/server";
import { isInternalAdminRequest } from "@/server/services/admin";

export function unauthorizedUnlessInternal(request: Request) {
  if (isInternalAdminRequest(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function adminError(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return conflict("A pending or claimed job with the same dedup_key already exists");
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
