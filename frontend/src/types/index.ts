// 出生信息类型
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number; // 时辰 0-23
  gender: 'male' | 'female';
  isLunar: boolean; // 是否为农历
  leapMonth?: boolean; // 是否闰月
}

// 紫微命盘类型
export interface ZiweiChart {
  // 基本信息
  birthInfo: BirthInfo;

  // 八字信息
  bazi?: {
    year: string; // 年柱
    month: string; // 月柱
    day: string; // 日柱
    hour: string; // 时柱
    solarDate?: string; // 阳历日期
    lunarDate?: string; // 阴历日期
  };

  // 星座生肖
  zodiacSign?: string; // 星座
  zodiacAnimal?: string; // 生肖

  // 身宫位置
  bodyPalaceBranch?: string; // 身宫地支

  // 来因宫
  originalPalace?: string; // 来因宫名称

  // 十二宫位
  palaces: Palace[];

  // 命主
  soulStar: string;
  // 身主
  bodyStar: string;

  // 五行局
  fiveElementType: string;

  // 原始数据
  rawData?: Record<string, unknown>;
}

// 手相特征类型
export interface PalmFeature {
  name: string; // 特征名称
  type: 'line' | 'mount' | 'mark' | 'finger'; // 线条、山丘、标记、手指
  description: string; // 特征描述
  meaning: string; // 含义解读
  strength: 'strong' | 'medium' | 'weak'; // 特征强度
  side: 'left' | 'right' | 'both'; // 左手/右手/双手
}

// 手相分析结果
export interface PalmReading {
  id: string;
  birthInfo: BirthInfo;
  features: PalmFeature[];
  overallAnalysis: string; // 总体分析
  careerAnalysis: string; // 事业运势
  wealthAnalysis: string; // 财运分析
  relationshipAnalysis: string; // 感情运势
  healthAnalysis: string; // 健康运势
  personalityAnalysis: string; // 性格特质
  recommendations: string[]; // 建议
  createdAt: Date;
}

// 手相分析类别
export type PalmAnalysisCategory = 'overall' | 'career' | 'wealth' | 'relationship' | 'health' | 'personality' | 'life';

// 手相分析类别配置
export interface PalmAnalysisType {
  id: PalmAnalysisCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}

// 宫位类型
export interface Palace {
  name: string; // 宫位名称
  branch: string; // 地支
  stem: string; // 天干

  // 是否身宫
  isBodyPalace?: boolean;
  // 是否来因宫
  isOriginalPalace?: boolean;

  // 主星
  majorStars: Star[];
  // 辅星
  minorStars: Star[];
  // 杂曜
  otherStars: Star[];

  // 四化
  transformations: Transformation[];

  // 12神
  changsheng12?: string; // 长生12神
  boshi12?: string; // 博士12神
  jiangqian12?: string; // 流年将前12神
  suiqian12?: string; // 流年岁前12神

  // 大限
  majorPeriod?: {
    startAge: number;
    endAge: number;
    stem: string; // 运限天干
    branch: string; // 运限地支
  };

  // 小限
  minorPeriods?: number[]; // 小限年龄数组
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

// 命理大类
export type DestinyType =
  | 'ziwei'      // 紫微斗数
  | 'bazi'       // 八字命理
  | 'qimen'      // 奇门遁甲
  | 'liuyao'     // 六爻占卜
  | 'shouxiang'; // 手相面相

// 子分类（混合模式）
export type SubCategory =
  // 通用分类
  | 'career'
  | 'wealth'
  | 'relationship'
  | 'health'
  | 'family'
  | 'general'
  // 紫微斗数专属
  | 'ziweigeju' | 'sixi' | 'dashun'
  // 八字专属
  | 'geju' | 'yongshen' | 'shishen' | 'dayun'
  // 奇门遁甲专属
  | 'jushi' | 'men' | 'xing' | 'shen'
  // 六爻专属
  | 'gua' | 'liuyaoyin' | 'shiyin'
  // 手相专属
  | 'xian' | 'qiu' | 'zhi' | 'wen';

/**
 * 分析类别 (向后兼容别名)
 * @deprecated 使用 SubCategory 替代
 */
export type AnalysisCategory = SubCategory;

// 聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  category?: AnalysisCategory;
  isStreaming?: boolean;
}

// Agent 状态类型 (LangGraph)
export interface AgentState {
  // 当前状态
  currentNode: AgentNode;
  
  // 命盘数据
  chart?: ZiweiChart;
  
  // 对话历史
  messages: ChatMessage[];
  
  // 当前分析类别
  category?: AnalysisCategory;
  
  // 知识库检索结果
  retrievedContext?: string;
  
  // 错误信息
  error?: string;
}

// Agent 节点类型
export type AgentNode = 
  | 'idle' // 空闲
  | 'collecting_birth_info' // 收集出生信息
  | 'generating_chart' // 生成命盘
  | 'selecting_category' // 选择分析类别
  | 'retrieving_knowledge' // 检索知识库
  | 'analyzing' // 分析中
  | 'responding' // 回复中
  | 'error'; // 错误

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 大类选择（扩展版）
export interface MainCategory {
  id: DestinyType;
  name: string;
  description: string;
  icon: string;
  color: string;
  // 新增：支持的子分类
  subCategories?: Array<{
    id: SubCategory;
    name: string;
    icon: string;
    description: string;
    isExclusive?: boolean;  // 是否为专属分类
  }>;
}

// 时辰选项
export interface HourOption {
  value: number;
  label: string;
  branch: string;
}

// 知识库条目
export interface KnowledgeEntry {
  id: string;
  category: AnalysisCategory;
  title: string;
  content: string;
  stars?: string[];
  palaces?: string[];
  keywords: string[];
}
