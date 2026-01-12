"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const verifyEmailMutation = useMutation(api.auth.verifyEmail);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const result = await verifyEmailMutation({ token });

        if (result.success) {
          setStatus("success");
          setEmail(result.email || "");
          setMessage("Your email has been verified successfully!");
        } else {
          setStatus("error");
          setMessage(result.error || "Verification failed. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyToken();
  }, [token, verifyEmailMutation]);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 items-center text-center">
          <Logo />
          <div>
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              {status === "loading" ? "Verifying your email..." : "Verification result"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="h-12 w-12 animate-spin text-[#ff5603] mx-auto" />
              <p className="mt-4 text-gray-600">Please wait while we verify your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-700 mb-2">{message}</p>
              {email && (
                <p className="text-sm text-gray-600 mb-6">
                  Email verified: <strong>{email}</strong>
                </p>
              )}
              <Button
                onClick={handleGoToDashboard}
                className="w-full bg-[#ff5603] hover:bg-[#e04d03]"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="py-4">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-700 mb-2">Verification Failed</p>
              <p className="text-sm text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-[#ff5603] hover:bg-[#e04d03]"
                >
                  Go to Login
                </Button>
                <p className="text-xs text-gray-500">
                  You can request a new verification email after logging in.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5603]"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
