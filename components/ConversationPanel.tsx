"use client";

import type { ConversationMessage } from "@/lib/conversation";

export default function ConversationPanel({ messages }: { messages: ConversationMessage[] }) {
  const visible = messages.slice(-6);
  return (
    <section className="conversationPanel" aria-label="Conversation with Future">
      <div className="assistantIdentity">
        <div className="assistantAvatar">F</div>
        <div>
          <strong>Future</strong>
          <span><i /> Executive assistant · ready</span>
        </div>
      </div>
      <div className="conversationFeed">
        {visible.length === 0 ? (
          <div className="assistantBubble">Tell me what needs your attention. I’ll organize it.</div>
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
