"""
批量导入文档脚本
扫描指定文件夹中的文档并索引到知识库

使用方法:
    python scripts/import_documents.py              # 导入默认文件夹
    python scripts/import_documents.py --path path  # 导入指定文件夹
    python scripts/import_documents.py --watch      # 监听模式（自动检测新文件）
"""
import sys
import os
from pathlib import Path
import argparse
import time
from datetime import datetime

# 添加 backend-rag 到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.knowledge_service import KnowledgeService
from loguru import logger
import asyncio


# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.md', '.txt', '.pdf', '.docx'}

# 文件名到分类的映射规则
CATEGORY_PATTERNS = {
    # 紫微斗数
    'ziwei': {
        'palace': ['宫位', '命宫', '官禄', '财帛', '夫妻', '疾厄', '迁移', '仆役'],
        'star': ['星曜', '主星', '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴'],
        'transformation': ['四化', '化禄', '化权', '化科', '化忌', '飞星'],
        'fortune': ['财运', '财帛', '理财', '财富'],
        'pattern': ['格局', '紫府', '杀破狼', '火贪'],
    },
    # 八字命理
    'bazi': {
        'structure': ['格局', '正格', '从格', '化格'],
        'yongshen': ['用神', '喜神', '忌神', '调候'],
        'ten_gods': ['十神', '正官', '七杀', '正财', '偏财', '正印', '偏印'],
        'dayun': ['大运', '流年'],
    },
    # 奇门遁甲
    'qimen': {
        'nine_star': ['九星', '天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心'],
        'eight_door': ['八门', '开门', '休门', '生门', '伤门', '杜门', '景门', '死门', '惊门'],
        'eight_god': ['八神', '值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'],
    },
    # 六爻
    'liuyao': {
        'gua': ['卦象', '六爻', '卦辞'],
        'liuyaoyin': ['用神', '世应'],
        'shiyin': ['世爻', '应爻'],
    },
    # 手相
    'shouxiang': {
        'palm': ['掌纹', '生命线', '智慧线', '感情线', '事业线'],
        'finger': ['手指', '指形'],
        '丘': ['掌丘', '金星丘', '木星丘', '土星丘', '太阳丘', '水星丘'],
    },
    # 共通知识
    'shared': {
        'wuxing': ['五行', '相生', '相克'],
        'tiangan': ['天干', '地支', '干支'],
        'yinyang': ['阴阳'],
    }
}


def detect_destiny_type(filename: str, content: str = "") -> str:
    """检测文档的命理类型"""
    text = (filename + " " + content[:500]).lower()

    # 基于文件名关键词检测
    ziwei_keywords = ['紫微', '斗数', '星曜', '宫位', '四化']
    bazi_keywords = ['八字', '四柱', '十神', '用神', '日主']
    qimen_keywords = ['奇门', '遁甲', '九星', '八门']
    liuyao_keywords = ['六爻', '卦象', '用神']
    shouxiang_keywords = ['手相', '掌纹', '掌丘']

    ziwei_count = sum(1 for k in ziwei_keywords if k in text)
    bazi_count = sum(1 for k in bazi_keywords if k in text)
    qimen_count = sum(1 for k in qimen_keywords if k in text)
    liuyao_count = sum(1 for k in liuyao_keywords if k in text)
    shouxiang_count = sum(1 for k in shouxiang_keywords if k in text)

    counts = {
        'ziwei': ziwei_count,
        'bazi': bazi_count,
        'qimen': qimen_count,
        'liuyao': liuyao_count,
        'shouxiang': shouxiang_count,
    }

    max_count = max(counts.values())
    if max_count > 0:
        for dest_type, count in counts.items():
            if count == max_count:
                return dest_type

    return 'shared'  # 默认归类为共通知识


