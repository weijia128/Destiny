"""数据目录初始化"""
import os
from pathlib import Path

# 确保必要的目录存在
DATA_DIR = Path(__file__).parent.parent.parent / "data"
BM25_DIR = DATA_DIR / "bm25"
GRAPH_DIR = DATA_DIR / "graph"

def init_data_directories():
    """初始化数据目录"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BM25_DIR, exist_ok=True)
    os.makedirs(GRAPH_DIR, exist_ok=True)
    print(f"Data directories initialized: {DATA_DIR}")

# 初始化
init_data_directories()
