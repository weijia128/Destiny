// 出生信息类型
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: 'male' | 'female';
  isLunar: boolean;
  leapMonth?: boolean;
}

/**
 * 命理大类 - Destiny Type
 * 支持的命理系统类型
 */
export type DestinyType =
  | 'ziwei'      // 紫微斗数
  | 'bazi'       // 八字命理
  | 'meihua'     // 梅花易数
  | 'qimen'      // 奇门遁甲
  | 'liuyao'     // 六爻占卜
  | 'shouxiang'; // 手相面相

/**
 * 子分类 - Sub Category
 * 混合模式：通用分类 + 各大类专属分类
 */
export type SubCategory =
  // 通用分类（所有大类共享）
  | 'career'
  | 'wealth'
  | 'relationship'
  | 'health'
  | 'family'
  | 'general'
  // 紫微斗数专属
  | 'ziweigeju'      // 紫微格局
  | 'sixi'           // 四化飞星
  | 'dashun'         // 大运分析
  // 八字专属
  | 'geju'           // 八字格局
  | 'yongshen'       // 用神分析
  | 'shishen'        // 十神分析
  | 'dayun'          // 大运流年
  // 奇门遁甲专属
  | 'jushi'          // 局数分析
  | 'men'            // 八门
  | 'xing'           // 九星
  | 'shen'           // 八神
  // 六爻专属
  | 'gua'            // 卦象分析
  | 'liuyaoyin'      // 六爻印
  | 'shiyin'         // 世应
  // 手相专属
  | 'xian'           // 手线
  | 'qiu'            // 丘位
  | 'zhi'            // 指型
  | 'wen';           // 纹理

/**
 * 类别键 - 用于知识库路由
 * 格式: {destinyType}-{subCategory}
 * 例如: ziwei-career, bazi-geju, qimen-men
 */
export type CategoryKey = `${DestinyType}-${SubCategory}`;

/**
 * 分析类别 (向后兼容别名)
 * @deprecated 使用 SubCategory 替代
 */
export type AnalysisCategory = SubCategory;

// 聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 聊天请求
export interface ChatRequest {
  prompt: string;
  chart: string;
  category: AnalysisCategory;
  history: ChatMessage[];
}

/**
 * 扩展的分析请求（新版接口）
 */
export interface AnalysisRequest {
  destinyType: DestinyType;  // 命理大类
  subCategory: SubCategory;  // 子分类
  birthInfo: BirthInfo;
  chartData: string;         // 命盘数据
  userMessage: string;       // 用户消息
  history: ChatMessage[];
}

// 知识库条目（扩展版）
export interface KnowledgeEntry {
  id: string;
  destinyType: DestinyType;     // 命理大类
  subCategory: SubCategory;     // 子分类
  title: string;
  content: string;

  // 紫微斗数专用字段
  stars?: string[];              // 星曜
  palaces?: string[];            // 宫位

  // 八字专用字段
  pillars?: string[];            // 四柱（年月日时）
  shishen?: string[];            // 十神

  // 奇门专用字段
  men?: string[];                // 八门
  xing?: string[];               // 九星
  shen?: string[];               // 八神

  // 六爻专用字段
  guayao?: string[];             // 卦爻

  // 手相专用字段
  palmFeatures?: string[];       // 手相特征

  // 通用字段
  wuxing?: string[];             // 五行
  keywords: string[];            // 搜索关键词
  relevanceScore?: number;       // 相关性评分
}

/** @deprecated 使用 KnowledgeEntry 替代 */
export interface LegacyKnowledgeEntry {
  id: string;
  category: AnalysisCategory;
  title: string;
  content: string;
  stars?: string[];
  palaces?: string[];
  keywords: string[];
}

// LangGraph 状态
export interface AgentState {
  messages: ChatMessage[];
  chart?: string;
  category?: AnalysisCategory;
  retrievedContext?: string;
  currentStep: AgentStep;
  error?: string;
}

export type AgentStep = 
  | 'init'
  | 'retrieve'
  | 'analyze'
  | 'respond'
  | 'error'
  | 'done';

// AI Provider 类型
export type AIProvider = 'anthropic' | 'minimax' | 'deepseek';

// AI Provider 配置
export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
}

// MiniMax API 请求选项
export interface MiniMaxMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MiniMaxChatRequest {
  model: string;
  messages: MiniMaxMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

// 星曜类型
export interface Star {
  name: string;
  brightness?: '庙' | '旺' | '得' | '利' | '平' | '不' | '陷';
  type: 'major' | 'minor' | 'other';
  nature?: 'good' | 'bad' | 'neutral';
}

// 四化类型
export interface Transformation {
  star: string;
  type: '化禄' | '化权' | '化科' | '化忌';
}

// 宫位类型
export interface Palace {
  name: string;
  branch: string;
  stem: string;
  isBodyPalace?: boolean;
  isOriginalPalace?: boolean;
  majorStars: Star[];
  minorStars: Star[];
  otherStars: Star[];
  transformations: Transformation[];
  changsheng12?: string;
  boshi12?: string;
  jiangqian12?: string;
  suiqian12?: string;
  majorPeriod?: {
    startAge: number;
    endAge: number;
    stem: string;
    branch: string;
  };
  minorPeriods?: number[];
}

// 紫微命盘类型
export interface ZiweiChart {
  birthInfo: BirthInfo;
  bazi?: {
    year: string;
    month: string;
    day: string;
    hour: string;
    solarDate?: string;
    lunarDate?: string;
  };
  zodiacSign?: string;
  zodiacAnimal?: string;
  bodyPalaceBranch?: string;
  originalPalace?: string;
  palaces: Palace[];
  soulStar: string;
  bodyStar: string;
  fiveElementType: string;
  rawData?: Record<string, unknown>;
}

// API 响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
