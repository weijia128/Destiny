"""
命理类型枚举定义
"""
from enum import Enum


class DestinyType(str, Enum):
    """命理大类 - 顶级分类"""
    SHARED = "shared"        # 共通知识 (五行、天干地支)
    ZIWEI = "ziwei"          # 紫微斗数
    BAZI = "bazi"            # 八字命理
    QIMEN = "qimen"          # 奇门遁甲
    LIUYAO = "liuyao"        # 六爻预测
    SHOUXIANG = "shouxiang"  # 手相

    @classmethod
    def values(cls):
        return [e.value for e in cls]


class KnowledgeLevel(str, Enum):
    """知识层级 - 决定检索优先级"""
    BASIC = "basic"         # 基础概念 (共用)
    METHOD = "method"       # 方法论 (各方法特有)
    ADVANCED = "advanced"   # 高级分析 (如格局、特殊推算)


class RetrievalStrategy(str, Enum):
    """检索策略"""
    HYBRID_VECTOR = "hybrid_vector"   # 向量混合检索
    GRAPH_LOCAL = "graph_local"       # 图谱局部检索
    GRAPH_GLOBAL = "graph_global"     # 图谱全局检索
    CROSS_TYPE = "cross_type"         # 跨类型检索


class QueryType(str, Enum):
    """查询类型"""
    PALACE_INQUIRY = "palace_inquiry"     # 宫位查询
    STAR_INQUIRY = "star_inquiry"         # 星曜查询
    FORTUNE_QUERY = "fortune_query"       # 运势查询
    PATTERN_QUERY = "pattern_query"       # 格局查询
    BASIC_CONCEPT = "basic_concept"       # 基础概念
    COMPARISON = "comparison"             # 对比分析
    GENERAL = "general"                   # 一般查询


# 紫微斗数子分类
class ZiweiCategory(str, Enum):
    PALACE = "palace"           # 宫位分析
    STAR = "star"               # 星曜分析
    TRANSFORMATION = "transformation"  # 四化分析
    FORTUNE = "fortune"         # 运势分析
    PATTERN = "pattern"         # 格局分析
    LIFE_PALACE = "life_palace" # 命宫专题
    OFFICIAL_PALACE = "official_palace"  # 官禄宫专题
    WEALTH_PALACE = "wealth_palace"      # 财帛宫专题
    MARRIAGE_PALACE = "marriage_palace"   # 夫妻宫专题


# 八字子分类
class BaziCategory(str, Enum):
    STRUCTURE = "structure"     # 格局分析
    YONGSHEN = "yongshen"       # 用神分析
    TEN_GODS = "ten_gods"       # 十神分析
    DAYUN = "dayun"             # 大运流年
    FATE_CHARACTER = "fate_character"  # 命局特征


# 奇门遁甲子分类
class QimenCategory(str, Enum):
    NINE_STAR = "nine_star"     # 九星分析
    EIGHT_DOOR = "eight_door"   # 八门分析
    EIGHT_GOD = "eight_god"     # 八神分析
    FORMATION = "formation"     # 格局分析
    TIAN_PAN = "tian_pan"       # 天盘分析
    DI_PAN = "di_pan"           # 地盘分析


# 六爻子分类
class LiuyaoCategory(str, Enum):
    GUA = "gua"                 # 卦象分析
    LIUYAO_YONGSHEN = "liuyao_yongshen"  # 六爻用神
    SHIYIN = "shiyin"          # 世应分析


# 手相子分类
class PalmistryCategory(str, Enum):
    PALM = "palm"               # 掌纹分析
    FINGER = "finger"           # 手指特征
    MOUNT = "mount"             # 掌丘分析
    LINE = "line"               # 纹理细节
