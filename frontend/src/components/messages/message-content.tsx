"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { detectContactInfo, cn, type DetectedInfo } from "@/lib/utils";
import { Plus, Mail, Phone, Check, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageContentProps {
  content: string;
  isOutgoing: boolean;
  contactId: Id<"contacts">;
  contactEmail?: string;
  contactPhone?: string;
}

export function MessageContent({
  content,
  isOutgoing,
  contactId,
  contactEmail,
  contactPhone,
}: MessageContentProps) {
  const [addingType, setAddingType] = useState<"email" | "phone" | null>(null);
  const [addedValues, setAddedValues] = useState<Set<string>>(new Set());

  const updateContact = useMutation(api.contacts.update);

  const detectedInfo = useMemo(() => detectContactInfo(content), [content]);

  const handleAdd = async (info: DetectedInfo) => {
    // Don't add if already exists on contact
    if (info.type === "email" && contactEmail === info.value) return;
    if (info.type === "phone" && contactPhone === info.value) return;
    if (addedValues.has(info.value)) return;

    setAddingType(info.type);

    try {
      await updateContact({
        id: contactId,
        ...(info.type === "email" ? { email: info.value } : { phone: info.value }),
      });
      setAddedValues((prev) => new Set([...prev, info.value]));
    } catch (error) {
      console.error("Failed to update contact:", error);
    } finally {
      setAddingType(null);
    }
  };

  // If no detected info, just render plain text
  if (detectedInfo.length === 0) {
    return <p className="text-sm">{content}</p>;
  }

  // Build rendered content with highlighted portions
  const renderContent = () => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    detectedInfo.forEach((info, idx) => {
      // Add text before this match
      if (info.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{content.slice(lastIndex, info.startIndex)}</span>
        );
      }

      const isAlreadyOnContact =
        (info.type === "email" && contactEmail === info.value) ||
        (info.type === "phone" && contactPhone === info.value);
      const wasJustAdded = addedValues.has(info.value);
      const showAddButton = !isAlreadyOnContact && !wasJustAdded;

      elements.push(
        <span
          key={`match-${idx}`}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1 -mx-1",
            isOutgoing
              ? "bg-white/20"
              : "bg-orange-100 text-orange-800"
          )}
        >
          <span className="font-medium">
            {content.slice(info.startIndex, info.endIndex)}
          </span>
          {showAddButton && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleAdd(info)}
                    disabled={addingType !== null}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full w-5 h-5 ml-0.5 transition-colors",
                      isOutgoing
                        ? "bg-white/30 hover:bg-white/50 text-white"
                        : "bg-orange-200 hover:bg-orange-300 text-orange-800"
                    )}
                  >
                    {addingType === info.type ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Add as {info.type === "email" ? "email" : "phone number"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {(isAlreadyOnContact || wasJustAdded) && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full w-5 h-5 ml-0.5",
                      isOutgoing
                        ? "bg-white/30 text-white"
                        : "bg-green-200 text-green-800"
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {info.type === "email" ? "Email" : "Phone"} saved to contact
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
      );

      lastIndex = info.endIndex;
    });

    // Add remaining text after last match
    if (lastIndex < content.length) {
      elements.push(<span key="text-end">{content.slice(lastIndex)}</span>);
    }

    return elements;
  };

  return <p className="text-sm">{renderContent()}</p>;
}
