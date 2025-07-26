import React, { useState } from "react";
import { X, FileText, Calendar, Download, Copy, RefreshCw, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchPlanResponse } from "../lib/utils";

interface ResearchPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  researchPlan: ResearchPlanResponse | null;
}

export function ResearchPlanModal({ isOpen, onClose, researchPlan }: ResearchPlanModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  if (!isOpen || !researchPlan) return null;

  // 复制内容到剪贴板
  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(researchPlan.plan);
      setCopySuccess(true);
      // 2秒后重置状态
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      // 降级处理：使用传统方法复制
      try {
        const textArea = document.createElement('textarea');
        textArea.value = researchPlan.plan;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackError) {
        console.error('降级复制也失败:', fallbackError);
        alert('复制失败，请手动选择文本复制');
      }
    }
  };

  // 导出为文本文件
  const handleExportPlan = async () => {
    try {
      setExportLoading(true);
      
      // 生成文件名，确保文件名安全
      const safeTitle = researchPlan.traceTitle.replace(/[<>:"/\\|?*]/g, '-');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `研究计划-${safeTitle}-${timestamp}.md`;
      
      // 创建更完整的 Markdown 内容
      const fullContent = `# 研究计划：${researchPlan.traceTitle}

**计划ID**: ${researchPlan.traceId}
**生成时间**: ${new Date().toLocaleString('zh-CN')}

---

${researchPlan.plan}

---

*此文件由 Eureka 研究助手自动生成*
`;

      const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
      
      // 检查浏览器是否支持新的文件系统访问 API
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'Markdown files',
                accept: {
                  'text/markdown': ['.md'],
                },
              },
              {
                description: 'Text files',
                accept: {
                  'text/plain': ['.txt'],
                },
              },
            ],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          alert('文件保存成功！');
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            throw error; // 如果不是用户取消，则抛出错误
          }
        }
      } else {
        // 降级到传统下载方式
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('文件下载成功！');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  // 导出为 JSON 格式（备用功能）
  const handleExportJSON = async () => {
    try {
      const exportData = {
        traceId: researchPlan.traceId,
        traceTitle: researchPlan.traceTitle,
        plan: researchPlan.plan,
        exportTime: new Date().toISOString(),
        version: '1.0'
      };

      const safeTitle = researchPlan.traceTitle.replace(/[<>:"/\\|?*]/g, '-');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `研究计划-${safeTitle}-${timestamp}.json`;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json;charset=utf-8' 
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON导出失败:', error);
      alert('JSON导出失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300">
      <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">研究计划详情</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-background/95">
          <div className="space-y-4">
            {/* 项目标题 */}
            <div className="bg-card/90 backdrop-blur-sm p-4 rounded-lg border shadow-sm">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {researchPlan.traceTitle}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>计划ID: {researchPlan.traceId}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>生成时间: {new Date().toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            {/* 研究计划内容 - 使用 Markdown 渲染 */}
            <div className="bg-card/90 backdrop-blur-sm p-4 rounded-lg border shadow-sm">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // 自定义样式
                    h1: ({children}) => <h1 className="text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0">{children}</h1>,
                    h2: ({children}) => <h2 className="text-xl font-semibold text-foreground mb-3 mt-5">{children}</h2>,
                    h3: ({children}) => <h3 className="text-lg font-medium text-foreground mb-2 mt-4">{children}</h3>,
                    h4: ({children}) => <h4 className="text-base font-medium text-foreground mb-2 mt-3">{children}</h4>,
                    p: ({children}) => <p className="text-foreground mb-3 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside mb-3 text-foreground space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside mb-3 text-foreground space-y-1">{children}</ol>,
                    li: ({children}) => <li className="text-foreground leading-relaxed">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({children}) => <em className="italic text-foreground">{children}</em>,
                    code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>,
                    pre: ({children}) => <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm font-mono text-foreground mb-3">{children}</pre>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-3">{children}</blockquote>,
                    table: ({children}) => <table className="w-full border-collapse border border-border mb-3">{children}</table>,
                    th: ({children}) => <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">{children}</th>,
                    td: ({children}) => <td className="border border-border px-3 py-2">{children}</td>,
                    hr: () => <hr className="border-border my-4" />,
                  }}
                >
                  {researchPlan.plan}
                </ReactMarkdown>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2 pt-4 border-t bg-background/80 backdrop-blur-sm rounded-lg p-3">
              <button 
                onClick={handleExportPlan}
                disabled={exportLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm"
              >
                <Download className={`w-4 h-4 mr-2 ${exportLoading ? 'animate-spin' : ''}`} />
                {exportLoading ? '保存中...' : '保存为 Markdown'}
              </button>
              
              <button 
                onClick={handleCopyContent}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 shadow-sm"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制内容
                  </>
                )}
              </button>
              
              <button 
                onClick={handleExportJSON}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                导出 JSON
              </button>
              
              <button 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 shadow-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新生成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}