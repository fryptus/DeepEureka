import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TraceNode {
  id: number;
  title: string;
  description: string;
  summary: string;
}

export interface TraceData {
  id: number;
  summary: string;
  nodes: TraceNode[];
}

export interface ResearchPlanResponse {
  plan: string;
  traceId: number;
  traceTitle: string;
}

export async function generateResearchPlan(
  traceData: TraceData
): Promise<ResearchPlanResponse> {
  try {
    const response = await fetch("/api/generate-research-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(traceData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to generate research plan:", error);
    throw error;
  }
}

// 虚拟 API 调用函数 - 用于测试
export async function generateResearchPlanTest(
  traceData: TraceData
): Promise<ResearchPlanResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
  
  // 模拟随机失败（10% 概率）
  if (Math.random() < 0.1) {
    throw new Error('网络连接失败，请重试');
  }

  // 根据输入数据生成个性化的研究计划
  const nodeCount = traceData.nodes.length;
  const complexity = nodeCount > 3 ? '复杂' : nodeCount > 1 ? '中等' : '简单';
  
  const researchPlan = `
# ${traceData.summary} - 研究计划

## 项目概述
本研究项目聚焦于"${traceData.summary}"，包含 ${nodeCount} 个核心研究模块，复杂度评估为${complexity}级别。

## 详细研究计划

### 第一阶段：前期调研（1-2个月）
- **文献综述**：深入分析相关领域的最新研究成果
- **技术调研**：评估现有技术方案的优缺点
- **需求分析**：明确研究目标和预期成果

### 第二阶段：方案设计（${nodeCount > 2 ? '2-3' : '1-2'}个月）
${traceData.nodes.map(node => `- **${node.title}**：${node.description}`).join('\n')}

### 第三阶段：原型开发（${Math.max(2, nodeCount)}个月）
- 搭建基础框架和开发环境
- 实现核心功能模块
- 进行单元测试和集成测试

### 第四阶段：实验验证（2-3个月）
- 设计实验方案和评估指标
- 执行多轮实验验证
- 收集和分析实验数据

### 第五阶段：优化改进（1个月）
- 根据实验结果优化算法
- 完善系统性能
- 撰写技术文档

## 预期成果
- 完整的技术方案设计文档
- 可运行的原型系统
- 实验数据和性能评估报告
- 学术论文或专利申请

## 风险评估
- **技术风险**：${complexity === '复杂' ? '高' : complexity === '中等' ? '中等' : '低'}
- **时间风险**：合理规划，预留缓冲时间
- **资源风险**：确保充足的人力和设备支持

**总预计周期**：${Math.max(6, nodeCount + 4)}-${Math.max(8, nodeCount + 6)}个月
**建议团队规模**：${Math.max(2, Math.ceil(nodeCount / 2))}-${Math.max(3, nodeCount)}人
`;

  return {
    plan: researchPlan.trim(),
    traceId: traceData.id,
    traceTitle: traceData.summary
  };
}
