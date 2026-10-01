import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Activity } from "@/lib/catalog/schema";
import { validateContent } from "./core.mjs";

// Server/build only: catalogue metadata selects a local declarative document.
export async function loadNativeContent(activity: Activity) {
  if (activity.source.kind !== "native") throw new Error("La actividad no es nativa");
  const source = activity.source.native;
  if (source.engineVersion !== 1 || source.activityType !== "mixed-practice"
    || !/^data\/native\/[a-z0-9-]+\.json$/.test(source.contentPath)) throw new Error(`Motor o ruta nativa no soportados: ${activity.id}`);
  const content = validateContent(JSON.parse(await readFile(path.join(process.cwd(), source.contentPath), "utf8")));
  if (content.id !== activity.id || content.language !== activity.language) throw new Error(`Contenido y catálogo no coinciden: ${activity.id}`);
  return content;
}
