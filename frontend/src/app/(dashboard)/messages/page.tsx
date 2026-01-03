"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { MessageChannel, getFullName } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Send,
  Phone,
  Mail,
  MessageSquare,
  User,
  Loader2,
  AlertCircle,
  Clock,
  Building2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Channel = "facebook" | "instagram" | "sms";

interface Conversation {
  contact: {
    _id: Id<"contacts">;
    fullName: string;
    phone?: string;
    email?: string;
    preferredMessageChannel?: MessageChannel;
    facebookPsid?: string;
    instagramScopedId?: string;
  };
  latestMessage: {
    content: string;
    createdAt: number;
    channel: string;
    isOutgoing: boolean;
  };
  unreadCount: number;
}

const channelColors: Record<MessageChannel, string> = {
  sms: "bg-green-500",
  facebook: "bg-blue-600",
  instagram: "bg-pink-500",
};

// Social media icons
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const SmsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
  </svg>
);

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else {
    return `${diffDays}d`;
  }
};

const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default function MessagesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convex queries
  const conversations = useQuery(api.messages.getConversations) as Conversation[] | undefined;
  const messages = useQuery(
    api.messages.getByContact,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );
  const contactOpportunities = useQuery(
    api.opportunities.getByContact,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );

  // Convex actions/mutations
  const sendMetaMessage = useAction(api.meta.sendMessage);
  const sendSmsMessage = useAction(api.semaphore.sendMessage);
  const markAllAsRead = useMutation(api.messages.markAllAsRead);

  // Get selected conversation
  const selectedConversation = conversations?.find(
    (c) => c.contact._id === selectedContactId
  );
  const selectedContact = selectedConversation?.contact;

  // Determine channel from contact - prioritize SMS for contacts with phone numbers
  const getSelectedChannel = (): Channel | null => {
    if (!selectedContact) return null;
    // Prioritize SMS if contact has phone number
    if (selectedContact.phone) return "sms";
    if (selectedContact.facebookPsid) return "facebook";
    if (selectedContact.instagramScopedId) return "instagram";
    return null;
  };

  // Get available channels for this contact
  const getAvailableChannels = (): Channel[] => {
    if (!selectedContact) return [];
    const channels: Channel[] = [];
    if (selectedContact.phone) channels.push("sms");
    if (selectedContact.facebookPsid) channels.push("facebook");
    if (selectedContact.instagramScopedId) channels.push("instagram");
    return channels;
  };

  const getPlatformUserId = (): string | null => {
    if (!selectedContact) return null;
    if (selectedContact.facebookPsid) return selectedContact.facebookPsid;
    if (selectedContact.instagramScopedId) return selectedContact.instagramScopedId;
    return null;
  };

  // Get current channel for window status query
  const currentChannel = getSelectedChannel();

  // Messaging window status query (only for Facebook/Instagram - SMS has no window)
  const windowStatus = useQuery(
    api.messages.getMessagingWindowStatus,
    selectedContactId && currentChannel && (currentChannel === "facebook" || currentChannel === "instagram")
      ? { contactId: selectedContactId, channel: currentChannel }
      : "skip"
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when selecting a contact
  useEffect(() => {
    if (selectedContactId && selectedConversation?.unreadCount) {
      markAllAsRead({ contactId: selectedContactId });
    }
  }, [selectedContactId, selectedConversation?.unreadCount, markAllAsRead]);

  const filteredConversations = conversations
    ?.filter((conv) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        conv.contact.fullName.toLowerCase().includes(searchLower) ||
        conv.contact.phone?.toLowerCase().includes(searchLower) ||
        conv.contact.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => b.latestMessage.createdAt - a.latestMessage.createdAt);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContactId) return;

    const channel = getSelectedChannel();

    if (!channel) {
      setError("This contact has no messaging options available");
      return;
    }

    setSending(true);
    setError(null);

    try {
      let result: { success: boolean; messageId?: string; error?: string };

      if (channel === "sms") {
        // Send via Semaphore SMS
        if (!selectedContact?.phone) {
          setError("Contact has no phone number");
          setSending(false);
          return;
        }

        result = await sendSmsMessage({
          contactId: selectedContactId,
          phoneNumber: selectedContact.phone,
          content: newMessage.trim(),
          senderName: "CRM User",
        });
      } else {
        // Send via Meta (Facebook/Instagram)
        const platformUserId = getPlatformUserId();

        if (!platformUserId) {
          setError("This contact has no Facebook or Instagram connection");
          setSending(false);
          return;
        }

        result = await sendMetaMessage({
          contactId: selectedContactId,
          channel,
          platformUserId,
          content: newMessage.trim(),
          senderName: "CRM User",
        });
      }

      if (result.success) {
        setNewMessage("");
      } else {
        setError(result.error || "Failed to send message");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const canSendMessage = () => {
    const channel = getSelectedChannel();
    if (!channel) return false;
    // SMS has no window restrictions
    if (channel === "sms") return true;
    // Facebook/Instagram require messaging window
    if (!windowStatus) return false;
    return windowStatus.canSendAny || windowStatus.canSendHumanAgent;
  };

  return (
    <div className="h-[calc(100vh-64px-48px)] flex overflow-hidden">
      {/* Left Sidebar - Contact List */}
      <div className="w-80 border-r bg-white flex flex-col h-full">
        <div className="p-4 border-b shrink-0">
          <h1 className="text-lg font-bold text-foreground mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {!conversations ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? "No contacts found" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations?.map((conv) => (
              <div
                key={conv.contact._id}
                onClick={() => setSelectedContactId(conv.contact._id)}
                className={cn(
                  "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedContactId === conv.contact._id && "bg-muted"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conv.contact.phone && (
                        <div className={cn("h-4 w-4 rounded flex items-center justify-center shrink-0", channelColors.sms)}>
                          <SmsIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      {conv.contact.facebookPsid && (
                        <div className={cn("h-4 w-4 rounded flex items-center justify-center shrink-0", channelColors.facebook)}>
                          <FacebookIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      {conv.contact.instagramScopedId && (
                        <div className={cn("h-4 w-4 rounded flex items-center justify-center shrink-0", channelColors.instagram)}>
                          <InstagramIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <p className="font-medium text-sm text-foreground truncate">
                        {conv.contact.fullName || conv.contact.phone || "Unknown"}
                      </p>
                    </div>

                    {conv.contact.phone && conv.contact.fullName && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{conv.contact.phone}</span>
                      </div>
                    )}

                    {conv.contact.email && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{conv.contact.email}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                      {conv.latestMessage.isOutgoing && "You: "}
                      {conv.latestMessage.content}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTimeAgo(conv.latestMessage.createdAt)}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-[#ff5603] text-white text-[10px] px-1.5 py-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right - Message Area */}
      <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
        {selectedContact ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#ff5603]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#ff5603]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getSelectedChannel() === "sms" && (
                      <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", channelColors.sms)}>
                        <SmsIcon className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {getSelectedChannel() === "facebook" && (
                      <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", channelColors.facebook)}>
                        <FacebookIcon className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {getSelectedChannel() === "instagram" && (
                      <div className={cn("h-5 w-5 rounded flex items-center justify-center shrink-0", channelColors.instagram)}>
                        <InstagramIcon className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <h2 className="font-semibold text-foreground">
                      {selectedContact.fullName || selectedContact.phone || "Unknown"}
                    </h2>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/contacts/${selectedContactId}`)}
                    className="gap-1.5"
                  >
                    <User className="h-3.5 w-3.5" />
                    Contact
                  </Button>
                  {contactOpportunities && contactOpportunities.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/pipeline?opportunityId=${contactOpportunities[0]._id}`)}
                      className="gap-1.5"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Opportunity
                    </Button>
                  )}
                </div>

                {/* Messaging Window Status */}
                {windowStatus && windowStatus.hasWindow && (
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span className={cn(
                      windowStatus.canSendAny ? "text-green-600" :
                      windowStatus.canSendHumanAgent ? "text-amber-600" : "text-red-600"
                    )}>
                      {windowStatus.canSendAny
                        ? `24h window: ${formatTimeRemaining(windowStatus.timeRemaining || 0)}`
                        : windowStatus.canSendHumanAgent
                        ? `Human agent: ${formatTimeRemaining(windowStatus.timeRemaining || 0)}`
                        : "Window expired"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {!messages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No messages yet
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={cn(
                      "flex",
                      message.isOutgoing ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        message.isOutgoing
                          ? "bg-[#ff5603] text-white"
                          : "bg-white border"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div
                        className={cn(
                          "text-[10px] mt-1 flex items-center gap-2",
                          message.isOutgoing
                            ? "text-white/70"
                            : "text-muted-foreground"
                        )}
                      >
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {message.channel && (
                          <span className="flex items-center gap-1">
                            via
                            {message.channel === "sms" ? (
                              <SmsIcon className="h-3 w-3" />
                            ) : message.channel === "facebook" ? (
                              <FacebookIcon className="h-3 w-3" />
                            ) : message.channel === "instagram" ? (
                              <InstagramIcon className="h-3 w-3" />
                            ) : (
                              message.channel
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t bg-white shrink-0">
              {!getSelectedChannel() ? (
                <div className="text-center py-2 text-muted-foreground text-sm">
                  This contact has no phone number or social connection.
                  <br />
                  Add a phone number to send SMS.
                </div>
              ) : !canSendMessage() ? (
                <div className="text-center py-2 text-amber-600 text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Messaging window expired. Wait for customer to message.
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder={`Message via ${getSelectedChannel() === "sms" ? "SMS" : getSelectedChannel() === "facebook" ? "Facebook" : "Instagram"}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-[#ff5603] hover:bg-[#ff5603]/90"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a contact to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
