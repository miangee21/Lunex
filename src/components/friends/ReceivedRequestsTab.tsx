//src/components/friends/ReceivedRequestsTab.tsx
import { Search, Check, X } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";

interface ReceivedRequestsTabProps {
  search: string;
  setSearch: (val: string) => void;
  incomingRequests: any[] | undefined;
  filteredReceived: any[];
  handleAccept: (id: string) => void;
  handleReject: (id: string) => void;
}

export default function ReceivedRequestsTab({
  search,
  setSearch,
  incomingRequests,
  filteredReceived,
  handleAccept,
  handleReject,
}: ReceivedRequestsTabProps) {
  return (
    <>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search received..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {incomingRequests === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredReceived.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">
              No requests received
            </p>
          </div>
        ) : (
          filteredReceived.map((req) => (
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
              <button
                onClick={() => handleAccept(req.requestId)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title="Accept"
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => handleReject(req.requestId)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                title="Reject"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
