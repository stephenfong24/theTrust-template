import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";

export function AppAlertDialog({
  open,
  title,
  message,
  actionText = "OK",
  redirectTo,
  onClose
}: {
  open: boolean;
  title: string;
  message: string;
  actionText?: string;
  redirectTo?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const close = () => {
    onClose();
    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={close}>{actionText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
