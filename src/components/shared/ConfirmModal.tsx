//src/components/shared/ConfirmModal.tsx
import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmModalProps {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  children,
  title,
  description,
  onConfirm,
  confirmText = "Continue",
  cancelText = "Cancel",
  isDestructive = false,
}: ConfirmModalProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl shadow-xl border-border sm:max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel className="rounded-xl hover:bg-accent hover:text-foreground border-border font-semibold">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-xl font-semibold transition-colors ${
              isDestructive
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
