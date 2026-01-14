"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

// Activity tracking constants
const ACTIVITY_UPDATE_INTERVAL = 60 * 1000; // Update activity every 60 seconds max
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

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
  const updateActivityMutation = useMutation(api.users.updateActivity);

  // Activity tracking
  const lastActivityUpdate = useRef<number>(0);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(async () => {
    if (!sessionData?.user?.id) return;

    const now = Date.now();
    // Only update if enough time has passed since last update
    if (now - lastActivityUpdate.current < ACTIVITY_UPDATE_INTERVAL) return;

    lastActivityUpdate.current = now;
    try {
      await updateActivityMutation({ id: sessionData.user.id as Id<"users"> });
    } catch (error) {
      // Silently fail - activity tracking is not critical
      console.error("Failed to update activity:", error);
    }
  }, [sessionData?.user?.id, updateActivityMutation]);

  // Track user activity events
  useEffect(() => {
    if (!sessionData?.valid || !sessionData?.user?.id) return;

    const handleActivity = () => {
      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      // Debounce activity updates
      activityTimeoutRef.current = setTimeout(() => {
        updateActivity();
      }, 1000); // Wait 1 second after activity stops before updating
    };

    // Add event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial activity update when component mounts
    updateActivity();

    // Update activity when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Cleanup event listeners
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [sessionData?.valid, sessionData?.user?.id, updateActivity]);

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
