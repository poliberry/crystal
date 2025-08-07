import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { sanitizeCss } from "@/lib/sanitize-css";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.profile.findUnique({
    where: { id: userId },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  return Response.json(profile);
}

export async function POST(req: Request) {
  const { css } = await req.json();

  const userId = await currentProfile();

  await db.profile.update({
    where: { id: userId?.id },
    data: {
      customCss: css,
    }
  });

  return Response.json({ success: true });
}
