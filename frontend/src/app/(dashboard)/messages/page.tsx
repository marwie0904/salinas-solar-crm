"use client";

import { useState } from "react";
import { MessageChannel, ContactSource, getFullName } from "@/lib/types";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// Local mock interfaces (will be replaced with real data from backend)
interface MockMessage {
  _id: string;
  content: string;
  senderName: string;
  createdAt: number;
  isOutgoing: boolean;
}

interface MockContact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  source: ContactSource;
  preferredMessageChannel?: MessageChannel;
  messages: MockMessage[];
  lastMessageTime: number;
}

// Mock contacts with messages (fixed timestamps to avoid hydration mismatch)
const mockContacts: MockContact[] = [
  {
    _id: "c1",
    firstName: "Juan",
    lastName: "Santos",
    email: "juan.santos@email.com",
    phone: "+63 917 123 4567",
    address: "123 Mabini St, Makati City",
    source: "website",
    preferredMessageChannel: "sms",
    messages: [
      {
        _id: "m1",
        content: "Interested in solar panel installation for my home",
        senderName: "Juan Santos",
        createdAt: Date.parse("2024-12-19T09:30:00Z"),
        isOutgoing: false,
      },
      {
        _id: "m2",
        content: "Hello! Thank you for your interest. We'd love to help you with solar installation. When would be a good time to discuss your needs?",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-19T09:35:00Z"),
        isOutgoing: true,
      },
      {
        _id: "m3",
        content: "How about tomorrow afternoon around 2pm?",
        senderName: "Juan Santos",
        createdAt: Date.parse("2024-12-19T09:40:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-19T09:40:00Z"),
  },
  {
    _id: "c2",
    firstName: "",
    lastName: "",
    phone: "+63 918 234 5678",
    source: "other",
    preferredMessageChannel: "sms",
    messages: [
      {
        _id: "m4",
        content: "Hi, I saw your ad on Facebook. How much is a 5kW system?",
        senderName: "+63 918 234 5678",
        createdAt: Date.parse("2024-12-19T08:00:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-19T08:00:00Z"),
  },
  {
    _id: "c3",
    firstName: "Ana",
    lastName: "Dela Cruz",
    email: "ana.delacruz@gmail.com",
    phone: "+63 919 345 6789",
    source: "facebook",
    preferredMessageChannel: "facebook",
    messages: [
      {
        _id: "m5",
        content: "What financing options do you have available?",
        senderName: "Ana Dela Cruz",
        createdAt: Date.parse("2024-12-14T10:00:00Z"),
        isOutgoing: false,
      },
      {
        _id: "m6",
        content: "We offer several financing options including bank loans, in-house financing, and government subsidies. Would you like me to send you the details?",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-15T10:00:00Z"),
        isOutgoing: true,
      },
      {
        _id: "m7",
        content: "Yes please, that would be great!",
        senderName: "Ana Dela Cruz",
        createdAt: Date.parse("2024-12-16T10:00:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-16T10:00:00Z"),
  },
  {
    _id: "c4",
    firstName: "Roberto",
    lastName: "Mendoza",
    email: "r.mendoza@mendozalogistics.com",
    phone: "+63 920 456 7890",
    source: "other",
    preferredMessageChannel: "sms",
    messages: [
      {
        _id: "m8",
        content: "Please find attached our revised proposal.",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-19T00:00:00Z"),
        isOutgoing: true,
      },
      {
        _id: "m9",
        content: "Thanks! We're reviewing with our finance team.",
        senderName: "Roberto Mendoza",
        createdAt: Date.parse("2024-12-19T01:00:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-19T01:00:00Z"),
  },
  {
    _id: "c5",
    firstName: "Carmen",
    lastName: "Villanueva",
    email: "carmen.v@email.com",
    phone: "+63 921 567 8901",
    source: "referral",
    preferredMessageChannel: "instagram",
    messages: [
      {
        _id: "m10",
        content: "Is the site visit still happening tomorrow?",
        senderName: "Carmen Villanueva",
        createdAt: Date.parse("2024-12-19T09:15:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-19T09:15:00Z"),
  },
  {
    _id: "c6",
    firstName: "Antonio",
    lastName: "Reyes",
    email: "antonio.reyes@farm.com",
    phone: "+63 924 890 1234",
    source: "walk_in",
    preferredMessageChannel: "facebook",
    messages: [
      {
        _id: "m11",
        content: "Good morning! Just following up on the farm solar project.",
        senderName: "Maria Garcia",
        createdAt: Date.parse("2024-12-19T07:00:00Z"),
        isOutgoing: true,
      },
      {
        _id: "m12",
        content: "Can you send me more info about the agricultural incentives?",
        senderName: "Antonio Reyes",
        createdAt: Date.parse("2024-12-19T08:00:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-19T08:00:00Z"),
  },
  {
    _id: "c7",
    firstName: "",
    lastName: "",
    phone: "+63 925 111 2222",
    source: "google_ads",
    preferredMessageChannel: "sms",
    messages: [
      {
        _id: "m13",
        content: "Hello, how much would it cost for a small business setup?",
        senderName: "+63 925 111 2222",
        createdAt: Date.parse("2024-12-18T10:00:00Z"),
        isOutgoing: false,
      },
    ],
    lastMessageTime: Date.parse("2024-12-18T10:00:00Z"),
  },
];

const sourceLabels: Record<MessageChannel, string> = {
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
};

const sourceColors: Record<MessageChannel, string> = {
  sms: "bg-green-500",
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
};

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

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<(typeof mockContacts)[0] | null>(
    mockContacts[0]
  );
  const [newMessage, setNewMessage] = useState("");

  const filteredContacts = mockContacts
    .filter((contact) => {
      const searchLower = searchQuery.toLowerCase();
      const displayName = getFullName(contact.firstName, contact.lastName) || contact.phone || "";
      return (
        displayName.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

  const getContactDisplayName = (contact: (typeof mockContacts)[0]) => {
    const fullName = getFullName(contact.firstName, contact.lastName);
    return fullName || contact.phone || "Unknown";
  };

  const getLastMessage = (contact: (typeof mockContacts)[0]) => {
    if (contact.messages.length === 0) return "";
    return contact.messages[contact.messages.length - 1].content;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;
    // In a real app, this would send the message to the backend
    setNewMessage("");
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
          {filteredContacts.map((contact) => (
            <div
              key={contact._id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                selectedContact?._id === contact._id && "bg-muted"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">
                      {getContactDisplayName(contact)}
                    </p>
                    {contact.preferredMessageChannel && (
                      <Badge
                        className={cn(
                          "text-white text-[10px] px-1.5 py-0",
                          sourceColors[contact.preferredMessageChannel]
                        )}
                      >
                        {sourceLabels[contact.preferredMessageChannel]}
                      </Badge>
                    )}
                  </div>

                  {contact.phone && (contact.firstName || contact.lastName) && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                    {getLastMessage(contact)}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimeAgo(contact.lastMessageTime)}
                </span>
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No contacts found
            </div>
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
                    <h2 className="font-semibold text-foreground">
                      {getContactDisplayName(selectedContact)}
                    </h2>
                    {selectedContact.preferredMessageChannel && (
                      <Badge
                        className={cn(
                          "text-white text-xs",
                          sourceColors[selectedContact.preferredMessageChannel]
                        )}
                      >
                        {sourceLabels[selectedContact.preferredMessageChannel]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {selectedContact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedContact.phone}
                      </span>
                    )}
                    {selectedContact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedContact.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {selectedContact.messages.map((message) => (
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
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        message.isOutgoing
                          ? "text-white/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white shrink-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-[#ff5603] hover:bg-[#ff5603]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
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
