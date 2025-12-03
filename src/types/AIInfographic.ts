import type { Slide } from './slides'

// 信息图类型
export type InfographicType = 'list' | 'comparison' | 'mindmap' | 'timeline'

// 模板结构
export interface TemplateStructure {
  type: InfographicType
  hasTitle: boolean
  hasSubtitle: boolean
  hasBody: boolean           // 支持长段介绍
  itemCount: number
  hasItemTitle: boolean
  hasItemNote?: boolean      // 是否存在列表项备注（textType: itemNote）
  hasItemNumber: boolean
  template: Slide
}

// AI返回的数据结构
export interface AIInfographicData {
  title?: string
  subtitle?: string
  body?: string              // 长段介绍文字
  notes?: string             // 模板自定义生成规则（仅用于提示词，不会被填充到元素）
  items: InfographicItem[]
}

// 列表项（根据类型不同结构不同）
export type InfographicItem =
  | string                                      // 纯文本（仅正文，无标题/备注）
  | { title: string; text: string; note?: string } // 列表项：标题 + 描述 + 可选备注
  | { year: string; event: string }             // 时间轴
  | { left: string; right: string }             // 对比项
