"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PageTitleContextType {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  pageAction: (() => void) | null;
  setPageAction: (action: (() => void) | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState("");
  const [pageAction, setPageAction] = useState<(() => void) | null>(null);

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle, pageAction, setPageAction }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error("usePageTitle must be used within a PageTitleProvider");
  }
  return context;
}
