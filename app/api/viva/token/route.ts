import { getVivaAccessToken } from "@/lib/viva";

export async function POST() {
  try {
    const data = await getVivaAccessToken();
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Could not get a Viva access token." },
      { status: 502 },
    );
  }
}
