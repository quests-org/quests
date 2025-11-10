import { Button } from "@/client/components/ui/button";
import {
  getTrashTerminology,
  PROGRESS_MESSAGES,
} from "@/client/lib/trash-terminology";
import { Timer } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Alert, AlertDescription } from "./ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface DeleteWithProgressDialogProps<T> {
  content?: ReactNode;
  description: string;
  items: T[];
  onDelete: (items: T[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export function DeleteWithProgressDialog<T>({
  content,
  description,
  items,
  onDelete,
  onOpenChange,
  open,
  title,
}: DeleteWithProgressDialogProps<T>) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        {open && (
          <DeleteWithProgressDialogBody
            content={content}
            description={description}
            items={items}
            onDelete={onDelete}
            onOpenChange={onOpenChange}
            title={title}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteWithProgressDialogBody<T>({
  content,
  description,
  items,
  onDelete,
  onOpenChange,
  title,
}: Omit<DeleteWithProgressDialogProps<T>, "open">) {
  const trashTerminology = getTrashTerminology();
  const [isPending, setIsPending] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isPending) {
      const initialTimer = setTimeout(() => {
        setShowWarning(true);
      }, 3000);

      const cycleTimer = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
      }, 7000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(cycleTimer);
      };
    }
    setShowWarning(false);
    setMessageIndex(0);
    return;
  }, [isPending]);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await onDelete(items);
      onOpenChange(false);
    } catch {
      setIsPending(false);
    }
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        {content}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <div className="flex flex-col gap-3 w-full">
          {showWarning && (
            <Alert variant="default">
              <Timer />
              <AlertDescription>
                {PROGRESS_MESSAGES[messageIndex]}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="text-white"
              disabled={isPending}
            >
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  await handleDelete();
                }}
                variant="destructive"
              >
                {isPending
                  ? `Moving to ${trashTerminology}...`
                  : `Move to ${trashTerminology}`}
              </Button>
            </AlertDialogAction>
          </div>
        </div>
      </AlertDialogFooter>
    </>
  );
}
