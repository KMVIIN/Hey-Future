"use client";

import type { ConversationMessage } from "@/lib/conversation";
import EclipseBrand from "./EclipseBrand";

export default function ConversationPanel({ messages }: { messages: ConversationMessage[] }) {
  const visible = messages.slice(-6);
  return (
    <section className="conversationPanel" aria-label="Conversation with Future">
      <div className="assistantIdentity">
        <EclipseBrand compact />
        <div>
          <strong>Future</strong>
          <span><i /> Agentic secretary · ready</span>
        </div>
      </div>
      <div className="conversationFeed">
        {visible.length === 0 ? (
          <div className="assistantBubble">Tell me what you need in your own words. I can plan multi-step work and pause before sensitive actions.</div>
        ) : visible.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="messageLabel">{message.role === "assistant" ? "Future" : "You"}</div>
            <div className="messageBubble">{message.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
