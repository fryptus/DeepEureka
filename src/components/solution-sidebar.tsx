'use client';

import React, { useState } from 'react';
import { Send, RotateCcw, ChevronDown, ChevronRight, Edit2, FileText, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { useChat } from '@/app/chat-context';
import { TraceData, generateResearchPlanTest, ResearchPlanResponse } from '@/lib/utils';
import { ResearchPlanModal } from './research-plan-modal';

type TraceNode = {
  id: number;
  title: string;
  description: string;
};

type Trace = {
  id: number;
  summary: string;
  nodes: TraceNode[];
};

export function SolutionSidebar() {
  const { 
    sessions, 
    activeSessionId, 
    handleUpdateTraces, 
    handleUpdateIdea,
    setEditingTrace,
    handleUpdateResearchPlan
  } = useChat();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const [input, setInput] = useState(activeSession?.idea || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTraces, setExpandedTraces] = useState<Set<number>>(new Set());
  
  // 新增状态：选中的 trace 和生成研究计划相关状态
  const [selectedTraceId, setSelectedTraceId] = useState<number | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  
  // 弹窗状态
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ResearchPlanResponse | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    handleUpdateIdea(e.target.value);
  };

  const generateTraces = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('http://116.62.16.12:8000/agent/generate-traces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: input })
      });
      const data = await res.json();
      handleUpdateTraces(data.traces);
      // 自动展开所有新生成的方案
      setExpandedTraces(new Set(data.traces.map((trace: Trace) => trace.id)));
    } catch (err) {
      setError('生成失败，请重试');
      handleUpdateTraces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateTraces();
  };

  const toggleExpand = (traceId: number) => {
    const newExpanded = new Set(expandedTraces);
    if (newExpanded.has(traceId)) {
      newExpanded.delete(traceId);
    } else {
      newExpanded.add(traceId);
    }
    setExpandedTraces(newExpanded);
  };

  // 选中/取消选中 trace
  const handleSelectTrace = (traceId: number) => {
    setSelectedTraceId(prev => prev === traceId ? null : traceId);
    setPlanError(null);
  };

  // 打开编辑面板
  const handleOpenEditPanel = (trace: Trace) => {
    const editData = {
      traceId: trace.id,
      summary: trace.summary,
      nodes: trace.nodes.map(node => ({
        id: `summary-${trace.id}-node-${node.id}`,
        title: node.title,
        description: node.description
      }))
    };
    setEditingTrace(editData);
  };

  // 生成研究计划
  const handleGenerateResearchPlan = async () => {
    if (!selectedTraceId) return;
    
    const selectedTrace = traces.find(t => t.id === selectedTraceId);
    if (!selectedTrace) return;

    // 构造 TraceData 格式
    const traceData: TraceData = {
      id: selectedTrace.id,
      summary: selectedTrace.summary,
      nodes: selectedTrace.nodes.map(node => ({
        id: node.id,
        title: node.title,
        description: node.description,
        summary: node.description
      }))
    };

    setGeneratingPlan(true);
    setPlanError(null);

    try {
      const researchPlan = await generateResearchPlanTest(traceData);
      
      // 更新当前会话，添加研究计划
      if (activeSessionId) {
        handleUpdateResearchPlan(activeSessionId, researchPlan);
      }
      
      // 显示弹窗
      setSelectedPlan(researchPlan);
      setShowPlanModal(true);
      
      // 清除选中状态
      setSelectedTraceId(null);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '生成研究计划失败');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // 显示已有研究计划的详情
  const handleShowExistingPlan = () => {
    if (activeSession?.researchPlan) {
      setSelectedPlan(activeSession.researchPlan);
      setShowPlanModal(true);
    }
  };

  // 关闭弹窗
  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setSelectedPlan(null);
  };

  const traces = activeSession?.traces || [];
  const selectedTrace = selectedTraceId ? traces.find(t => t.id === selectedTraceId) : null;

  return (
    <>
      <div className="w-[350px] border-l h-full flex flex-col bg-background">
        {/* 头部：想法输入区 - 固定高度，不滚动 */}
        <div className="p-4 border-b flex-shrink-0">
          <h2 className="font-semibold mb-3">方案生成器</h2>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded flex items-center justify-between">
              {error}
              <Button size="sm" variant="outline" onClick={generateTraces}>
                <RotateCcw className="w-4 h-4 mr-1" />
                重试
              </Button>
            </div>
          )}
          
          {/* 输入表单 */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="请输入你的想法..."
              className="flex-1"
              disabled={loading}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>

        {/* 显示已有研究计划 */}
        {activeSession?.researchPlan && (
          <div className="p-4 bg-primary/5 border-b flex-shrink-0">
            <div className="text-sm text-muted-foreground mb-2">
              已生成研究计划
            </div>
            <Button
              onClick={handleShowExistingPlan}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              查看研究计划详情
            </Button>
          </div>
        )}

        {/* 生成研究计划按钮区域 */}
        {selectedTrace && (
          <div className="p-4 bg-muted/30 border-b flex-shrink-0">
            <div className="text-sm text-muted-foreground mb-2">
              已选择方案：<span className="font-medium text-foreground">{selectedTrace.summary}</span>
            </div>
            
            {planError && (
              <div className="mb-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
                {planError}
              </div>
            )}
            
            <Button
              onClick={handleGenerateResearchPlan}
              disabled={generatingPlan}
              className="w-full"
              size="sm"
            >
              {generatingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成研究计划中...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  生成研究计划
                </>
              )}
            </Button>
          </div>
        )}

        {/* 中间：方案展示区 - 可滚动区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading && (
            <div className="p-4 text-center text-muted-foreground flex-shrink-0">
              <div className="animate-pulse">Agent 正在生成方案...</div>
            </div>
          )}
          
          {!loading && traces.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>暂无生成方案</p>
                <p className="text-sm mt-1">请输入想法并点击生成</p>
              </div>
            </div>
          )}

          {!loading && traces.length > 0 && (
            <>
              {/* 方案数量标题 - 固定不滚动 */}
              <div className="p-4 pb-2 border-b flex-shrink-0">
                <h3 className="font-medium text-sm text-muted-foreground">
                  已生成 {traces.length} 个实现方案
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  点击方案可选择/取消选择，选中后可生成研究计划
                </p>
              </div>
              
              {/* 方案列表 - 可滚动区域 */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {traces.map((trace) => {
                    const isExpanded = expandedTraces.has(trace.id);
                    const isSelected = selectedTraceId === trace.id;
                    
                    return (
                      <div 
                        key={trace.id} 
                        className={`border rounded-lg bg-card hover:shadow-sm transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleSelectTrace(trace.id)}
                      >
                        <div className="p-3">
                          {/* 方案标题行 */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(trace.id);
                              }}
                              className="flex items-center gap-2 text-left flex-1 hover:text-primary transition-colors"
                            >
                              {isExpanded ? 
                                <ChevronDown className="w-4 h-4 flex-shrink-0" /> : 
                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                              }
                              <span className="font-medium text-sm leading-tight">{trace.summary}</span>
                            </button>
                            
                            {/* 选中状态指示器 */}
                            {isSelected && (
                              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditPanel(trace);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* 展开的节点列表 */}
                          {isExpanded && (
                            <div className="mt-3 ml-6 space-y-2">
                              {trace.nodes.map((node, index) => (
                                <div key={node.id} className="p-2 bg-muted/30 rounded text-sm">
                                  <div className="font-medium text-foreground">
                                    {index + 1}. {node.title}
                                  </div>
                                  {node.description && (
                                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {node.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
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