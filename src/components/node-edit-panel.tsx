import React, { useState, useEffect } from "react";
import { Check, X, MessageCircle, Edit3, Sparkles, AlertCircle, CheckCircle, Eye, Edit, RotateCcw, Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from "@/app/chat-context";

interface QuestionData {
  question_id: number;
  text: string;
  attempts: number;
  is_clear?: boolean;
  is_off_topic?: boolean;
}

// 节点状态枚举
type NodeStatus = 'selected' | 'editing' | 'completed';

// 扩展问答历史类型，包含评价信息和问题ID
interface QAHistoryItem {
  question_id: number;
  question: string;
  answer: string;
  attempts: number;
  evaluation?: {
    is_clear: boolean;
    is_off_topic: boolean;
  };
}

export function NodeEditPanel({
  open,
  title,
  childrenNodes,
  onClose,
  onSave,
  selectedChildId,
  onSelectChild,
  childTitle,
  childDesc,
  setChildTitle,
  setChildDesc,
}: {
  open: boolean;
  title: string;
  childrenNodes?: Array<{ id: string; title: string; description?: string }>;
  onClose: () => void;
  onSave: (childId: string, childTitle: string, childDesc: string) => void;
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  childTitle: string;
  childDesc: string;
  setChildTitle: (title: string) => void;
  setChildDesc: (desc: string) => void;
}) {
  const { activeSessionId } = useChat();
  const selectedChild = childrenNodes?.find(child => child.id === selectedChildId);
  
  // 问答流程状态
  const [isQAMode, setIsQAMode] = useState(false);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<QAHistoryItem>>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  
  // 新增：预览模式状态
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // 新增错误处理状态
  const [qaError, setQaError] = useState<string | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [maxRetries] = useState(3);

  // 为每个会话独立保存节点状态 - 使用会话ID作为key
  const [sessionNodeStatuses, setSessionNodeStatuses] = useState<Record<string, Record<string, NodeStatus>>>({});
  const [sessionUserEditedNodes, setSessionUserEditedNodes] = useState<Record<string, Set<string>>>({});
  const [sessionOriginalDescriptions, setSessionOriginalDescriptions] = useState<Record<string, Record<string, string>>>({});
  const [sessionOriginalTitles, setSessionOriginalTitles] = useState<Record<string, Record<string, string>>>({});

  // 获取当前会话的状态
  const currentSessionId = activeSessionId || 'default';
  const nodeStatuses = sessionNodeStatuses[currentSessionId] || {};
  const userEditedNodes = sessionUserEditedNodes[currentSessionId] || new Set();
  const originalDescriptions = sessionOriginalDescriptions[currentSessionId] || {};
  const originalTitles = sessionOriginalTitles[currentSessionId] || {};

  // 更新当前会话的节点状态
  const setNodeStatuses = (updater: (prev: Record<string, NodeStatus>) => Record<string, NodeStatus>) => {
    setSessionNodeStatuses(prev => ({
      ...prev,
      [currentSessionId]: updater(prev[currentSessionId] || {})
    }));
  };

  // 更新当前会话的用户编辑节点集合
  const setUserEditedNodes = (updater: (prev: Set<string>) => Set<string>) => {
    setSessionUserEditedNodes(prev => ({
      ...prev,
      [currentSessionId]: updater(prev[currentSessionId] || new Set())
    }));
  };

  // 更新当前会话的原始描述
  const setOriginalDescriptions = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setSessionOriginalDescriptions(prev => ({
      ...prev,
      [currentSessionId]: updater(prev[currentSessionId] || {})
    }));
  };

  // 更新当前会话的原始标题
  const setOriginalTitles = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setSessionOriginalTitles(prev => ({
      ...prev,
      [currentSessionId]: updater(prev[currentSessionId] || {})
    }));
  };

  // 清理WebSocket连接
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  // 监听面板开关状态，当面板关闭时清理所有状态
  useEffect(() => {
    if (!open) {
      // 面板关闭时清理所有编辑状态
      setIsQAMode(false);
      setIsPreviewMode(false);
      setCurrentQuestion(null);
      setUserAnswer('');
      setQaHistory([]);
      setIsConnecting(false);
      setIsWaitingResponse(false);
      setQaError(null); // 清理错误状态
      setConnectionRetries(0);
      
      // 关闭WebSocket连接
      if (websocket) {
        websocket.close();
        setWebsocket(null);
      }
    }
  }, [open, websocket]);

  // 初始化节点状态 - 修复初始化逻辑
  useEffect(() => {
    if (childrenNodes && currentSessionId) {
      const currentStatuses = sessionNodeStatuses[currentSessionId] || {};
      const currentUserEditedNodes = sessionUserEditedNodes[currentSessionId] || new Set();
      const currentOriginalDescriptions = sessionOriginalDescriptions[currentSessionId] || {};
      const currentOriginalTitles = sessionOriginalTitles[currentSessionId] || {};
      
      const statuses: Record<string, NodeStatus> = { ...currentStatuses };
      const descriptions: Record<string, string> = { ...currentOriginalDescriptions };
      const titles: Record<string, string> = { ...currentOriginalTitles };
      
      childrenNodes.forEach(child => {
        // 只为新节点设置初始状态
        if (!statuses[child.id]) {
          // 保存原始描述和标题
          descriptions[child.id] = child.description || '';
          titles[child.id] = child.title || '';
          
          // 初始状态逻辑
          if (currentUserEditedNodes.has(child.id)) {
            statuses[child.id] = 'completed';
          } else if (child.id === selectedChildId) {
            statuses[child.id] = 'selected';
          } else {
            statuses[child.id] = 'selected';
          }
        }
      });
      
      // 更新状态
      setSessionOriginalDescriptions(prev => ({
        ...prev,
        [currentSessionId]: descriptions
      }));
      setSessionOriginalTitles(prev => ({
        ...prev,
        [currentSessionId]: titles
      }));
      setSessionNodeStatuses(prev => ({
        ...prev,
        [currentSessionId]: statuses
      }));
    }
  }, [childrenNodes, selectedChildId, currentSessionId]);

  // 监听编辑状态变化 - 修复状态更新逻辑
  useEffect(() => {
    if (selectedChildId && currentSessionId) {
      const originalDesc = originalDescriptions[selectedChildId] || '';
      const originalTitle = originalTitles[selectedChildId] || '';
      const currentDesc = childDesc;
      const currentTitle = childTitle;
      const hasBeenEdited = userEditedNodes.has(selectedChildId);
      
      // 状态更新逻辑：
      if (isQAMode) {
        // AI 问答模式中，显示为编辑中
        setNodeStatuses(prev => ({
          ...prev,
          [selectedChildId]: 'editing'
        }));
      } else if ((currentDesc !== originalDesc && currentDesc.trim()) || 
                 (currentTitle !== originalTitle && currentTitle.trim())) {
        // 内容或标题有修改且非空，显示为编辑中
        setNodeStatuses(prev => ({
          ...prev,
          [selectedChildId]: 'editing'
        }));
      } else if (hasBeenEdited) {
        // 用户之前编辑过且当前内容没有新的修改，显示为已完善
        setNodeStatuses(prev => ({
          ...prev,
          [selectedChildId]: 'completed'
        }));
      } else {
        // 其他情况显示为选中状态
        setNodeStatuses(prev => ({
          ...prev,
          [selectedChildId]: 'selected'
        }));
      }
    }
  }, [selectedChildId, childDesc, childTitle, isQAMode, currentSessionId]);

  // 获取节点状态显示信息 - 修复显示逻辑
  const getNodeStatusInfo = (nodeId: string, isSelected: boolean) => {
    const status = nodeStatuses[nodeId];
    const hasBeenEdited = userEditedNodes.has(nodeId);
    
    // AI 问答模式中的选中节点
    if (isSelected && isQAMode) {
      return {
        text: '完善中',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        dotColor: 'bg-blue-500',
        borderColor: 'border-blue-400',
        icon: <Sparkles className="w-3 h-3" />
      };
    }
    
    // 根据状态和是否选中来决定显示
    if (status === 'editing') {
      return {
        text: '编辑中',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        dotColor: 'bg-orange-500',
        borderColor: 'border-orange-400',
        icon: <Edit3 className="w-3 h-3" />
      };
    } else if (status === 'completed' || hasBeenEdited) {
      return {
        text: '已完善',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        dotColor: 'bg-green-500',
        borderColor: 'border-green-400',
        icon: <Check className="w-3 h-3" />
      };
    } else if (isSelected) {
      return {
        text: '已选中',
        color: 'text-primary',
        bgColor: 'bg-primary/5 border-primary/20',
        dotColor: 'bg-primary',
        borderColor: 'border-primary',
        icon: null
      };
    } else {
      return {
        text: '待完善',
        color: 'text-slate-500',
        bgColor: 'bg-slate-50 border-slate-200',
        dotColor: 'bg-slate-400',
        borderColor: 'border-slate-300',
        icon: null
      };
    }
  };

  // 启动问答流程
  const startQAProcess = () => {
    if (!selectedChildId) return;
    
    setIsQAMode(true);
    setIsConnecting(true);
    setQaError(null);
    setConnectionRetries(0);
    
    connectWebSocket();
  };

  // WebSocket 连接函数
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('ws://116.62.16.12:8000/agent/ws/guided_qa');
      
      ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        setIsConnecting(false);
        setQaError(null);
        setConnectionRetries(0);
        
        // 发送初始数据
        ws.send(JSON.stringify({
          title: childTitle,
          description: childDesc
        }));
        
        setIsWaitingResponse(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'question') {
            setCurrentQuestion(data.payload);
            setIsWaitingResponse(false);
            setQaError(null);
          } else if (data.type === 'evaluation') {
            // 处理评价结果
            setQaHistory(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  evaluation: data.payload
                };
              }
              return updated;
            });
          } else if (data.type === 'result') {
            // 完成问答流程
            setChildTitle(data.payload.title);
            setChildDesc(data.payload.description);
            setIsQAMode(false);
            setCurrentQuestion(null);
            setIsWaitingResponse(false);
            
            // 标记为已编辑 - 只有当selectedChildId不为null时才添加
            if (selectedChildId) {
              setUserEditedNodes(prev => new Set([...prev, selectedChildId]));
            }
          } else if (data.type === 'error') {
            setQaError(data.message || '处理过程中发生错误');
            setIsWaitingResponse(false);
            setCurrentQuestion(null);
          }
        } catch (error) {
          console.error('解析消息失败:', error);
          setQaError('消息格式错误');
          setIsWaitingResponse(false);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭', event.code, event.reason);
        
        // 如果不是正常关闭且在连接状态，尝试重连
        if (event.code !== 1000 && (isConnecting || isWaitingResponse || currentQuestion)) {
          if (connectionRetries < maxRetries) {
            setConnectionRetries(prev => prev + 1);
            setQaError(`连接中断，正在重试 (${connectionRetries + 1}/${maxRetries})`);
            setTimeout(() => connectWebSocket(), 2000);
          } else {
            setQaError('连接失败，请检查网络后重试');
            setIsConnecting(false);
            setIsWaitingResponse(false);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setQaError('连接错误，请重试');
        setIsConnecting(false);
        setIsWaitingResponse(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      setQaError('无法建立连接，请重试');
      setIsConnecting(false);
    }
  };

  // 重试连接
  const retryConnection = () => {
    setQaError(null);
    setConnectionRetries(0);
    setIsConnecting(true);
    connectWebSocket();
  };

  // 退出问答模式
  const exitQAMode = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
    setIsQAMode(false);
    setCurrentQuestion(null);
    setUserAnswer('');
    setQaHistory([]);
    setIsConnecting(false);
    setIsWaitingResponse(false);
    setQaError(null);
    setConnectionRetries(0);
  };

  // 重新发送当前回答
  const resendAnswer = () => {
    if (!currentQuestion || !userAnswer.trim() || !websocket) return;
    
    setQaError(null);
    setIsWaitingResponse(true);
    
    try {
      websocket.send(JSON.stringify({
        question_id: currentQuestion.question_id,
        answer: userAnswer.trim()
      }));
    } catch (error) {
      setQaError('发送失败，请重试');
      setIsWaitingResponse(false);
    }
  };

  // 手动保存时更新状态 - 修复保存逻辑
  const handleManualSave = () => {
    if (!selectedChild || !currentSessionId) return;
    
    onSave(selectedChild.id, childTitle, childDesc);
    
    // 判断内容是否有实质性修改
    const originalDesc = originalDescriptions[selectedChild.id] || '';
    const originalTitle = originalTitles[selectedChild.id] || '';
    const hasContentChange = (childDesc.trim() && childDesc !== originalDesc) || 
                            (childTitle.trim() && childTitle !== originalTitle);
    
    if (hasContentChange) {
      // 有实质性修改，标记为用户编辑过
      setUserEditedNodes(prev => new Set([...prev, selectedChild.id]));
      
      // 更新原始描述和标题
      setOriginalDescriptions(prev => ({
        ...prev,
        [selectedChild.id]: childDesc
      }));
      setOriginalTitles(prev => ({
        ...prev,
        [selectedChild.id]: childTitle
      }));
      
      // 设置为已完善状态
      setNodeStatuses(prev => ({
        ...prev,
        [selectedChild.id]: 'completed'
      }));
    } else {
      // 没有实质性修改，保持当前状态
      const hasBeenEdited = userEditedNodes.has(selectedChild.id);
      setNodeStatuses(prev => ({
        ...prev,
        [selectedChild.id]: hasBeenEdited ? 'completed' : 'selected'
      }));
    }
  };

  // 提交回答
  const submitAnswer = () => {
    if (!userAnswer.trim() || !websocket || !currentQuestion) return;

    // 发送回答
    websocket.send(JSON.stringify({
      question_id: currentQuestion.question_id,
      answer: userAnswer.trim()
    }));

    // 添加到历史记录（保存完整的问题信息）
    setQaHistory(prev => [
      ...prev,
      {
        question_id: currentQuestion.question_id,
        question: currentQuestion.text,
        answer: userAnswer.trim(),
        attempts: currentQuestion.attempts
      }
    ]);

    // 清空当前回答
    setUserAnswer('');
    setCurrentQuestion(null);
    setIsWaitingResponse(true);
  };

  // 渲染评价标签
  const renderEvaluationBadges = (evaluation?: { is_clear: boolean; is_off_topic: boolean }) => {
    if (!evaluation) return null;

    return (
      <div className="flex gap-2 mt-2">
        {/* 清晰度评价 - 只在有明确评价时显示 */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          evaluation.is_clear 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-orange-100 text-orange-700 border border-orange-200'
        }`}>
          {evaluation.is_clear ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          <span>{evaluation.is_clear ? '回答清晰' : '回答不够清晰'}</span>
        </div>

        {/* 离题评价 - 只在有明确评价时显示 */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          !evaluation.is_off_topic 
            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {!evaluation.is_off_topic ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          <span>{!evaluation.is_off_topic ? '切题回答' : '回答离题'}</span>
        </div>
      </div>
    );
  };

  // 渲染 Markdown 内容
  const renderMarkdownContent = (content: string) => {
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // 自定义样式，适配编辑面板
          h1: ({children}) => <h1 className="text-lg font-bold text-foreground mb-3 mt-4 first:mt-0">{children}</h1>,
          h2: ({children}) => <h2 className="text-base font-semibold text-foreground mb-2 mt-3">{children}</h2>,
          h3: ({children}) => <h3 className="text-sm font-medium text-foreground mb-2 mt-3">{children}</h3>,
          h4: ({children}) => <h4 className="text-sm font-medium text-foreground mb-1 mt-2">{children}</h4>,
          p: ({children}) => <p className="text-foreground mb-2 leading-relaxed text-sm">{children}</p>,
          ul: ({children}) => <ul className="list-disc list-inside mb-2 text-foreground space-y-1 pl-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside mb-2 text-foreground space-y-1 pl-2">{children}</ol>,
          li: ({children}) => <li className="text-foreground leading-relaxed text-sm">{children}</li>,
          strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({children}) => <em className="italic text-foreground">{children}</em>,
          code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
          pre: ({children}) => <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs font-mono text-foreground mb-2 border">{children}</pre>,
          blockquote: ({children}) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground mb-2 text-sm">{children}</blockquote>,
          table: ({children}) => <table className="w-full border-collapse border border-border mb-2 text-sm">{children}</table>,
          th: ({children}) => <th className="border border-border px-2 py-1 bg-muted font-semibold text-left text-xs">{children}</th>,
          td: ({children}) => <td className="border border-border px-2 py-1 text-xs">{children}</td>,
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // 处理键盘事件
  const handleAnswerKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  };

  if (!open) return null;
  
  return (
    <div className="absolute left-0 right-0 bottom-0 z-50 bg-background border-t border-border shadow-lg flex flex-col min-w-[320px] max-w-full h-[60vh]">
      {/* 固定头部 */}
      <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
        <span className="font-bold text-lg text-foreground truncate pr-4 flex-1 min-w-0">
          {title}
        </span>
        <button 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 flex-shrink-0"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
      
      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!isQAMode ? (
          // 正常编辑模式
          <div className="flex-1 overflow-y-auto p-4">
            {/* 子节点 Card 展示 - 改进UI */}
            {childrenNodes && childrenNodes.length > 0 && (
              <div className="mb-2">
                <label className="block text-sm mb-1 font-semibold text-foreground">子节点</label>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {childrenNodes.map(child => {
                    const isSelected = selectedChildId === child.id;
                    const statusInfo = getNodeStatusInfo(child.id, isSelected);
                    
                    return (
                      <div
                        key={child.id}
                        className={`rounded-lg p-3 min-w-[140px] max-w-[180px] cursor-pointer transition-all duration-300 flex-shrink-0 relative border-2 ${
                          isSelected
                            ? `${statusInfo.borderColor} bg-primary/5` 
                            : `${statusInfo.borderColor} bg-card hover:border-primary/30 hover:bg-accent/30`
                        }`}
                        onClick={() => onSelectChild(child.id)}
                      >
                        {/* 卡片内容区域 - 固定高度布局 */}
                        <div className="flex flex-col h-full min-h-[80px]">
                          {/* 标题区域 - 占据主要空间 */}
                          <div className={`font-semibold text-sm break-words text-center flex-1 flex items-center justify-center mb-3 ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            <span className="leading-tight">{child.title}</span>
                          </div>
                          
                          {/* 状态区域 - 固定在底部 */}
                          <div className="flex-shrink-0">
                            <div className={`text-xs font-medium text-center px-2 py-1.5 rounded-full border transition-colors ${statusInfo.color} ${statusInfo.bgColor}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* 状态点指示器 */}
                                <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></div>
                                
                                {/* 状态图标（如果有） */}
                                {statusInfo.icon && (
                                  <span className="flex-shrink-0">
                                    {statusInfo.icon}
                                  </span>
                                )}
                                
                                {/* 状态文本 */}
                                <span className="flex-shrink-0 leading-none">
                                  {statusInfo.text}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 编辑选中的子节点 */}
                {selectedChild && (
                  <div className="mt-4 p-3 border border-border rounded-md bg-card">
                    <h4 className="font-semibold mb-2 text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      编辑子节点
                    </h4>
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1 text-foreground">标题</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={childTitle}
                        onChange={e => setChildTitle(e.target.value)}
                        placeholder="输入节点标题"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-foreground">描述</label>
                        <div className="flex gap-1">
                          <button
                            className={`inline-flex items-center justify-center rounded text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-6 px-2 gap-1 ${
                              !isPreviewMode 
                                ? 'bg-primary text-primary-foreground' 
                                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => setIsPreviewMode(false)}
                          >
                            <Edit className="w-3 h-3" />
                            编辑
                          </button>
                          <button
                            className={`inline-flex items-center justify-center rounded text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-6 px-2 gap-1 ${
                              isPreviewMode 
                                ? 'bg-primary text-primary-foreground' 
                                : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            }`}
                            onClick={() => setIsPreviewMode(true)}
                            disabled={!childDesc.trim()}
                          >
                            <Eye className="w-3 h-3" />
                            预览
                          </button>
                        </div>
                      </div>
                      
                      {!isPreviewMode ? (
                        <textarea
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          rows={5}
                          value={childDesc}
                          onChange={e => setChildDesc(e.target.value)}
                          placeholder="输入节点描述 (支持 Markdown 格式)"
                        />
                      ) : (
                        <div className="min-h-[120px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                          {childDesc.trim() ? (
                            <div className="prose prose-sm max-w-none">
                              {renderMarkdownContent(childDesc)}
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic">暂无内容</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 gap-2"
                        onClick={startQAProcess}
                        disabled={!childTitle.trim()}
                      >
                        <MessageCircle className="w-4 h-4" />
                        AI 完善
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        onClick={handleManualSave}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // AI 问答模式
          <>
            {/* 固定的问答头部 */}
            <div className="flex items-center gap-2 p-4 bg-primary/5 border-b border-border flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">AI 问答完善节点内容</span>
              <span className="text-sm text-muted-foreground ml-auto">正在优化: {childTitle}</span>
              {/* <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 flex-shrink-0"
                onClick={exitQAMode}
              >
                退出
              </button> */}
            </div>

            {/* 错误提示区域 */}
            {qaError && (
              <div className="p-4 bg-destructive/10 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">{qaError}</span>
                  </div>
                  <div className="flex gap-2">
                    {connectionRetries < maxRetries && (isConnecting || qaError.includes('连接')) && (
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 gap-2"
                        onClick={retryConnection}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        重试连接
                      </button>
                    )}
                    {currentQuestion && userAnswer.trim() && (
                      <button
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 gap-2"
                        onClick={resendAnswer}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        重新发送
                      </button>
                    )}
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3"
                      onClick={exitQAMode}
                    >
                      <X className="w-4 h-4 mr-1" />
                      退出
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* 可滚动的问答历史区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* 连接状态 */}
              {isConnecting && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 animate-spin border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">正在连接 AI 助手...</p>
                  </div>
                </div>
              )}

              {/* 问答历史 */}
              {qaHistory.map((qa, index) => (
                <div key={index} className="space-y-2">
                  <div className="bg-muted p-3 rounded-md">
                    <div className="font-medium text-sm text-muted-foreground mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                          {qa.question_id + 1}
                        </span>
                        AI 提问:
                      </div>
                      {qa.attempts > 0 && (
                        <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                          第 {qa.attempts + 1} 次尝试
                        </span>
                      )}
                    </div>
                    <div className="text-foreground">{qa.question}</div>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-md">
                    <div className="font-medium text-sm text-primary mb-1">您的回答:</div>
                    <div className="text-foreground">{qa.answer}</div>
                    {/* 添加评价标签 */}
                    {renderEvaluationBadges(qa.evaluation)}
                  </div>
                </div>
              ))}
              
              {/* 当前问题 */}
              {currentQuestion && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="font-medium text-sm text-muted-foreground mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                        {currentQuestion.question_id + 1}
                      </span>
                      AI 提问:
                    </div>
                    {currentQuestion.attempts > 0 && (
                      <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                        第 {currentQuestion.attempts + 1} 次尝试
                      </span>
                    )}
                  </div>
                  <div className="text-foreground">{currentQuestion.text}</div>
                </div>
              )}
              
              {/* 等待状态 */}
              {isWaitingResponse && !currentQuestion && (
                <div className="text-center py-4">
                  <div className="w-6 h-6 animate-spin border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <div className="text-muted-foreground">AI 正在思考中...</div>
                </div>
              )}
            </div>
            
            {/* 固定的回答输入区 */}
            {currentQuestion && (
              <div className="border-t border-border p-4 flex-shrink-0">
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    onKeyDown={handleAnswerKeyPress}
                    placeholder="输入您的回答..."
                    rows={2}
                    disabled={isWaitingResponse}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim() || isWaitingResponse}
                    >
                      {isWaitingResponse ? (
                        <>
                          <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full mr-2"></div>
                          发送中...
                        </>
                      ) : (
                        '发送'
                      )}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 flex-shrink-0"
                      onClick={exitQAMode}
                      disabled={isWaitingResponse}>
                      退出
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
