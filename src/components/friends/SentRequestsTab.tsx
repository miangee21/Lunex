//src/components/friends/SentRequestsTab.tsx
import { useState } from "react";
import { Search, MoreVertical, X } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";

interface SentRequestsTabProps {
  search: string;
  setSearch: (val: string) => void;
  sentRequests: any[] | undefined;
  filteredSent: any[];
  handleUnsend: (id: string, username: string) => void;
}

export default function SentRequestsTab({
  search,
  setSearch,
  sentRequests,
  filteredSent,
  handleUnsend,
}: SentRequestsTabProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sent..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sentRequests === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredSent.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No sent requests</p>
          </div>
        ) : (
          filteredSent.map((req) => (
            <div
              key={req.requestId}
              className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
            >
              <UserAvatar
                username={req.username}
                profilePicStorageId={
                  req.profilePicStorageId as Id<"_storage"> | null
                }
              />
              <span className="text-foreground text-sm font-semibold flex-1 truncate">
                {req.username}
              </span>
              <div className="relative">
                <button
                  onClick={() =>
                    setMenuOpen(
                      menuOpen === req.requestId ? null : req.requestId,
                    )
                  }
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                >
                  <MoreVertical size={15} />
                </button>
                {menuOpen === req.requestId && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-9 w-36 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        onClick={() => {
                          handleUnsend(req.requestId, req.username);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X size={14} />
                        Unsend
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
