import { auth } from "@/lib/auth";
import { recalculateScores } from "@/lib/engagement";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await recalculateScores();
  return NextResponse.json({ data: result });
}
