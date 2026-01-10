"""
知识库管理服务
处理文档上传、索引和删除
"""
import os
import json
import hashlib
import tempfile
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
from loguru import logger

import jieba

from ..config import get_settings
from ..services.hybrid_retriever import get_hybrid_retriever
from ..services.embedding_service import get_embedding_service


class DocumentChunk:
    """文档分块"""

    def __init__(self, id: str, content: str, metadata: Dict):
        self.id = id
        self.content = content
        self.metadata = metadata


class KnowledgeService:
    """知识库管理服务"""

    def __init__(self):
        self.settings = get_settings()
        self.retriever = get_hybrid_retriever()
        self.embedding = get_embedding_service()

        # 文档存储目录
        self.docs_dir = Path("./data/documents")
        self.docs_dir.mkdir(parents=True, exist_ok=True)

        # 文档记录存储
        self.records_file = "./data/document_records.json"
        self._ensure_records_file()

    def _ensure_records_file(self):
        """确保记录文件存在"""
        if not os.path.exists(self.records_file):
            with open(self.records_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False)

    def _save_file(
        self,
        source_path: str,
        destiny_type: str,
        original_filename: str
    ) -> str:
        """
        保存文件到本地存储目录

        Args:
            source_path: 源文件路径
            destiny_type: 命理类型
            original_filename: 原始文件名

        Returns:
            保存后的文件路径
        """
        # 按命理类型组织目录
        type_dir = self.docs_dir / destiny_type
        type_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名：时间戳_原始文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = Path(original_filename).suffix
        filename = f"{timestamp}_{original_filename}"
        saved_path = type_dir / filename

        # 复制文件
        import shutil
        shutil.copy2(source_path, saved_path)

        logger.info(f"Saved file to: {saved_path}")
        return str(saved_path)

    def _load_records(self) -> List[Dict]:
        """加载文档记录"""
        try:
            with open(self.records_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _save_records(self, records: List[Dict]):
        """保存文档记录"""
        with open(self.records_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

    async def add_document(
        self,
        file_path: str,
        destiny_type: str,
        category: str,
        title: str = None,
        level: str = "method",
        original_filename: str = None
    ) -> Dict:
        """
        添加文档到知识库

        Args:
            file_path: 文件路径
            destiny_type: 命理类型
            category: 子分类
            title: 标题
            level: 知识层级
            original_filename: 原始文件名（用于保存）

        Returns:
            处理结果
        """
        # 0. 保存文件到本地
        original_filename = original_filename or os.path.basename(file_path)
        saved_path = self._save_file(file_path, destiny_type, original_filename)

        # 1. 解析文档内容
        content = self._parse_document(saved_path)

        if not content:
            raise ValueError("无法解析文档内容")

        # 2. 文本分块
        chunks = self._chunk_text(
            content=content,
            file_path=saved_path,  # 使用保存后的路径
            destiny_type=destiny_type,
            category=category,
            title=title or original_filename,
            level=level
        )

        # 3. 转换为文档格式
        documents = []
        for chunk in chunks:
            doc_id = f"{destiny_type}_{category}_{chunk.id}"
            doc = {
                "id": doc_id,
                "title": chunk.metadata.get("title", ""),
                "content": chunk.content,
                "level": chunk.metadata.get("level", level),
                "destiny_type": destiny_type,
                "category": category,
                "source_type": "uploaded",
                "keywords": self._extract_keywords(chunk.content),
                "entities": self._extract_entities(chunk.content),
            }
            documents.append(doc)

        # 4. 索引到检索系统
        await self.retriever.index_documents(
            destiny_type=destiny_type,
            category=category,
            documents=documents
        )

        # 5. 保存文档记录
        record = {
            "id": hashlib.md5(file_path.encode()).hexdigest()[:8],
            "file_path": file_path,
            "title": title or os.path.basename(file_path),
            "destiny_type": destiny_type,
            "category": category,
            "chunks": len(documents),
            "indexed_at": datetime.now().isoformat()
        }

        records = self._load_records()
        records.append(record)
        self._save_records(records)

        logger.info(f"Indexed document: {title or file_path} ({len(documents)} chunks)")

        return {
            "document_id": record["id"],
            "chunks": len(documents),
            "status": "success"
        }

    async def add_text(self, entry: Dict) -> Dict:
        """直接添加文本"""
        content = entry.get("content", "")
        destiny_type = entry.get("destiny_type", "ziwei")
        category = entry.get("category", "general")
        title = entry.get("title", "Text Entry")

        # 分块
        chunks = self._chunk_text(
            content=content,
            file_path="text_entry",
            destiny_type=destiny_type,
            category=category,
            title=title,
            level=entry.get("level", "method")
        )

        documents = []
        for i, chunk in enumerate(chunks):
            doc_id = f"{destiny_type}_{category}_{chunk.id}"
            doc = {
                "id": doc_id,
                "title": chunk.metadata.get("title", ""),
                "content": chunk.content,
                "level": chunk.metadata.get("level", "method"),
                "destiny_type": destiny_type,
                "category": category,
                "source_type": "manual",
                "keywords": self._extract_keywords(chunk.content) or entry.get("keywords", []),
                "entities": self._extract_entities(chunk.content) or entry.get("entities", []),
            }
            documents.append(doc)

        await self.retriever.index_documents(
            destiny_type=destiny_type,
            category=category,
            documents=documents
        )

        return {
            "document_id": documents[0]["id"] if documents else "",
            "chunks": len(documents),
            "status": "success"
        }

    def _parse_document(self, file_path: str) -> str:
        """解析文档内容"""
        ext = Path(file_path).suffix.lower()

        try:
            if ext == '.pdf':
                return self._parse_pdf(file_path)
            elif ext == '.md':
                return self._parse_markdown(file_path)
            elif ext == '.txt':
                return self._parse_text(file_path)
            elif ext == '.docx':
                return self._parse_docx(file_path)
            else:
                # 默认尝试文本
                return self._parse_text(file_path)
        except Exception as e:
            logger.error(f"Error parsing document: {e}")
            return ""

    def _parse_pdf(self, file_path: str) -> str:
        """解析 PDF"""
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = []
            for page in reader.pages:
                text.append(page.extract_text() or "")
            return "\n\n".join(text)
        except ImportError:
            raise ValueError("需要安装 pypdf: pip install pypdf")

    def _parse_markdown(self, file_path: str) -> str:
        """解析 Markdown"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _parse_text(self, file_path: str) -> str:
        """解析文本"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _parse_docx(self, file_path: str) -> str:
        """解析 Word"""
        try:
            from docx import Document
            doc = Document(file_path)
            text = [para.text for para in doc.paragraphs]
            return "\n".join(text)
        except ImportError:
            raise ValueError("需要安装 python-docx: pip install python-docx")

    def _chunk_text(
        self,
        content: str,
        file_path: str,
        destiny_type: str,
        category: str,
        title: str,
        level: str
    ) -> List[DocumentChunk]:
        """文本分块"""
        # 清理内容
        content = self._clean_content(content)

        # 按段落分割
        paragraphs = content.split('\n\n')

        chunks = []
        current_chunk = ""
        chunk_index = 0
        chunk_size = 500

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) > chunk_size:
                if current_chunk:
                    chunk = self._create_chunk(
                        content=current_chunk,
                        file_path=file_path,
                        chunk_index=chunk_index,
                        destiny_type=destiny_type,
                        category=category,
                        title=title,
                        level=level
                    )
                    chunks.append(chunk)
                    chunk_index += 1

                current_chunk = para
            else:
                current_chunk += "\n\n" + para if current_chunk else para

        # 最后一个块
        if current_chunk:
            chunk = self._create_chunk(
                content=current_chunk,
                file_path=file_path,
                chunk_index=chunk_index,
                destiny_type=destiny_type,
                category=category,
                title=title,
                level=level
            )
            chunks.append(chunk)

        return chunks

    def _create_chunk(
        self,
        content: str,
        file_path: str,
        chunk_index: int,
        destiny_type: str,
        category: str,
        title: str,
        level: str
    ) -> DocumentChunk:
        """创建文档块"""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        chunk_id = f"{Path(file_path).stem}_{chunk_index}_{content_hash}"

        return DocumentChunk(
            id=chunk_id,
            content=content,
            metadata={
                "source_file": file_path,
                "destiny_type": destiny_type,
                "category": category,
                "title": title,
                "level": level,
            }
        )

    def _clean_content(self, content: str) -> str:
        """清理内容"""
        import re
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r' {2,}', ' ', content)
        return content.strip()

    def _extract_keywords(self, content: str) -> List[str]:
        """提取关键词"""
        return list(jieba.cut(content))

    def _extract_entities(self, content: str) -> List[str]:
        """提取实体"""
        entities = []

        # 紫微斗数实体
        ziwei_entities = [
            "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
            "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
            "七杀", "破军", "命宫", "官禄宫", "财帛宫"
        ]

        for entity in ziwei_entities:
            if entity in content:
                entities.append(entity)

        return list(set(entities))

    def list_documents(self, destiny_type: str = None) -> List[Dict]:
        """列出文档"""
        records = self._load_records()

        if destiny_type:
            records = [r for r in records if r.get("destiny_type") == destiny_type]

        return records

    def delete_document(self, document_id: str) -> int:
        """删除文档"""
        records = self._load_records()
        deleted_count = 0

        for record in records:
            if record.get("id") == document_id:
                records.remove(record)
                deleted_count = record.get("chunks", 1)
                break

        self._save_records(records)
        return deleted_count

    def get_stats(self) -> Dict:
        """获取统计"""
        records = self._load_records()

        by_type = {}
        for record in records:
            dt = record.get("destiny_type", "unknown")
            if dt not in by_type:
                by_type[dt] = {"documents": 0, "chunks": 0}
            by_type[dt]["documents"] += 1
            by_type[dt]["chunks"] += record.get("chunks", 0)

        total_chunks = sum(r.get("chunks", 0) for r in records)

        return {
            "total_documents": len(records),
            "total_chunks": total_chunks,
            "by_destiny_type": by_type
        }

    def reindex_all(self, destiny_type: str) -> int:
        """重建索引"""
        records = self._load_records()
        type_records = [r for r in records if r.get("destiny_type") == destiny_type]

        total = 0
        for record in type_records:
            file_path = record.get("file_path")
            if os.path.exists(file_path):
                # 重新索引
                import asyncio
                chunks = asyncio.run(self.add_document(
                    file_path=file_path,
                    destiny_type=destiny_type,
                    category=record.get("category", "general"),
                    title=record.get("title"),
                ))
                total += chunks.get("chunks", 0)

        return total


# 单例实例
_knowledge_service: KnowledgeService | None = None


def get_knowledge_service() -> KnowledgeService:
    """获取知识服务单例"""
    global _knowledge_service
    if _knowledge_service is None:
        _knowledge_service = KnowledgeService()
    return _knowledge_service
