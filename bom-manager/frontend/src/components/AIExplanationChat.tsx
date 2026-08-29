import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, MessageSquare } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface AIExplanationChatProps {
  partId: string;
  analysisSummary: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export function AIExplanationChat({
  partId,
  analysisSummary,
  isOpen,
  onClose,
}: AIExplanationChatProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Hello. I am the AI Replacement Engine assistant. I can answer questions about the recommended candidates, risks, or compatibility differences based strictly on the available component data. What would you like to know?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiRequest<{ answer: string; sources: string[] }>('/api/v1/replacements/ai-explain', {
        method: 'POST',
        token,
        body: {
          part_id: partId,
          question: text,
          analysis_context: analysisSummary,
        },
      });

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', text: data.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', text: 'Sorry, I encountered an error communicating with the AI service. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const presetQuestions = [
    "Why is the top candidate recommended?",
    "What are the major risks with the top candidate?",
    "Do these alternatives require PCB layout changes?",
    "What engineering validations are required?"
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slideInRight">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10 shadow-sm">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          AI Analysis Chat
        </h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50"
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
              m.role === 'user' ? 'bg-blue-600' : 'bg-indigo-600/20 border border-indigo-500/30'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={`max-w-[80%] rounded-xl p-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-800/80 border border-slate-700 text-slate-300 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg shrink-0 bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl rounded-tl-none p-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex flex-wrap gap-2 mb-3">
          {presetQuestions.map((q, idx) => (
            <button 
              key={idx}
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-full transition-colors truncate max-w-[90%] text-left"
            >
              {q}
            </button>
          ))}
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the recommendation..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
