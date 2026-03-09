//src/components/chat/media/PendingUploadsList.tsx
import { FileText, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";

export default function PendingUploadsList({
  currentPending,
  activeChatId,
}: {
  currentPending: any[];
  activeChatId: string;
}) {
  const { removePendingUpload, updateUploadStatus } = useChatStore();

  if (!currentPending || currentPending.length === 0) return null;

  const displayPending = currentPending.slice(0, 4);
  const extraPendingCount =
    currentPending.length > 4 ? currentPending.length - 4 : 0;
  const totalProgress =
    currentPending.reduce((acc: number, curr: any) => acc + curr.progress, 0) /
    currentPending.length;
  const hasError = currentPending.some((p: any) => p.status === "error");

  return (
    <div className="flex w-full group py-1.5 justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative flex items-start gap-2 flex-row-reverse">
        <div
          className={`relative px-1.5 pt-1.5 pb-6 rounded-2xl shadow-sm transition-all duration-200 bg-primary text-primary-foreground rounded-br-sm opacity-90 w-60 sm:w-70`}
        >
          {currentPending.length === 1 ? (
            <div
              className={`relative rounded-xl overflow-hidden mb-1 bg-black/20 ${currentPending[0].type === "image" || currentPending[0].type === "video" ? "w-full aspect-[1.3] sm:aspect-[1.3]" : "w-full aspect-square"}`}
            >
              {currentPending[0].type === "image" ? (
                <img
                  src={currentPending[0].previewUrl}
                  className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                />
              ) : currentPending[0].type === "video" ? (
                <video
                  src={currentPending[0].previewUrl}
                  className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <FileText size={40} className="text-white opacity-80" />
                </div>
              )}
            </div>
          ) : (
            <div
              className={`grid gap-1 w-full aspect-square rounded-xl overflow-hidden bg-black/20 ${displayPending.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"}`}
            >
              {displayPending.map((item: any, idx: number) => (
                <div
                  key={item.id}
                  className={`relative w-full h-full ${displayPending.length === 3 && idx === 0 ? "col-span-2" : ""}`}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.previewUrl}
                      className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                    />
                  ) : item.type === "video" ? (
                    <video
                      src={item.previewUrl}
                      className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-75 pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                      <FileText size={24} className="text-white opacity-80" />
                    </div>
                  )}
                  {idx === 3 && extraPendingCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <span className="text-white font-bold text-2xl">
                        +{extraPendingCount}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="absolute top-1.5 left-1.5 right-1.5 bottom-6 flex items-center justify-center pointer-events-none rounded-xl z-20">
            {hasError ? (
              <div className="flex gap-4 items-center pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success("Resending...");
                    currentPending.forEach((p: any) => {
                      if (p.status === "error") {
                        window.dispatchEvent(
                          new CustomEvent("retry-upload", {
                            detail: { id: p.id },
                          }),
                        );
                      }
                    });
                  }}
                  className="flex flex-col items-center gap-1.5 text-white hover:text-primary transition-colors bg-black/60 p-3 rounded-full backdrop-blur-sm shadow-xl"
                  title="Resend"
                >
                  <RotateCw size={24} />
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    Resend
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    currentPending.forEach((p: any) =>
                      removePendingUpload(activeChatId, p.id),
                    );
                  }}
                  className="flex flex-col items-center gap-1.5 text-white hover:text-destructive transition-colors bg-black/60 p-3 rounded-full backdrop-blur-sm shadow-xl"
                  title="Cancel"
                >
                  <Trash2 size={24} />
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    Clear
                  </span>
                </button>
              </div>
            ) : (
              <div
                className="group/spinner pointer-events-auto relative flex flex-col items-center bg-black/60 w-16 h-16 rounded-full justify-center backdrop-blur-sm shadow-xl cursor-pointer hover:bg-black/80 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  currentPending.forEach((p: any) => {
                    if (p.status === "uploading" && p.progress < 100) {
                      updateUploadStatus(activeChatId, p.id, "error");
                    }
                  });
                }}
                title="Cancel Upload"
              >
                <div className="absolute w-12 h-12 rounded-full border-[3px] border-white/20 border-t-white animate-spin group-hover/spinner:opacity-0 transition-opacity"></div>
                <span className="text-white text-[10px] font-bold mt-0.5 group-hover/spinner:opacity-0 transition-opacity">
                  {Math.round(totalProgress)}%
                </span>
                <X
                  className="absolute text-white opacity-0 group-hover/spinner:opacity-100 transition-opacity"
                  size={28}
                />
              </div>
            )}
          </div>

          <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] font-medium opacity-70">
            <span>{hasError ? "Failed" : "Sending..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
