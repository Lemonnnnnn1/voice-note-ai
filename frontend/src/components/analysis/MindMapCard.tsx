import React, { useRef, useEffect, useState } from 'react'
import { Network } from 'lucide-react'
import { Analysis } from '../../types'
import ExportButton from '../common/ExportButton'

interface MindMapCardProps {
  analysis: Analysis | null
}

interface MindMapNode {
  id?: string
  text: string
  children?: MindMapNode[]
}

// Mock data for demonstration
const mockMindMapData: MindMapNode = {
  text: '会议主题',
  children: [
    {
      text: '开场介绍',
      children: [
        { text: '参会人员介绍' },
        { text: '会议目标明确' }
      ]
    },
    {
      text: '产品规划',
      children: [
        { text: '用户体验优化' },
        { text: '加载速度提升' },
        { text: '移动端适配' }
      ]
    },
    {
      text: '技术方案',
      children: [
        { text: '懒加载策略' },
        { text: '缓存优化' },
        { text: '响应式布局' }
      ]
    },
    {
      text: '行动计划',
      children: [
        { text: '4/15 技术评审' },
        { text: '4/30 开发完成' },
        { text: '5/30 正式发布' }
      ]
    }
  ]
}

// Node dimensions
const NODE_MIN_WIDTH = 100
const NODE_HEIGHT = 36
const LEVEL_GAP_X = 80   // Horizontal gap between levels
const SIBLING_GAP_Y = 12  // Vertical gap between siblings

// Measure text width roughly
function measureText(text: string): number {
  return Math.max(NODE_MIN_WIDTH, text.length * 16 + 24)
}

// Layout node for rendering
interface LayoutNode {
  node: MindMapNode
  x: number
  y: number
  width: number
  height: number
  children: LayoutNode[]
}

// Calculate subtree size (width and height needed)
function calculateSubtreeSize(node: MindMapNode): { width: number; height: number } {
  const nodeWidth = measureText(node.text)
  const nodeHeight = NODE_HEIGHT

  if (!node.children || node.children.length === 0) {
    return { width: nodeWidth, height: nodeHeight }
  }

  // Calculate children sizes
  let childrenTotalHeight = 0
  let maxChildWidth = 0

  for (const child of node.children) {
    const childSize = calculateSubtreeSize(child)
    maxChildWidth = Math.max(maxChildWidth, childSize.width)
    childrenTotalHeight += childSize.height
    if (node.children.indexOf(child) < node.children.length - 1) {
      childrenTotalHeight += SIBLING_GAP_Y
    }
  }

  // Add space for connecting line
  const branchSpace = LEVEL_GAP_X

  return {
    width: nodeWidth + branchSpace + maxChildWidth,
    height: Math.max(nodeHeight, childrenTotalHeight)
  }
}

// Assign positions to all nodes in the subtree
function layoutNode(
  node: MindMapNode,
  x: number,
  y: number,
  availableWidth: number,
  availableHeight: number
): LayoutNode {
  const width = measureText(node.text)
  const height = NODE_HEIGHT

  const layoutNode: LayoutNode = {
    node,
    x,
    y: y + (availableHeight - height) / 2, // Center vertically in available space
    width,
    height,
    children: []
  }

  if (!node.children || node.children.length === 0) {
    return layoutNode
  }

  // Calculate sizes for all children
  const childLayouts: LayoutNode[] = []
  let childrenTotalHeight = 0

  for (const child of node.children) {
    const childSize = calculateSubtreeSize(child)
    const childLayout = layoutNode(child, 0, 0, childSize.width, childSize.height)
    childLayouts.push(childLayout)
    childrenTotalHeight += childLayout.height + (childLayouts.length > 1 ? SIBLING_GAP_Y : 0)
  }

  // Position children starting from top
  let currentChildY = y

  for (let i = 0; i < childLayouts.length; i++) {
    const childLayout = childLayouts[i]

    // Recursively layout this child with its subtree
    const childSize = calculateSubtreeSize(childLayout.node)
    const positionedChild = layoutNodeWithParent(
      childLayout.node,
      x + width + LEVEL_GAP_X,
      currentChildY,
      childSize.width,
      childSize.height
    )

    layoutNode.children.push(positionedChild)
    currentChildY += positionedChild.height + SIBLING_GAP_Y
  }

  return layoutNode
}

// Layout node considering parent positioning
function layoutNodeWithParent(
  node: MindMapNode,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): LayoutNode {
  const width = measureText(node.text)
  const height = NODE_HEIGHT

  const layoutNode: LayoutNode = {
    node,
    x,
    y: y + (maxHeight - height) / 2,
    width,
    height,
    children: []
  }

  if (!node.children || node.children.length === 0) {
    return layoutNode
  }

  // Calculate child sizes and total height
  const childLayouts: LayoutNode[] = []
  let childrenTotalHeight = 0

  for (const child of node.children) {
    const childSize = calculateSubtreeSize(child)
    const childLayout = layoutNodeWithParent(child, 0, 0, childSize.width, childSize.height)
    childLayouts.push(childLayout)
    childrenTotalHeight += childLayout.height + (childLayouts.length > 1 ? SIBLING_GAP_Y : 0)
  }

  // Position children
  let currentChildY = y

  for (let i = 0; i < childLayouts.length; i++) {
    const childLayout = childLayouts[i]
    const childSize = calculateSubtreeSize(childLayout.node)
    const positionedChild = layoutNodeWithParent(
      childLayout.node,
      x + width + LEVEL_GAP_X,
      currentChildY,
      childSize.width,
      childSize.height
    )
    layoutNode.children.push(positionedChild)
    currentChildY += positionedChild.height + SIBLING_GAP_Y
  }

  return layoutNode
}

