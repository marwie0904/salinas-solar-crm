"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type Channel = "facebook" | "instagram";

interface Conversation {
  contact: {
    _id: Id<"contacts">;
    fullName: string;
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

export default function MessageTestingPage() {
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get conversations (contacts with messages)
  const conversations = useQuery(api.messages.getConversations) as Conversation[] | undefined;

  // Get messages for selected contact
  const messages = useQuery(
    api.messages.getByContact,
    selectedContactId ? { contactId: selectedContactId } : "skip"
  );

  // Get selected contact details
  const selectedContact = conversations?.find((c) => c.contact._id === selectedContactId)?.contact;

  // Send message action
  const sendMessage = useAction(api.meta.sendMessage);

  // Determine which channel to use based on contact's platform IDs
  const getChannel = (): Channel | null => {
    if (!selectedContact) return null;
    if (selectedContact.facebookPsid) return "facebook";
    if (selectedContact.instagramScopedId) return "instagram";
    return null;
  };

  const getPlatformUserId = (): string | null => {
    if (!selectedContact) return null;
    if (selectedContact.facebookPsid) return selectedContact.facebookPsid;
    if (selectedContact.instagramScopedId) return selectedContact.instagramScopedId;
    return null;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContactId) return;

    const channel = getChannel();
    const platformUserId = getPlatformUserId();

    if (!channel || !platformUserId) {
      setError("Contact has no Facebook or Instagram connection");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const result = await sendMessage({
        contactId: selectedContactId,
        channel,
        platformUserId,
        content: messageInput.trim(),
        senderName: "CRM User",
      });

      if (result.success) {
        setMessageInput("");
      } else {
        setError(result.error || "Failed to send message");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Message Testing</h1>
          <p className="text-sm text-gray-500 mt-1">Facebook & Instagram</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!conversations ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet.
              <br />
              <span className="text-xs">Messages will appear when customers message you.</span>
            </div>
          ) : (
            conversations.map((conv) => {
              const hasFb = !!conv.contact.facebookPsid;
              const hasIg = !!conv.contact.instagramScopedId;
              const channel = conv.latestMessage.channel;

              return (
                <div
                  key={conv.contact._id}
                  onClick={() => setSelectedContactId(conv.contact._id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedContactId === conv.contact._id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{conv.contact.fullName}</span>
                    <div className="flex gap-1">
                      {hasFb && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          FB
                        </span>
                      )}
                      {hasIg && (
                        <span className="px-1.5 py-0.5 text-xs bg-pink-100 text-pink-700 rounded">
                          IG
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate max-w-[180px]">
                      {conv.latestMessage.isOutgoing && "You: "}
                      {conv.latestMessage.content}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatTime(conv.latestMessage.createdAt)}
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {conv.unreadCount} new
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Message Box */}
      <div className="flex-1 flex flex-col">
        {!selectedContactId ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm mt-2">Choose a contact from the left to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedContact?.fullName}</h2>
                  <div className="flex gap-2 mt-1">
                    {selectedContact?.facebookPsid && (
                      <span className="text-xs text-blue-600">
                        FB: {selectedContact.facebookPsid.slice(0, 10)}...
                      </span>
                    )}
                    {selectedContact?.instagramScopedId && (
                      <span className="text-xs text-pink-600">
                        IG: {selectedContact.instagramScopedId.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Channel:{" "}
                  <span className={getChannel() === "facebook" ? "text-blue-600" : "text-pink-600"}>
                    {getChannel()?.toUpperCase() || "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {!messages ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-500">No messages yet</div>
              ) : (
                messages.map((msg, index) => {
                  const showDate =
                    index === 0 ||
                    formatDate(msg.createdAt) !== formatDate(messages[index - 1].createdAt);

                  return (
                    <div key={msg._id}>
                      {showDate && (
                        <div className="text-center text-xs text-gray-400 my-4">
                          {formatDate(msg.createdAt)}
                        </div>
                      )}
                      <div
                        className={`flex ${msg.isOutgoing ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.isOutgoing
                              ? "bg-blue-500 text-white"
                              : "bg-white border border-gray-200 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div
                            className={`text-xs mt-1 ${
                              msg.isOutgoing ? "text-blue-100" : "text-gray-400"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                            {msg.channel && (
                              <span className="ml-2">
                                via {msg.channel === "facebook" ? "FB" : "IG"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Input Box */}
            <div className="p-4 bg-white border-t border-gray-200">
              {!getChannel() ? (
                <div className="text-center py-2 text-gray-500 text-sm">
                  This contact has no Facebook or Instagram connection.
                  <br />
                  They need to message you first.
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message via ${getChannel() === "facebook" ? "Facebook" : "Instagram"}...`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !messageInput.trim()}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      sending || !messageInput.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
