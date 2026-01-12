"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsUserSelection: boolean;
  needsPasswordChange: boolean;
  isDualAccount: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = "salinas_session_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load session token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    setSessionToken(token);
    setIsInitialized(true);
  }, []);

  // Verify session with Convex
  const sessionData = useQuery(
    api.auth.verifySession,
    isInitialized ? { sessionToken: sessionToken ?? undefined } : "skip"
  );

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  // Handle expired sessions
  useEffect(() => {
    if (sessionData && !sessionData.valid && sessionToken) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
    }
  }, [sessionData, sessionToken]);

  const login = async (email: string, password: string) => {
    const result = await loginMutation({ email, password });

    if (result.success && result.sessionToken) {
      localStorage.setItem(SESSION_TOKEN_KEY, result.sessionToken);
      setSessionToken(result.sessionToken);
      return { success: true };
    }

    return { success: false, error: result.error || "Login failed" };
  };

  const logout = async () => {
    if (sessionToken) {
      await logoutMutation({ sessionToken });
      localStorage.removeItem(SESSION_TOKEN_KEY);
      setSessionToken(null);
    }
  };

  const isLoading = !isInitialized || (sessionToken !== null && sessionData === undefined);
  const isAuthenticated = sessionData?.valid === true && sessionData?.user !== null;
  const needsUserSelection = sessionData?.needsUserSelection === true;
  const needsPasswordChange = sessionData?.needsPasswordChange === true;
  const isDualAccount = sessionData?.isDualAccount === true;
  const user = sessionData?.user as AuthUser | null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        needsUserSelection,
        needsPasswordChange,
        isDualAccount,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Component to protect routes
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, needsUserSelection } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
    // If user needs to select which profile (dual account), redirect to login
    if (!isLoading && needsUserSelection) {
      window.location.href = "/login";
    }
  }, [isLoading, isAuthenticated, needsUserSelection]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || needsUserSelection) {
    return null;
  }

  return <>{children}</>;
}
