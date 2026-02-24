import { useState } from "react";
import { ArrowLeft, Search, Check, X, MoreVertical } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { toast } from "sonner";

// Dummy data — will be dynamic in Step 9
const DUMMY_RECEIVED = [
  { id: "1", username: "ali123" },
  { id: "2", username: "sara56" },
];

const DUMMY_SENT = [
  { id: "3", username: "john99" },
  { id: "4", username: "mike22" },
];

type Tab = "received" | "sent";

export default function RequestsPanel() {
  const { setSidebarView } = useChatStore();
  const [tab, setTab] = useState<Tab>("received");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredReceived = DUMMY_RECEIVED.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSent = DUMMY_SENT.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => setSidebarView("chats")}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-bold text-lg">Requests</h2>
      </div>

      {/* Tabs */}
      <div className="flex mx-3 mb-3 bg-accent rounded-xl p-1">
        <button
          onClick={() => { setTab("received"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "received"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Received
        </button>
        <button
          onClick={() => { setTab("sent"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "sent"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sent
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "received" ? "Search received..." : "Search sent..."}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* Received Tab */}
        {tab === "received" && (
          filteredReceived.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground text-sm">No requests received</p>
            </div>
          ) : (
            filteredReceived.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  {req.username[0].toUpperCase()}
                </div>

                {/* Username */}
                <span className="text-foreground text-sm font-semibold flex-1 truncate">
                  {req.username}
                </span>

                {/* Accept / Reject icons */}
                <button
                  onClick={() => toast.success(`Accepted ${req.username}'s request!`)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  title="Accept"
                >
                  <Check size={18} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => toast.success(`Rejected ${req.username}'s request!`)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  title="Reject"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            ))
          )
        )}

        {/* Sent Tab */}
        {tab === "sent" && (
          filteredSent.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground text-sm">No sent requests</p>
            </div>
          ) : (
            filteredSent.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition-colors relative"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  {req.username[0].toUpperCase()}
                </div>

                {/* Username */}
                <span className="text-foreground text-sm font-semibold flex-1 truncate">
                  {req.username}
                </span>

                {/* Three dots */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === req.id ? null : req.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {menuOpen === req.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-9 w-36 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
                        <button
                          onClick={() => {
                            toast.success(`Request to ${req.username} cancelled!`);
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
          )
        )}
      </div>
    </div>
  );
}