// Level colors
const levelColors = [
  { bg: '#4F46E5', border: '#4338CA' },  // Level 0 - Primary indigo
  { bg: '#10B981', border: '#059669' },   // Level 1 - Emerald
  { bg: '#F59E0B', border: '#D97706' },    // Level 2 - Amber
  { bg: '#EF4444', border: '#DC2626' },   // Level 3 - Red
  { bg: '#8B5CF6', border: '#7C3AED' },   // Level 4 - Purple
  { bg: '#EC4899', border: '#DB2777' },   // Level 5 - Pink
  { bg: '#06B6D4', border: '#0891B2' },   // Level 6 - Cyan
]

// Tree Node Component
function TreeNodeComponent({ layout, level = 0 }: { layout: LayoutNode; level?: number }) {
  const colors = levelColors[level % levelColors.length]

  return (
    <>
      {/* Node */}
      <div
        className="absolute flex items-center justify-center rounded-lg font-medium shadow-md transition-all"
        style={{
          left: layout.x,
          top: layout.y,
          width: layout.width,
          height: layout.height,
          backgroundColor: colors.bg,
          borderWidth: 2,
          borderColor: colors.border,
          fontSize: level === 0 ? '13px' : '11px',
          zIndex: level + 1,
        }}
      >
        <span className="text-center text-white px-2 truncate" title={layout.node.text}>
          {layout.node.text}
        </span>
      </div>

      {/* Children */}
      {layout.children.map((child, index) => (
        <TreeNodeComponent key={index} layout={child} level={level + 1} />
      ))}
    </>
  )
}

// Connection Lines Component
function ConnectionLines({ layout, level = 0 }: { layout: LayoutNode; level?: number }) {
  const colors = levelColors[level % levelColors.length]
  const lines: React.ReactNode[] = []

  for (const child of layout.children) {
    // Parent node right edge
    const x1 = layout.x + layout.width
    const y1 = layout.y + layout.height / 2

    // Child node left edge
    const x2 = child.x
    const y2 = child.y + child.height / 2

    // Control points for smooth curve
    const cpOffset = (x2 - x1) / 2

    lines.push(
      <path
        key={`${layout.x}-${layout.y}-${child.x}-${child.y}`}
        d={`M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`}
        stroke={colors.border}
        strokeWidth={2}
        fill="none"
        markerEnd={`url(#arrow-${level + 1})`}
      />
    )

    // Recursively draw lines for children
    lines.push(
      <ConnectionLines key={`lines-${level}-${child.x}-${child.y}`} layout={child} level={level + 1} />
    )
  }

  return <>{lines}</>
}

export default function MindMapCard({ analysis }: MindMapCardProps) {
  const mindMapData = analysis?.mindMap || mockMindMapData
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 500 })

  // Calculate layout
  const treeSize = calculateSubtreeSize(mindMapData)

  // Root node at position (20, 20)
  const rootLayout = layoutNodeWithParent(
    mindMapData,
    20,
    20,
    treeSize.width,
    treeSize.height
  )

  // Total canvas size
  const canvasWidth = rootLayout.x + treeSize.width + 100
  const canvasHeight = rootLayout.y + treeSize.height + 100

  // Observe container size
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          })
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [])

  // Convert mind map to markdown for export
  const convertToMarkdown = (node: any, level: number = 0): string => {
    const prefix = '#'.repeat(Math.min(level + 1, 6))
    let md = `${prefix} ${node.text}\n`
    if (node.children) {
      for (const child of node.children) {
        md += convertToMarkdown(child, level + 1)
      }
    }
    return md
  }

  const content = convertToMarkdown(mindMapData)

  return (
    <div className="bg-surface-card dark:bg-dark-card rounded-xl border border-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary dark:text-dark-text">思维导图</h3>
        </div>
        <ExportButton
          content={content}
          filename="mindmap"
          className="mr-2"
        />
      </div>

      {/* Content - Scrollable container */}
      <div
        ref={containerRef}
        className="p-4 overflow-auto"
        style={{ height: '500px' }}
      >
        <div
          className="relative"
          style={{
            width: Math.max(canvasWidth, size.width),
            height: Math.max(canvasHeight, size.height),
          }}
        >
          {/* SVG for connection lines */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            {/* Arrow markers for each level */}
            {levelColors.map((color, index) => (
              <defs key={index}>
                <marker
                  id={`arrow-${index}`}
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill={color.border} />
                </marker>
              </defs>
            ))}
            {/* Connection lines */}
            <ConnectionLines layout={rootLayout} level={0} />
          </svg>

          {/* Tree nodes */}
          <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1 }}>
            <TreeNodeComponent layout={rootLayout} level={0} />
          </div>
        </div>
      </div>
    </div>
  )
}