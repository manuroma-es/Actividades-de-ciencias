"use client";

import { useSyncExternalStore } from "react";
import { isNewPublication } from "@/lib/catalog/dates";
import type { ISODate } from "@/lib/catalog/schema";

const subscribe = () => () => undefined;

export function NewActivityBadge({ publishedAt }: { publishedAt: ISODate | null }) {
  const isNew = useSyncExternalStore(subscribe, () => isNewPublication(publishedAt), () => false);
  return isNew ? <span className="new-badge">Nueva</span> : null;
}
