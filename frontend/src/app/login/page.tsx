"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

const SESSION_TOKEN_KEY = "salinas_session_token";

type LoginStep =
  | "credentials"
  | "user_selection"
  | "password_change"
  | "verification_needed";

interface LinkedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Multi-step login state
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [authEmail, setAuthEmail] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Verification state
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const loginMutation = useMutation(api.auth.login);
  const selectDualAccountUser = useMutation(api.auth.selectDualAccountUser);
  const getLinkedUsersQuery = useQuery(
    api.auth.getLinkedUsers,
    authEmail ? { authUserEmail: authEmail } : "skip"
  );
  const changePasswordMutation = useMutation(api.auth.changePassword);
  const skipPasswordChangeMutation = useMutation(api.auth.skipPasswordChange);
  const requestVerificationMutation = useMutation(api.auth.requestEmailVerification);
  const sendVerificationEmailAction = useAction(api.email.sendVerificationEmail);

  // Update linked users when query returns
  useEffect(() => {
    if (getLinkedUsersQuery?.users && getLinkedUsersQuery.users.length > 0) {
      setLinkedUsers(getLinkedUsersQuery.users);
    }
  }, [getLinkedUsersQuery]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        router.replace("/dashboard");
      } else {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginMutation({ email, password });

      if (result.success && result.sessionToken) {
        localStorage.setItem(SESSION_TOKEN_KEY, result.sessionToken);
        setSessionToken(result.sessionToken);
        setCurrentPassword(password); // Save for password change

        // Check login flow steps
        if (result.isDualAccount && result.linkedUserEmails && result.linkedUserEmails.length > 0) {
          // Dual account - need user selection
          setAuthEmail(email.toLowerCase());
          setLoginStep("user_selection");
        } else if (result.needsPasswordChange) {
          // First login - offer password change
          setLoginStep("password_change");
        } else if (result.needsVerification) {
          // Email verification needed
          setVerificationEmail(result.user?.email || email);
          setLoginStep("verification_needed");
        } else {
          // Normal login - go to dashboard
          router.replace("/dashboard");
        }
      } else {
        setError(result.error || "Login failed");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelection = async (selectedUser: LinkedUser) => {
    if (!sessionToken) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await selectDualAccountUser({
        sessionToken,
        selectedUserEmail: selectedUser.email,
      });

      if (result.success) {
        // Check if password change or verification is needed
        // For now, proceed to dashboard
        router.replace("/dashboard");
      } else {
        setError(result.error || "Failed to select user");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;

    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePasswordMutation({
        sessionToken,
        currentPassword,
        newPassword,
      });

      if (result.success) {
        router.replace("/dashboard");
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPasswordChange = async () => {
    if (!sessionToken) return;
    setIsLoading(true);

    try {
      await skipPasswordChangeMutation({ sessionToken });
      router.replace("/dashboard");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!sessionToken) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await requestVerificationMutation({ sessionToken });

      if (result.success && result.token && result.email) {
        // Send the verification email
        const baseUrl = window.location.origin;
        await sendVerificationEmailAction({
          to: result.email,
          verificationToken: result.token,
          baseUrl,
        });
        setVerificationSent(true);
      } else {
        setError(result.error || "Failed to send verification email");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipVerification = () => {
    // Allow user to proceed without verification (they'll be reminded again later)
    router.replace("/dashboard");
  };

  const formatRole = (role: string) => {
    return role
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5603]"></div>
      </div>
    );
  }

  // User Selection Step (for dual accounts like sales@)
  if (loginStep === "user_selection") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 items-center text-center">
            <Logo />
            <div>
              <CardTitle className="text-2xl">Select Your Profile</CardTitle>
              <CardDescription>
                Choose which user you are logging in as
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}
            <div className="space-y-3">
              {linkedUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelection(user)}
                  disabled={isLoading}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#ff5603] hover:bg-orange-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatRole(user.role || "")}
                  </div>
                </button>
              ))}
            </div>
            {isLoading && (
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff5603]"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Change Step
  if (loginStep === "password_change") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 items-center text-center">
            <Logo />
            <div>
              <CardTitle className="text-2xl">Change Your Password</CardTitle>
              <CardDescription>
                Would you like to set a new password? (Optional)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipPasswordChange}
                  disabled={isLoading}
                >
                  Skip
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#ff5603] hover:bg-[#e04d03]"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? "Saving..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Verification Step
  if (loginStep === "verification_needed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 items-center text-center">
            <Logo />
            <div>
              <CardTitle className="text-2xl">Email Verification Required</CardTitle>
              <CardDescription>
                For security, please verify your email address
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            {verificationSent ? (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                  Verification email sent to <strong>{verificationEmail}</strong>
                </div>
                <p className="text-sm text-gray-600">
                  Please check your email and click the verification link. The link expires in 24 hours.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkipVerification}
                  >
                    Continue Later
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-[#ff5603] hover:bg-[#e04d03]"
                    onClick={handleSendVerification}
                    disabled={isLoading}
                  >
                    Resend Email
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  We need to verify your email address ({verificationEmail}) every 30 days for security purposes.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkipVerification}
                  >
                    Skip for Now
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-[#ff5603] hover:bg-[#e04d03]"
                    onClick={handleSendVerification}
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Verification"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Credentials Step
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 items-center text-center">
          <Logo />
          <div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access the CRM dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#ff5603] hover:bg-[#e04d03]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
