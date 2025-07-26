"use client";

import dynamic from "next/dynamic";
import Flow from "@/components/workflow-map";
import { SolutionSidebar } from "@/components/solution-sidebar";
import { useChat } from "./chat-context";

const MarkdownEditor = dynamic(() => import("@/components/markdown-editor"), {
  ssr: false,
});

export default function Home() {
  const { sessions, activeSessionId } = useChat();
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <main className="flex h-screen w-full">
      <div className="flex-1 h-full overflow-hidden">
        <Flow traces={activeSession?.traces ?? []} idea={activeSession?.idea ?? ""} />
      </div>
      <SolutionSidebar />
    </main>
  );
}
