//src/components/chat/area/ChatAreaDeleteDialog.tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  canDeleteForEveryone: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
};

export default function ChatAreaDeleteDialog({
  isOpen,
  onOpenChange,
  selectedCount,
  canDeleteForEveryone,
  onDeleteForMe,
  onDeleteForEveryone,
}: Props) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl shadow-xl border-border sm:max-w-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground font-bold">
            {selectedCount > 1
              ? `Delete ${selectedCount} messages?`
              : "Delete message?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
            {canDeleteForEveryone
              ? "You can delete this message for everyone or just for yourself."
              : selectedCount > 1
                ? "Are you sure you want to delete these messages for yourself? This cannot be undone."
                : "Are you sure you want to delete this message for yourself? This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent border border-transparent hover:border-border transition-colors w-full sm:w-auto text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onDeleteForMe}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-transparent hover:bg-accent transition-colors w-full sm:w-auto text-foreground"
          >
            Delete for me
          </button>
          {canDeleteForEveryone && (
            <button
              onClick={onDeleteForEveryone}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors w-full sm:w-auto"
            >
              Delete for everyone
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
