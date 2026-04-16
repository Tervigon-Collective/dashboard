"use client";

import ChatContentGenerator from "@/components/ChatContentGenerator";

export default function Playground() {
  return (
    <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <ChatContentGenerator />
    </div>
  );
}
