//src/components/friends/RequestItem.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import UserAvatar from "@/components/shared/UserAvatar";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Check,
  X,
  MoreVertical,
  UserPlus,
  Clock,
  Users,
} from "lucide-react";

type Tab = "received" | "sent" | "find";

export default function RequestsPanel() {
  const { setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [tab, setTab] = useState<Tab>("received");
  const [search, setSearch] = useState("");
  const [findSearch, setFindSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const incomingRequests = useQuery(
    api.friends.getIncomingRequests,
    userId ? { userId } : "skip",
  );

  const sentRequests = useQuery(
    api.friends.getSentRequests,
    userId ? { userId } : "skip",
  );

  const searchResults = useQuery(
    api.friends.searchUsers,
    findSearch.length >= 2 && userId
      ? { username: findSearch.toLowerCase(), currentUserId: userId }
      : "skip",
  );

  const acceptRequest = useMutation(api.friends.acceptFriendRequest);
  const rejectRequest = useMutation(api.friends.rejectFriendRequest);
  const unsendRequest = useMutation(api.friends.unsendFriendRequest);
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);

  async function handleAccept(requestId: string) {
    try {
      await acceptRequest({ requestId: requestId as never });
      toast.success("Friend request accepted!");
    } catch {
      toast.error("Failed to accept request.");
    }
  }

  async function handleReject(requestId: string) {
    try {
      await rejectRequest({ requestId: requestId as never });
      toast.success("Request rejected.");
    } catch {
      toast.error("Failed to reject request.");
    }
  }

  async function handleUnsend(requestId: string, username: string) {
    try {
      await unsendRequest({ requestId: requestId as never });
      toast.success(`Request to ${username} cancelled!`);
      setMenuOpen(null);
    } catch {
      toast.error("Failed to unsend request.");
    }
  }

  async function handleSendRequest(toUserId: string) {
    if (!userId) return;
    try {
      await sendFriendRequest({
        fromUserId: userId,
        toUserId: toUserId as never,
      });
      toast.success("Friend request sent!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send request.",
      );
    }
  }

  const filteredReceived = (incomingRequests ?? []).filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredSent = (sentRequests ?? []).filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => setSidebarView("chats")}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-lg">Requests</h2>
      </div>

      <div className="flex mx-3 mb-3 bg-accent rounded-xl p-1">
        <button
          onClick={() => {
            setTab("received");
            setSearch("");
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors relative ${
            tab === "received"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Received
          {incomingRequests && incomingRequests.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {incomingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setTab("sent");
            setSearch("");
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === "sent"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sent
        </button>
        <button
          onClick={() => {
            setTab("find");
            setFindSearch("");
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            tab === "find"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Find
        </button>
      </div>

      {/* ── RECEIVED TAB ── */}
      {tab === "received" && (
        <>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
              <Search
                size={15}
                className="text-muted-foreground flex-shrink-0"
              />
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
      )}

      {/* ── SENT TAB ── */}
      {tab === "sent" && (
        <>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
              <Search
                size={15}
                className="text-muted-foreground flex-shrink-0"
              />
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
                <p className="text-muted-foreground text-sm">
                  No sent requests
                </p>
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
                            onClick={() =>
                              handleUnsend(req.requestId, req.username)
                            }
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
      )}

      {/* ── FIND TAB ── */}
      {tab === "find" && (
        <>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 border border-transparent focus-within:border-primary transition-all">
              <Search
                size={15}
                className="text-muted-foreground flex-shrink-0"
              />
              <input
                value={findSearch}
                onChange={(e) => setFindSearch(e.target.value.toLowerCase())}
                placeholder="Search by username..."
                autoFocus
                className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
              />
              {findSearch && (
                <button onClick={() => setFindSearch("")}>
                  <X
                    size={15}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {findSearch.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Users size={24} className="text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Type at least 2 characters
                </p>
              </div>
            ) : searchResults === undefined ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground text-sm">No users found</p>
              </div>
            ) : (
              searchResults.map((user) => (
                <FindUserItem
                  key={user._id}
                  userId={user._id}
                  username={user.username}
                  profilePicStorageId={user.profilePicStorageId ?? null}
                  currentUserId={userId!}
                  onSendRequest={handleSendRequest}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FindUserItem({
  userId,
  username,
  currentUserId,
  onSendRequest,
  profilePicStorageId,
}: {
  userId: string;
  username: string;
  currentUserId: string;
  onSendRequest: (id: string) => void;
  profilePicStorageId: string | null;
}) {
  const relationship = useQuery(api.friends.getRelationshipStatus, {
    currentUserId: currentUserId as never,
    otherUserId: userId as never,
  });

  function renderAction() {
    if (relationship === undefined) {
      return (
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      );
    }
    if (!relationship) {
      return (
        <button
          onClick={() => onSendRequest(userId)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <UserPlus size={13} />
          Add
        </button>
      );
    }
    if (relationship.status === "accepted") {
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
          <Users size={13} />
          Friends
        </span>
      );
    }
    if (
      relationship.status === "pending" &&
      relationship.direction === "sent"
    ) {
      return (
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Clock size={13} />
          Sent
        </span>
      );
    }
    if (
      relationship.status === "pending" &&
      relationship.direction === "received"
    ) {
      return (
        <span className="flex items-center gap-1.5 text-primary text-xs font-bold">
          <Clock size={13} />
          Respond
        </span>
      );
    }
    if (relationship.status === "blocked") {
      return (
        <span className="text-destructive text-xs font-medium">Blocked</span>
      );
    }
    return (
      <button
        onClick={() => onSendRequest(userId)}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity"
      >
        <UserPlus size={13} />
        Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors">
      <UserAvatar
        username={username}
        profilePicStorageId={profilePicStorageId as Id<"_storage"> | null}
      />
      <span className="text-foreground text-sm font-semibold flex-1 truncate">
        {username}
      </span>
      {renderAction()}
    </div>
  );
}
