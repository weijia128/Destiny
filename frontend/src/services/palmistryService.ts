import type { BirthInfo, PalmReading, PalmFeature, PalmAnalysisCategory } from '@/types';

/**
 * 生成手相分析
 */
export function generatePalmReading(
  birthInfo: BirthInfo,
  category: PalmAnalysisCategory
): PalmReading {
  const readingId = `palm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 生成手相特征
  const features = generatePalmFeatures(birthInfo);

  // 生成分析内容
  const analysis = generatePalmAnalysis(birthInfo, features, category);

  return {
    id: readingId,
    birthInfo,
    features,
    overallAnalysis: analysis.overall,
    careerAnalysis: analysis.career,
    wealthAnalysis: analysis.wealth,
    relationshipAnalysis: analysis.relationship,
    healthAnalysis: analysis.health,
    personalityAnalysis: analysis.personality,
    recommendations: analysis.recommendations,
    createdAt: new Date(),
  };
}

/**
 * 生成手相特征
 */
function generatePalmFeatures(_birthInfo: BirthInfo): PalmFeature[] {
  const features: PalmFeature[] = [];
  const random = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // 生成生命线
  features.push({
    name: '生命线',
    type: 'line',
    description: '从拇指根部延伸的弧形线条，代表生命力与健康状况',
    meaning: '生命线深长清晰，表示体质强健，精力充沛',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成智慧线
  features.push({
    name: '智慧线',
    type: 'line',
    description: '横贯手掌中央的线条，反映思维能力和智力水平',
    meaning: '智慧线清晰且长，表示思维敏捷，学习能力强',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成感情线
  features.push({
    name: '感情线',
    type: 'line',
    description: '位于智慧线上方的横向线条，象征感情与婚姻',
    meaning: '感情线深长，表示感情专一，婚姻幸福',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成事业线
  if (Math.random() > 0.3) {
    features.push({
      name: '事业线',
      type: 'line',
      description: '从手腕向上延伸的线条，代表事业发展',
      meaning: '事业线明显，表示有明确的职业方向',
      strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
      side: 'both',
    });
  }

  // 生成金星丘
  features.push({
    name: '金星丘',
    type: 'mount',
    description: '拇指根部隆起的区域，象征爱情、魅力和艺术天赋',
    meaning: '金星丘饱满，表示有艺术天赋和魅力',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成木星丘
  features.push({
    name: '木星丘',
    type: 'mount',
    description: '食指下方的隆起区域，代表野心和领导能力',
    meaning: '木星丘发达，表示有领导才能和进取心',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成太阳丘
  features.push({
    name: '太阳丘',
    type: 'mount',
    description: '无名指下方的区域，象征名声、财富和成功',
    meaning: '太阳丘明显，表示有成功潜力和财运',
    strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
    side: 'both',
  });

  // 生成一些标记
  if (Math.random() > 0.5) {
    features.push({
      name: '十字纹',
      type: 'mark',
      description: '线条交叉形成的十字形状，有特殊的象征意义',
      meaning: '十字纹出现表示在关键时刻有贵人相助',
      strength: (['strong', 'medium', 'weak'] as const)[random(0, 2)],
      side: Math.random() > 0.5 ? 'left' : 'right',
    });
  }

  return features;
}

/**
 * 生成手相分析内容
 */
function generatePalmAnalysis(
  birthInfo: BirthInfo,
  features: PalmFeature[],
  _category: PalmAnalysisCategory
) {
  const gender = birthInfo.gender === 'male' ? '男性' : '女性';
  const year = birthInfo.year;
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  // 基础性格分析
  const personalityTraits = getPersonalityByFeatures(features);

  // 事业分析
  const careerAnalysis = generateCareerAnalysis(features, age, gender);

  // 财运分析
  const wealthAnalysis = generateWealthAnalysis(features, gender);

  // 感情分析
  const relationshipAnalysis = generateRelationshipAnalysis(features, age, gender);

  // 健康分析
  const healthAnalysis = generateHealthAnalysis(features, age, gender);

  // 综合分析
  const overall = `根据您的手相分析，作为${age}岁的${gender}，您的手相展现出独特的命运特征。${personalityTraits}您的整体格局显示，在人生的不同阶段会有不同的发展重点，需要把握时机，顺势而为。`;

  // 建议
  const recommendations = [
    '发挥自身优势，在擅长的领域深耕发展',
    '保持积极心态，面对挑战时坚持不懈',
    '注重健康养生，劳逸结合很重要',
    '珍惜身边的人际关系，人脉是重要财富',
    '适时调整人生规划，灵活应对变化',
  ];

  return {
    overall,
    personality: personalityTraits,
    career: careerAnalysis,
    wealth: wealthAnalysis,
    relationship: relationshipAnalysis,
    health: healthAnalysis,
    recommendations,
  };
}

/**
 * 根据特征分析性格
 */
function getPersonalityByFeatures(features: PalmFeature[]): string {
  const personalityElements = [];

  // 分析智慧线
  const wisdomLine = features.find(f => f.name === '智慧线');
  if (wisdomLine) {
    if (wisdomLine.strength === 'strong') {
      personalityElements.push('思维敏捷，逻辑清晰');
    } else if (wisdomLine.strength === 'medium') {
      personalityElements.push('思维适中，善于思考');
    } else {
      personalityElements.push('直觉敏锐，感性思维');
    }
  }

  // 分析生命线
  const lifeLine = features.find(f => f.name === '生命线');
  if (lifeLine) {
    if (lifeLine.strength === 'strong') {
      personalityElements.push('精力充沛，意志坚定');
    } else {
      personalityElements.push('内敛稳重，注重内涵');
    }
  }

  // 分析金星丘
  const venusMount = features.find(f => f.name === '金星丘');
  if (venusMount && venusMount.strength === 'strong') {
    personalityElements.push('富有艺术气质，魅力十足');
  }

  return personalityElements.length > 0
    ? `您展现出${personalityElements.join('，')}的特质。`
    : '您的手相特征显示了独特的个性魅力。';
}

/**
 * 生成事业分析
 */
function generateCareerAnalysis(features: PalmFeature[], age: number, gender: string): string {
  const careerLine = features.find(f => f.name === '事业线');
  const jupiterMount = features.find(f => f.name === '木星丘');
  const sunMount = features.find(f => f.name === '太阳丘');

  let analysis = `作为${age}岁的${gender}，您的事业发展具有以下特点：`;

  if (careerLine && careerLine.strength === 'strong') {
    analysis += '事业线清晰明显，表明您有明确的职业目标和发展方向。';
  }

  if (jupiterMount && jupiterMount.strength === 'strong') {
    analysis += '木星丘发达，显示您具备领导才能，适合管理岗位或自主创业。';
  }

  if (sunMount && sunMount.strength === 'strong') {
    analysis += '太阳丘明显，象征着事业上的成功潜力和名声运。';
  }

  if (age < 30) {
    analysis += '年轻时期宜多学习积累，为未来发展打下坚实基础。';
  } else if (age < 50) {
    analysis += '中年时期是事业发展的黄金期，应把握机会，积极进取。';
  } else {
    analysis += '成熟时期可考虑经验传承或转向更有意义的事业方向。';
  }

  return analysis;
}

/**
 * 生成财运分析
 */
function generateWealthAnalysis(features: PalmFeature[], _gender: string): string {
  const sunMount = features.find(f => f.name === '太阳丘');
  const emotionLine = features.find(f => f.name === '感情线');

  let analysis = `您的财运状况分析如下：`;

  if (sunMount && sunMount.strength === 'strong') {
    analysis += '太阳丘发达，主财运较旺，有获得财富和名声的潜质。';
  } else {
    analysis += '财运平稳，需要通过努力工作和合理理财来积累财富。';
  }

  if (emotionLine && emotionLine.strength === 'strong') {
    analysis += '感情线清晰，表示通过人际关系可能获得财运机会。';
  }

  analysis += '建议采取稳健的理财策略，避免高风险投资。';

  return analysis;
}

/**
 * 生成感情分析
 */
function generateRelationshipAnalysis(features: PalmFeature[], age: number, _gender: string): string {
  const emotionLine = features.find(f => f.name === '感情线');
  const venusMount = features.find(f => f.name === '金星丘');

  let analysis = `关于您的感情运势：`;

  if (emotionLine) {
    if (emotionLine.strength === 'strong') {
      analysis += '感情线深长清晰，表示感情专一，能够建立稳定的感情关系。';
    } else if (emotionLine.strength === 'medium') {
      analysis += '感情线适中，表示感情发展较为平稳。';
    } else {
      analysis += '感情线较浅，表示感情较为内敛，需要主动寻找缘分。';
    }
  }

  if (venusMount && venusMount.strength === 'strong') {
    analysis += '金星丘饱满，显示您有很强的个人魅力，异性缘较好。';
  }

  if (age < 25) {
    analysis += '年轻时期感情较为单纯，重在培养真挚的感情基础。';
  } else if (age < 35) {
    analysis += '适婚年龄，宜认真考虑婚姻大事，寻找合适的伴侣。';
  } else {
    analysis += '成熟阶段的感情更加注重精神契合和相互理解。';
  }

  return analysis;
}

/**
 * 生成健康分析
 */
function generateHealthAnalysis(features: PalmFeature[], age: number, _gender: string): string {
  const lifeLine = features.find(f => f.name === '生命线');

  let analysis = `基于您的手相特征，健康状况分析如下：`;

  if (lifeLine) {
    if (lifeLine.strength === 'strong') {
      analysis += '生命线深长清晰，表示体质强健，抵抗力较好。';
    } else if (lifeLine.strength === 'medium') {
      analysis += '生命线适中，表示体质一般，需要注意保养。';
    } else {
      analysis += '生命线较浅，需要特别注意身体健康，定期体检。';
    }
  }

  if (age < 30) {
    analysis += '年轻时期应养成良好的生活习惯，为健康打下基础。';
  } else if (age < 50) {
    analysis += '中年时期要注意工作与休息的平衡，避免过度劳累。';
  } else {
    analysis += '年长后应更加重视养生保健，定期进行健康检查。';
  }

  return analysis;
}
