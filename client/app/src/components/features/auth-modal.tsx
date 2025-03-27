"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

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
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Sign in to your account</DialogTitle>
          <DialogDescription>
            Don't have an account? <a href="#" className="underline font-medium text-primary">Sign up</a>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* GitHub Button */}
          <Button variant="outline" className="w-full bg-gray-900 text-white hover:bg-gray-800">
            <FaGithub className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>
          {/* Google Button */}
          <Button
            variant="outline"
            className="w-full border border-gray-300 hover:bg-gray-100"
            onClick={() => {
              window.location.href = '/api/auth/google';
            }}
          >
            <FcGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground"> {/* Updated background/text for divider */}
                Or continue with
              </span>
            </div>
          </div>

          {/* Email Input */}
          <div className="grid gap-2">
            <label htmlFor="email-magic" className="text-sm font-medium text-gray-700">Email</label>
            <Input id="email-magic" type="email" placeholder="m@example.com" required />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
