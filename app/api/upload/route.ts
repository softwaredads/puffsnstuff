import { getSupabaseAdmin } from "@/lib/supabase";
import {
  errorResponse,
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

const BUCKET = "product-images";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return errorResponse("Supabase not configured", 500);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return errorResponse("No file provided", 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return jsonResponse({ data: { url: data.publicUrl } }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