def detect_category(destiny_type: str, filename: str, content: str = "") -> str:
    """检测文档的子分类"""
    text = (filename + " " + content[:1000]).lower()

    if destiny_type not in CATEGORY_PATTERNS:
        return 'general'

    patterns = CATEGORY_PATTERNS[destiny_type]

    for category, keywords in patterns.items():
        match_count = sum(1 for k in keywords if k in text)
        if match_count >= 2:  # 至少匹配2个关键词
            return category

    return 'general'  # 默认归类为 general


def extract_title(filename: str) -> str:
    """从文件名提取标题"""
    # 移除扩展名
    title = Path(filename).stem
    # 移除时间戳前缀（如果有）
    import re
    title = re.sub(r'^\d{8}_\d{6}_', '', title)
    # 替换下划线和连字符为空格
    title = title.replace('_', ' ').replace('-', ' ')
    return title.strip()


def scan_folder(folder_path: Path, recursive: bool = True) -> list:
    """扫描文件夹中的文档"""
    files = []

    if recursive:
        pattern = '**/*'
    else:
        pattern = '*'

    for ext in SUPPORTED_EXTENSIONS:
        files.extend(folder_path.glob(f'{pattern}{ext}'))

    # 排序：按修改时间
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    return files


def import_single_file(
    file_path: Path,
    knowledge_service: KnowledgeService,
    destiny_type: str = None,
    category: str = None,
    level: str = "method"
) -> dict:
    """导入单个文件"""
    try:
        # 读取内容用于检测
        if file_path.suffix.lower() == '.pdf':
            content = ""
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

        # 自动检测类型
        if destiny_type is None:
            destiny_type = detect_destiny_type(file_path.name, content)

        if category is None:
            category = detect_category(destiny_type, file_path.name, content)

        title = extract_title(file_path.name)

        logger.info(f"导入文件: {file_path.name} -> {destiny_type}/{category}")

        # 调用知识服务导入
        result = asyncio.run(knowledge_service.add_document(
            file_path=str(file_path),
            destiny_type=destiny_type,
            category=category,
            title=title,
            level=level,
            original_filename=file_path.name
        ))

        return {
            'file': str(file_path),
            'destiny_type': destiny_type,
            'category': category,
            'title': title,
            'status': 'success',
            'chunks': result.get('chunks', 0)
        }

    except Exception as e:
        logger.error(f"导入失败: {file_path} - {e}")
        return {
            'file': str(file_path),
            'status': 'error',
            'error': str(e)
        }


def import_folder(
    folder_path: str,
    destiny_type: str = None,
    category: str = None,
    level: str = "method",
    recursive: bool = True
) -> dict:
    """批量导入文件夹中的所有文档"""
    folder = Path(folder_path)

    if not folder.exists():
        logger.error(f"文件夹不存在: {folder_path}")
        return {'success': 0, 'failed': 0, 'files': []}

    logger.info(f"扫描文件夹: {folder.absolute()}")

    # 扫描文件
    files = scan_folder(folder, recursive)
    logger.info(f"找到 {len(files)} 个文档")

    if not files:
        logger.warning("未找到支持的文档文件")
        return {'success': 0, 'failed': 0, 'files': []}

    # 初始化知识服务
    knowledge_service = KnowledgeService()

    # 批量导入
    success = 0
    failed = 0
    results = []

    for file_path in files:
        logger.info(f"处理: {file_path.name}")
        result = import_single_file(
            file_path,
            knowledge_service,
            destiny_type,
            category,
            level
        )
        results.append(result)

        if result['status'] == 'success':
            success += 1
        else:
            failed += 1

        # 避免请求过快
        time.sleep(0.1)

    return {
        'success': success,
        'failed': failed,
        'files': results
    }


