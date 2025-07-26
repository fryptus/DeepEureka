"use client"

import React, { createContext, useContext, useState } from "react";
import type { Trace } from "@/components/workflow-map";
import { ResearchPlanResponse } from "@/lib/utils";

type Message = {
  role: "user" | "agent";
  content: string;
  traces?: Trace[];
  error?: boolean;
  loading?: boolean;
  retryInput?: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  traces?: Trace[];
  idea?: string;
  researchPlan?: ResearchPlanResponse; // 添加研究计划类型
};

// 新增：编辑面板数据类型
type EditingTraceData = {
  traceId: number;
  summary: string;
  nodes: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
};

type ChatContextType = {
  sessions: ChatSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  handleNewSession: () => void;
  handleDeleteSession: (id: string) => void;
  handleUpdateMessages: (messages: Message[]) => void;
  handleUpdateTraces: (traces: Trace[]) => void;
  handleUpdateIdea: (idea: string) => void;
  handleRenameSession: (sessionId: string, newTitle: string) => void;
  handleUpdateResearchPlan: (sessionId: string, researchPlan: ResearchPlanResponse) => void;

  // 新增：编辑状态管理
  editingTrace: EditingTraceData | null;
  setEditingTrace: (data: EditingTraceData | null) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // 会话相关
  const [sessions, setSessions] = useState<ChatSession[]>(
    [{ id: "1", title: "新会话", messages: [] }]
  );
  const [activeSessionId, setActiveSessionId] = useState("1");

  // 新增：编辑面板状态
  const [editingTrace, setEditingTrace] = useState<EditingTraceData | null>(null);

  const handleNewSession = () => {
    const newId = Date.now().toString();
    setSessions([
      ...sessions,
      { id: newId, title: `会话${sessions.length + 1}`, messages: [] },
    ]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (id === activeSessionId && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      } else if (filtered.length === 0) {
        const newId = Date.now().toString();
        setActiveSessionId(newId);
        return [{ id: newId, title: "新会话", messages: [] }];
      }
      return filtered;
    });
  };

  const handleUpdateMessages = (messages: Message[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages } : s
      )
    );
  };

  const handleUpdateTraces = (traces: Trace[]) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId ? { ...s, traces } : s
      )
    );
  };

  const handleUpdateIdea = (idea: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId ? { ...s, idea } : s
      )
    );
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, title: newTitle }
          : session
      )
    );
  };

  // 更新研究计划的方法
  const handleUpdateResearchPlan = (sessionId: string, researchPlan: ResearchPlanResponse) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, researchPlan }
        : session
    ));
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        setActiveSessionId,
        handleNewSession,
        handleDeleteSession,
        handleRenameSession,
        handleUpdateMessages,
        handleUpdateTraces,
        handleUpdateIdea,
        editingTrace,
        setEditingTrace,
        handleUpdateResearchPlan,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};