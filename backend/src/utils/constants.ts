// 十二时辰
export const HOURS = [
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
