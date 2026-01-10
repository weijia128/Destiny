"""
知识库迁移脚本
从现有 TypeScript 知识库迁移到向量数据库
"""
import sys
import os
import json
from pathlib import Path

# 添加 backend-rag 到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 从 TypeScript 知识库读取数据
KNOWLEDGE_SOURCE = "../../backend/src/knowledge"


def load_existing_knowledge():
    """加载现有知识库数据"""
    knowledge_data = {}

    knowledge_base = {
        # 紫微斗数知识
        "ziwei": {
            "career": [],
            "wealth": [],
            "relationship": [],
            "health": [],
            "family": [],
            "general": [],
        },
        # 八字知识
        "bazi": {
            "career": [],
            "wealth": [],
            "relationship": [],
            "health": [],
            "family": [],
            "general": [],
        },
    }

    # 模拟从 TypeScript 文件读取数据
    # 实际使用时，需要解析 TypeScript 文件或导出为 JSON

    print("知识库迁移工具")
    print("=" * 60)
    print("注意: 此脚本用于从现有知识库迁移数据到向量数据库")
    print("请确保已备份现有数据")
    print("=" * 60)

    return knowledge_data


def migrate_to_vector_db(knowledge_data, rebuild=False):
    """迁移到向量数据库"""
    import asyncio
    from app.services.rag_engine import get_rag_engine

    engine = get_rag_engine()

    total = 0

    for destiny_type, categories in knowledge_data.items():
        for category, entries in categories.items():
            if not entries:
                continue

            print(f"\n处理 {destiny_type}/{category}...")

            documents = []
            for entry in entries:
                doc = {
                    "id": entry.get("id", ""),
                    "title": entry.get("title", ""),
                    "content": entry.get("content", ""),
                    "level": "method",
                    "destiny_type": destiny_type,
                    "category": category,
                    "source_type": "migrated",
                    "keywords": entry.get("keywords", []),
                    "entities": entry.get("stars", []) + entry.get("palaces", []),
                }
                documents.append(doc)

            if documents:
                asyncio.run(engine.retriever.index(
                    destiny_type=destiny_type,
                    category=category,
                    documents=documents
                ))
                total += len(documents)
                print(f"  ✓ {len(documents)} 条目")

    print(f"\n迁移完成！共 {total} 条知识已索引")


def export_knowledge_to_json(knowledge_data, output_file="knowledge_export.json"):
    """导出知识库为 JSON 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(knowledge_data, f, ensure_ascii=False, indent=2)
    print(f"\n知识库已导出到 {output_file}")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="知识库迁移工具")
    parser.add_argument("--export", action="store_true", help="导出为 JSON")
    parser.add_argument("--import", dest="import_file", help="从 JSON 导入")
    parser.add_argument("--migrate", action="store_true", help="迁移到向量数据库")
    parser.add_argument("--rebuild", action="store_true", help="重建索引")
    parser.add_argument("--stats", action="store_true", help="显示统计信息")

    args = parser.parse_args()

    # 加载知识数据
    knowledge_data = load_existing_knowledge()

    if args.stats:
        # 显示统计信息
        total = sum(
            len(entries)
            for categories in knowledge_data.values()
            for entries in categories.values()
        )
        print(f"\n知识库统计:")
        print(f"  总条目数: {total}")
        for dt, categories in knowledge_data.items():
            cat_count = sum(len(entries) for entries in categories.values())
            print(f"  {dt}: {cat_count} 条")

    elif args.export:
        # 导出为 JSON
        export_knowledge_to_json(knowledge_data)

    elif args.import_file:
        # 从 JSON 导入
        with open(args.import_file, 'r', encoding='utf-8') as f:
            knowledge_data = json.load(f)
        print(f"已从 {args.import_file} 导入数据")

    elif args.migrate or args.rebuild:
        # 迁移/重建
        migrate_to_vector_db(knowledge_data, rebuild=args.rebuild)

    else:
        # 默认显示帮助
        parser.print_help()


if __name__ == "__main__":
    main()
