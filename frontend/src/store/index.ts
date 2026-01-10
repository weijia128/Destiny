import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  BirthInfo, 
  ZiweiChart, 
  ChatMessage, 
  AgentState, 
  AgentNode,
  AnalysisCategory 
} from '@/types';

interface AppState {
  // 当前页面/模块
  currentModule: 'home' | 'ziwei' | 'analysis' | 'chat';
  setCurrentModule: (module: AppState['currentModule']) => void;

  // 出生信息
  birthInfo: BirthInfo | null;
  setBirthInfo: (info: BirthInfo) => void;
  clearBirthInfo: () => void;

  // 命盘数据
  chart: ZiweiChart | null;
  setChart: (chart: ZiweiChart) => void;
  clearChart: () => void;

  // Agent 状态
  agentState: AgentState;
  setAgentNode: (node: AgentNode) => void;
  setAgentError: (error: string | null) => void;

  // 聊天相关
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  clearMessages: () => void;

  // 报告内容（作为对话上下文）
  reportContent: string | null;
  setReportContent: (content: string | null) => void;

  // 当前分析类别
  currentCategory: AnalysisCategory | null;
  setCurrentCategory: (category: AnalysisCategory | null) => void;

  // UI 状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 侧边栏
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // 重置所有状态
  resetAll: () => void;
}

const initialAgentState: AgentState = {
  currentNode: 'idle',
  messages: [],
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, _get) => ({
        // 当前模块
        currentModule: 'home',
        setCurrentModule: (module) => set({ currentModule: module }),
        
        // 出生信息
        birthInfo: null,
        setBirthInfo: (info) => set({ birthInfo: info }),
        clearBirthInfo: () => set({ birthInfo: null }),
        
        // 命盘数据
        chart: null,
        setChart: (chart) => set({ chart }),
        clearChart: () => set({ chart: null }),
        
        // Agent 状态
        agentState: initialAgentState,
        setAgentNode: (node) => set((state) => ({
          agentState: { ...state.agentState, currentNode: node }
        })),
        setAgentError: (error) => set((state) => ({
          agentState: { 
            ...state.agentState, 
            currentNode: error ? 'error' : state.agentState.currentNode,
            error: error || undefined
          }
        })),
        
        // 聊天相关
        messages: [],
        addMessage: (message) => set((state) => ({
          messages: [...state.messages, message]
        })),
        updateMessage: (id, content) => set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content, isStreaming: false } : msg
          )
        })),
        clearMessages: () => set({ messages: [] }),

        // 报告内容（作为对话上下文）
        reportContent: null,
        setReportContent: (content) => set({ reportContent: content }),

        // 当前分析类别
        currentCategory: null,
        setCurrentCategory: (category) => set({ currentCategory: category }),
        
        // UI 状态
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),
        
        // 侧边栏
        isSidebarOpen: true,
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        
        // 重置
        resetAll: () => set({
          currentModule: 'home',
          birthInfo: null,
          chart: null,
          agentState: initialAgentState,
          messages: [],
          reportContent: null,
          currentCategory: null,
          isLoading: false,
        }),
      }),
      {
        name: 'ziwei-destiny-storage',
        partialize: (state) => ({
          birthInfo: state.birthInfo,
          chart: state.chart,
          messages: state.messages,
        }),
      }
    )
  )
);
