"use client"

import React, { useState } from "react";
import { AppSidebar } from "./file-explorer";
import { ChatHistorySidebar } from "./chat-history";
import { ResearchPlanModal } from "./research-plan-modal";
import { Folder, Lightbulb } from "lucide-react";
import { useChat } from "@/app/chat-context";
import { ResearchPlanResponse } from "../lib/utils";

export function SidebarTabs() {
  const [tab, setTab] = useState<"file" | "chat">("file");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ResearchPlanResponse | null>(null);

  // 使用 chat context 而不是本地状态
  const {
    sessions,
    activeSessionId,
    handleNewSession,
    handleDeleteSession,
    setActiveSessionId,
    handleRenameSession
  } = useChat();

  // 切换会话
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  // 显示研究计划详情
  const handleShowPlanDetails = (researchPlan: ResearchPlanResponse) => {
    setSelectedPlan(researchPlan);
    setShowPlanModal(true);
  };

  // 关闭研究计划详情弹窗
  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <div className="h-full w-[320px] border-r flex flex-col bg-background">
        {/* <div className="flex border-b">
          <button
            className={`flex-1 py-2 flex items-center justify-center gap-1 ${tab === "file" ? "border-b-2 border-primary font-bold" : ""}`}
            onClick={() => setTab("file")}
          >
            <Folder size={18} className={tab === "file" ? "text-primary" : "text-muted-foreground"} />
            文件
          </button>
          <button
            className={`flex-1 py-2 flex items-center justify-center gap-1 ${tab === "chat" ? "border-b-2 border-primary font-bold" : ""}`}
            onClick={() => setTab("chat")}
          >
            <Lightbulb size={18} className={tab === "chat" ? "text-primary" : "text-muted-foreground"} />
            想法
          </button>
        </div> */}
        <div className="flex-1 overflow-auto">
          {/* {tab === "file" ? (
            <AppSidebar />
          ) : (
            <ChatHistorySidebar 
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewSession={handleNewSession}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onShowPlanDetails={handleShowPlanDetails}
              onRenameSession={handleRenameSession}
            />
          )} */}
            <ChatHistorySidebar 
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewSession={handleNewSession}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onShowPlanDetails={handleShowPlanDetails}
              onRenameSession={handleRenameSession}
            />
        </div>
      </div>

      {/* 研究计划详情弹窗 */}
      <ResearchPlanModal
        isOpen={showPlanModal}
        onClose={handleClosePlanModal}
        researchPlan={selectedPlan}
      />
    </>
  );
}