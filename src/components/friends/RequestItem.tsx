//src/components/friends/RequestItem.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ReceivedRequestsTab from "@/components/friends/ReceivedRequestsTab";
import SentRequestsTab from "@/components/friends/SentRequestsTab";
import FindUsersTab from "@/components/friends/FindUsersTab";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Tab = "received" | "sent" | "find";

export default function RequestsPanel() {
  const { setSidebarView } = useChatStore();
  const userId = useAuthStore((s) => s.userId);
  const [tab, setTab] = useState<Tab>("received");
  const [search, setSearch] = useState("");
  const [findSearch, setFindSearch] = useState("");

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

      {tab === "received" && (
        <ReceivedRequestsTab
          search={search}
          setSearch={setSearch}
          incomingRequests={incomingRequests}
          filteredReceived={filteredReceived}
          handleAccept={handleAccept}
          handleReject={handleReject}
        />
      )}

      {tab === "sent" && (
        <SentRequestsTab
          search={search}
          setSearch={setSearch}
          sentRequests={sentRequests}
          filteredSent={filteredSent}
          handleUnsend={handleUnsend}
        />
      )}

      {tab === "find" && (
        <FindUsersTab
          findSearch={findSearch}
          setFindSearch={setFindSearch}
          searchResults={searchResults}
          currentUserId={userId!}
          handleSendRequest={handleSendRequest}
        />
      )}
    </div>
  );
}
