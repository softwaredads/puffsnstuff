import { getSupabaseAdmin } from "@/lib/supabase";
import {
  errorResponse,
  handleApiError,
  jsonResponse,
  optionsResponse,
} from "@/lib/api/response";

const BUCKET = "product-images";
const SPIN_ICON_FOLDER = "spin-icons";
const MAX_SPIN_ICON_BYTES = 2 * 1024 * 1024;
const SPIN_ICON_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

    const folder = form.get("folder");
    const isSpinIcon = folder === SPIN_ICON_FOLDER;
    if (folder !== null && !isSpinIcon) {
      return errorResponse("Invalid upload folder", 400);
    }

    if (isSpinIcon && !SPIN_ICON_EXTENSIONS[file.type]) {
      return errorResponse("Icon must be a PNG, JPG, or WebP image", 400);
    }
    if (isSpinIcon && file.size > MAX_SPIN_ICON_BYTES) {
      return errorResponse("Icon must be 2 MB or smaller", 400);
    }

    const ext = isSpinIcon
      ? SPIN_ICON_EXTENSIONS[file.type]
      : file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = isSpinIcon ? `${SPIN_ICON_FOLDER}/${filename}` : filename;

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
