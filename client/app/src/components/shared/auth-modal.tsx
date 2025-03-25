"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AuthModalProps {
    children: React.ReactNode;
    triggerText?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ children, triggerText = "Sign In" }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ? children : <button>{triggerText}</button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>
            Choose your preferred sign-in method
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <a
            href="/api/auth/google"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign in with Google
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
