import type { HourOption, AnalysisCategory, PalmAnalysisType } from '@/types';

// 十二时辰
export const HOURS: HourOption[] = [
  { value: 0, label: '子时 (23:00-01:00)', branch: '子' },
  { value: 2, label: '丑时 (01:00-03:00)', branch: '丑' },
  { value: 4, label: '寅时 (03:00-05:00)', branch: '寅' },
  { value: 6, label: '卯时 (05:00-07:00)', branch: '卯' },
  { value: 8, label: '辰时 (07:00-09:00)', branch: '辰' },
  { value: 10, label: '巳时 (09:00-11:00)', branch: '巳' },
  { value: 12, label: '午时 (11:00-13:00)', branch: '午' },
  { value: 14, label: '未时 (13:00-15:00)', branch: '未' },
  { value: 16, label: '申时 (15:00-17:00)', branch: '申' },
  { value: 18, label: '酉时 (17:00-19:00)', branch: '酉' },
  { value: 20, label: '戌时 (19:00-21:00)', branch: '戌' },
  { value: 22, label: '亥时 (21:00-23:00)', branch: '亥' },
];

// 主要分类
export const MAIN_CATEGORIES = [
  {
    id: 'ziwei',
    name: '紫微斗数',
    description: '中国传统命理学精华，揭示人生命运轨迹',
    icon: '⭐',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'meihua',
    name: '梅花易数',
    description: '以时间与数起卦，占测吉凶与行动建议',
    icon: '🌸',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'bazi',
    name: '八字命理',
    description: '四柱八字，天干地支推演人生',
    icon: '🔮',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'liuyao',
    name: '六爻预测',
    description: '周易六爻，占卜吉凶',
    icon: '☯',
    color: 'from-rose-500 to-pink-600',
  },
  {
    id: 'palmistry',
    name: '手相占卜',
    description: '观手识人，解读命运密码',
    icon: '✋',
    color: 'from-emerald-500 to-teal-600',
  },
] as const;

// 分析类别
export const ANALYSIS_CATEGORIES: { id: AnalysisCategory; name: string; icon: string; description: string }[] = [
  {
    id: 'career',
    name: '事业运势',
    icon: '💼',
    description: '事业发展、工作机遇、职场人际',
  },
  {
    id: 'wealth',
    name: '财运分析',
    icon: '💰',
    description: '财富运势、投资理财、收入来源',
  },
  {
    id: 'relationship',
    name: '感情姻缘',
    icon: '💕',
    description: '桃花运势、婚姻配对、感情发展',
  },
  {
    id: 'health',
    name: '健康运势',
    icon: '🏥',
    description: '身体状况、疾病预防、养生建议',
  },
  {
    id: 'family',
    name: '家庭亲缘',
    icon: '👨‍👩‍👧‍👦',
    description: '家庭关系、子女缘分、六亲运势',
  },
  {
    id: 'general',
    name: '综合分析',
    icon: '🌟',
    description: '整体运势、人生格局、综合建议',
  },
];

// 十二宫位
export const PALACE_NAMES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫',
  '财帛宫', '疾厄宫', '迁移宫', '交友宫',
  '官禄宫', '田宅宫', '福德宫', '父母宫',
];

// 地支
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 天干
export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 主星列表
export const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁',
  '七杀', '破军',
];

// 辅星列表
export const MINOR_STARS = [
  '文昌', '文曲', '左辅', '右弼',
  '天魁', '天钺', '禄存', '天马',
];

// 四化
export const TRANSFORMATIONS = ['化禄', '化权', '化科', '化忌'];

// 五行局
export const FIVE_ELEMENT_TYPES = [
  '水二局', '木三局', '金四局', '土五局', '火六局',
];

// 亮度等级
export const BRIGHTNESS_LEVELS = {
  '庙': { level: 6, color: 'text-yellow-400', description: '最旺' },
  '旺': { level: 5, color: 'text-orange-400', description: '次旺' },
  '得': { level: 4, color: 'text-green-400', description: '得地' },
  '利': { level: 3, color: 'text-blue-400', description: '有利' },
  '平': { level: 2, color: 'text-gray-400', description: '平和' },
  '不': { level: 1, color: 'text-gray-500', description: '不利' },
  '陷': { level: 0, color: 'text-red-400', description: '最弱' },
};

// 年份范围
export const YEAR_RANGE = {
  min: 1900,
  max: new Date().getFullYear(),
};

// API 端点
export const API_ENDPOINTS = {
  generateChart: '/api/chart/generate',
  analyze: '/api/analyze',
  chat: '/api/chat',
  knowledge: '/api/knowledge/search',
};

// 手相分析类别
export const PALM_ANALYSIS_CATEGORIES: PalmAnalysisType[] = [
  {
    id: 'overall',
    name: '综合分析',
    icon: '🔮',
    description: '全面解读手相特征，分析整体运势',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'career',
    name: '事业运势',
    icon: '💼',
    description: '分析事业线、太阳丘等，判断职业发展',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'wealth',
    name: '财运分析',
    icon: '💰',
    description: '通过金星丘、太阳丘分析财富运势',
    color: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'relationship',
    name: '感情运势',
    icon: '💕',
    description: '观察感情线、金星丘，了解感情状况',
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'health',
    name: '健康运势',
    icon: '🏥',
    description: '根据生命线分析健康状况和体质',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'personality',
    name: '性格特质',
    icon: '🧠',
    description: '通过智慧线、性格标记分析个性特点',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'life',
    name: '人生运势',
    icon: '🌟',
    description: '综合各条主线，分析人生整体走向',
    color: 'from-amber-500 to-orange-600',
  },
];