def watch_folder(folder_path: str, **kwargs):
    """监听文件夹，自动导入新文件"""
    folder = Path(folder_path)

    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)
        logger.info(f"创建文件夹: {folder.absolute()}")

    logger.info(f"开始监听文件夹: {folder.absolute()}")
    logger.info("将文件拖入文件夹后将自动导入...")
    logger.info("按 Ctrl+C 停止监听")

    processed_files = set()

    while True:
        try:
            files = scan_folder(folder, recursive=True)

            for file_path in files:
                if str(file_path) not in processed_files:
                    processed_files.add(str(file_path))
                    logger.info(f"\n检测到新文件: {file_path.name}")
                    result = import_single_file(file_path, KnowledgeService(), **kwargs)
                    if result['status'] == 'success':
                        logger.info(f"✓ 导入成功 ({result['chunks']} 个分块)")
                    else:
                        logger.error(f"✗ 导入失败: {result.get('error', '未知错误')")

            time.sleep(2)  # 每2秒检查一次

        except KeyboardInterrupt:
            logger.info("\n停止监听")
            break
        except Exception as e:
            logger.error(f"监听出错: {e}")
            time.sleep(5)


def main():
    parser = argparse.ArgumentParser(
        description='批量导入文档到知识库',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    # 导入默认 documents 文件夹
    python scripts/import_documents.py

    # 导入指定文件夹
    python scripts/import_documents.py --path /path/to/docs

    # 导入并指定命理类型
    python scripts/import_documents.py --path /path/to/docs --destiny ziwei

    # 监听模式（自动检测新文件）
    python scripts/import_documents.py --watch

文档组织规则:
    backend-rag/data/documents/
    ├── ziwei/           # 紫微斗数文档
    │   ├── palace/      # 宫位相关
    │   ├── star/        # 星曜相关
    │   └── ...
    ├── bazi/            # 八字命理文档
    ├── shared/          # 共通知识文档
    │   ├── wuxing/      # 五行理论
    │   ├── tiangan/     # 天干地支
    │   └── ...
        """
    )

    parser.add_argument(
        '--path', '-p',
        default='./data/documents',
        help='文档文件夹路径 (默认: ./data/documents)'
    )

    parser.add_argument(
        '--destiny', '-d',
        default=None,
        help='命理类型 (ziwei/bazi/qimen/liuyao/shouxiang/shared)'
    )

    parser.add_argument(
        '--category', '-c',
        default=None,
        help='子分类 (如: palace/star/transformation)'
    )

    parser.add_argument(
        '--level', '-l',
        default='method',
        choices=['basic', 'method', 'advanced'],
        help='知识层级 (默认: method)'
    )

    parser.add_argument(
        '--recursive', '-r',
        action='store_true',
        default=True,
        help='递归扫描子文件夹 (默认: True)'
    )

    parser.add_argument(
        '--watch', '-w',
        action='store_true',
        help='监听模式，自动检测新文件'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='详细输出'
    )

    args = parser.parse_args()

    # 配置日志
    if args.verbose:
        logger.remove()
        logger.add(sys.stdout, level="DEBUG")

    # 确保路径是绝对路径
    if not os.path.isabs(args.path):
        base_dir = Path(__file__).parent.parent
        args.path = str(base_dir / args.path)

    print("=" * 60)
    print("文档批量导入工具")
    print("=" * 60)

    if args.watch:
        watch_folder(
            args.path,
            destiny_type=args.destiny,
            category=args.category,
            level=args.level
        )
    else:
        result = import_folder(
            folder_path=args.path,
            destiny_type=args.destiny,
            category=args.category,
            level=args.level,
            recursive=args.recursive
        )

        print("\n" + "=" * 60)
        print(f"导入完成!")
        print(f"  成功: {result['success']} 个文件")
        print(f"  失败: {result['failed']} 个文件")
        print("=" * 60)

        # 显示失败的列表
        if result['failed'] > 0:
            print("\n失败的文件:")
            for f in result['files']:
                if f['status'] == 'error':
                    print(f"  - {f['file']}: {f.get('error', '未知错误')}")


if __name__ == "__main__":
    main()
