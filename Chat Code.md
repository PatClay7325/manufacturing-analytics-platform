// Root: /workspace/ollama-chat
// Next.js 15 ChatGPT-4o Clone UI with ThoughtCards and Ollama Backend

// 1. Create pages/index.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ThoughtCard from "@/components/ThoughtCard";

export default function HomePage() {
  const [messages, setMessages] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const newMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, newMessage]);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, newMessage] }),
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    if (data.thoughts) setThoughts(data.thoughts);
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <div className="inline-block bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2">
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <ChatInput onSend={sendMessage} />
      </div>
      <div className="w-96 border-l p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Thought Cards</h2>
        {thoughts.map((t, idx) => (
          <ThoughtCard key={idx} {...t} />
        ))}
      </div>
    </div>
  );
}

// 2. components/ChatInput.tsx
import { useState } from "react";
export default function ChatInput({ onSend }) {
  const [text, setText] = useState("");
  const submit = () => {
    if (text.trim()) {
      onSend(text);
      setText("");
    }
  };
  return (
    <div className="p-4 border-t bg-white dark:bg-gray-800">
      <textarea
        className="w-full border rounded-xl p-2 resize-none"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask something..."
      ></textarea>
    </div>
  );
}

// 3. components/ThoughtCard.tsx
export default function ThoughtCard({ type, title, body }) {
  const color =
    type === "reasoning"
      ? "border-yellow-500"
      : type === "critique"
      ? "border-red-500"
      : "border-green-500";
  return (
    <div className={`mb-4 border-l-4 ${color} pl-4 py-2 bg-white dark:bg-gray-800 rounded-md shadow-md`}>
      <h3 className="text-md font-semibold capitalize">{type}: {title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">{body}</p>
    </div>
  );
}

// 4. pages/api/chat.ts
import { NextResponse } from "next/server";
export async function POST(req) {
  const { messages } = await req.json();
  const response = await fetch(process.env.NEXT_PUBLIC_OLLAMA_HOST + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await response.json();
  return NextResponse.json({ reply: data.reply, thoughts: data.thoughts || [] });
}
