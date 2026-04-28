import React from 'react'
import { FileCheck } from 'lucide-react'
import { Analysis } from '../../types'
import ExportButton from '../common/ExportButton'

interface SummaryCardProps {
  analysis: Analysis | null
}

// Mock data for demonstration
const mockSummary = `## 会议总结

### 会议目标
讨论并确定下一季度产品迭代计划和行动方案

### 主要决策
1. **优先级确定**：将加载速度优化作为最高优先级
2. **技术方案**：采用懒加载+缓存策略，预计提升50%加载速度
3. **时间表**：5月30日正式发布新版本

### 行动项
| 任务 | 负责人 | 截止日期 |
|------|--------|----------|
| 技术方案评审 | 李四 | 4月15日 |
| 核心功能开发 | 李四 | 4月30日 |
| 设计验收 | 王五 | 5月15日 |
| 整体进度把控 | 张三 | 持续 |

### 关键风险
- 移动端适配可能需要额外工作量
- 用户测试阶段可能发现新问题

### 下次会议
时间：4月20日 10:00
议程：技术方案评审结果汇报`

export default function SummaryCard({ analysis }: SummaryCardProps) {
  const summary = analysis?.summary || mockSummary

  return (
    <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary dark:text-dark-text">会议总结</h3>
        </div>
        <ExportButton
          content={summary}
          filename="summary"
          className="mr-2"
        />
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <pre className="text-sm text-text-primary dark:text-dark-text whitespace-pre-wrap font-sans">
          {summary}
        </pre>
      </div>
    </div>
  )
}
