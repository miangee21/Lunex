import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useProfilePicUrl(storageId: Id<"_storage"> | undefined | null): string | null {
  const url = useQuery(
    api.users.getProfilePicUrl,
    storageId ? { storageId } : "skip"
  );
  return url ?? null;
}