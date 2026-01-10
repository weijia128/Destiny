import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import type { ChatMessage, AnalysisCategory, ZiweiChart } from '@/types';
import { ANALYSIS_CATEGORIES } from '@/utils/constants';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  currentCategory?: AnalysisCategory | null;
  onCategoryChange?: (category: AnalysisCategory) => void;
  chart?: ZiweiChart | null;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  currentCategory,
  onCategoryChange,
  chart: _chart,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动调整输入框高度
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 快捷问题
  const quickQuestions = currentCategory ? [
    { category: 'career', questions: ['今年事业运势如何？', '适合换工作吗？', '如何提升职场运势？'] },
    { category: 'wealth', questions: ['今年财运如何？', '适合投资吗？', '如何增加收入？'] },
    { category: 'relationship', questions: ['今年桃花运如何？', '感情何时能稳定？', '如何改善感情运？'] },
    { category: 'health', questions: ['需要注意哪些健康问题？', '如何养生保健？', '身体虚弱怎么调理？'] },
    { category: 'family', questions: ['与家人关系如何？', '子女缘分如何？', '如何改善家庭关系？'] },
    { category: 'general', questions: ['整体运势如何？', '人生有何建议？', '如何把握机遇？'] },
  ].find(q => q.category === currentCategory)?.questions || [] : [];

  return (
    <div className="flex flex-col h-full">
      {/* 类别选择标签 */}
      {onCategoryChange && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 overflow-x-auto">
          <div className="flex gap-2">
            {ANALYSIS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`
                  tab-item whitespace-nowrap flex items-center gap-1.5
                  ${currentCategory === cat.id ? 'active' : ''}
                `}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destiny-600/20 border border-destiny-500/30 mb-4">
              <Sparkles className="w-8 h-8 text-destiny-400" />
            </div>
            <h3 className="font-display text-xl text-white mb-2">
              命盘解读就绪
            </h3>
            <p className="text-gray-400 mb-6">
              {currentCategory
                ? `已选择「${ANALYSIS_CATEGORIES.find(c => c.id === currentCategory)?.name}」，请开始提问`
                : '请选择要分析的方面，或直接提问'}
            </p>

            {/* 快捷问题 */}
            {quickQuestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(q)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-destiny-500/30 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 消息气泡 */}
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                flex gap-3 max-w-[85%]
                ${message.role === 'user' ? 'flex-row-reverse' : ''}
              `}>
                {/* 头像 */}
                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  ${message.role === 'user' 
                    ? 'bg-destiny-600' 
                    : 'bg-gradient-to-br from-cosmic-gold to-amber-600'
                  }
                `}>
                  {message.role === 'user' 
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-white" />
                  }
                </div>

                {/* 消息内容 */}
                <div className={`
                  px-4 py-3 rounded-2xl
                  ${message.role === 'user' 
                    ? 'chat-bubble-user text-white' 
                    : 'chat-bubble-ai text-gray-200'
                  }
                `}>
                  {message.isStreaming ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-gray-400">思考中...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentCategory 
                ? `关于${ANALYSIS_CATEGORIES.find(c => c.id === currentCategory)?.name}，您想了解什么？`
                : '请输入您的问题...'
              }
              disabled={isLoading}
              rows={1}
              className="input-cosmic resize-none pr-12"
              style={{ minHeight: '48px' }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-purple px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          AI 分析仅供参考，命运掌握在自己手中
        </p>
      </div>
    </div>
  );
}
