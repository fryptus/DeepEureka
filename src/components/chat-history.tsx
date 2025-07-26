import React, { useState } from "react";
import { Trash2, Plus, Edit2, Check, X, FileText } from "lucide-react";
import { ResearchPlanResponse } from "../lib/utils";

interface ChatHistorySidebarProps {
  sessions: any[];
  activeSessionId: string;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onShowPlanDetails: (researchPlan: ResearchPlanResponse) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export function ChatHistorySidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onShowPlanDetails,
  onRenameSession,
}: ChatHistorySidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const handleStartEdit = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editingTitle.trim()) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // 处理双击显示详情
  const handlePlanDoubleClick = (researchPlan: ResearchPlanResponse) => {
    onShowPlanDetails(researchPlan);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex flex-col h-full p-2 bg-background">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-foreground">我的Ideas</span>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2 gap-1"
          onClick={onNewSession}
        >
          <Plus className="w-3 h-3" />
          创建新的Ideas
        </button>
      </div>

      {/* 显示已生成的研究计划（如果有的话） */}
      {activeSession?.researchPlan && (
        <div className="mb-3 p-2 border rounded-md bg-card">
          <div 
            className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
            onDoubleClick={() => handlePlanDoubleClick(activeSession.researchPlan!)}
            title="双击查看详情"
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">
              研究计划 - {activeSession.researchPlan.traceTitle}
            </div>
            <div className="text-sm text-foreground max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-xs">
                {activeSession.researchPlan.plan.substring(0, 200)}
                {activeSession.researchPlan.plan.length > 200 && '...'}
              </pre>
            </div>
            <div className="text-xs text-muted-foreground mt-1 italic">
              💡 双击查看完整计划
            </div>
          </div>
        </div>
      )}

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {sessions.length === 0 ? (
            <li className="text-muted-foreground px-2 py-1 text-sm">暂无Ideas</li>
          ) : (
            sessions.map((s) => (
              <li
                key={s.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  s.id === activeSessionId
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {editingSessionId === s.id ? (
                  // 编辑模式
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      autoFocus
                      onBlur={handleSaveEdit}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-green-600 hover:text-green-700 h-6 w-6 flex-shrink-0"
                      onClick={handleSaveEdit}
                      title="保存"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground h-6 w-6 flex-shrink-0"
                      onClick={handleCancelEdit}
                      title="取消"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  // 正常显示模式
                  <>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span
                        className="truncate text-sm cursor-pointer"
                        onClick={() => onSelectSession(s.id)}
                        title={s.title}
                      >
                        {s.title}
                      </span>
                      {/* 显示是否有研究计划的标识 - 添加双击事件 */}
                      {s.researchPlan && (
                        <div 
                          className="flex items-center gap-1 mt-1 cursor-pointer hover:text-primary"
                          onDoubleClick={() => handlePlanDoubleClick(s.researchPlan!)}
                          title="双击查看研究计划详情"
                        >
                          <FileText className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">已生成研究计划</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6"
                        title="重命名"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(s.id, s.title);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-6 w-6 ${
                          s.id === activeSessionId
                            ? "text-red-200 hover:bg-red-600 hover:text-white"
                            : "text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        }`}
                        title="删除"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}