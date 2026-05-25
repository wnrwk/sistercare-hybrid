import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '../lib/trpc.js';
import { Send, Heart, Loader2, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const NUNA_CHARACTER_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663652214334/mJzafXLjYPz8eYD4h9VJaQ/sister_character-oDV6ZQv3WHu357sqw3CwpK.webp';

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCharacter, setShowCharacter] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greetingQuery = trpc.chat.getInitialGreeting.useQuery(undefined, {
    enabled: isStarted,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const historyQuery = trpc.chat.getHistory.useQuery(
    { limit: 50 },
    { enabled: isStarted }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();

  // 대화 데이터 통합 처리 (인사말과 히스토리 경합 해결)
  useEffect(() => {
    if (!isStarted) return;

    // 히스토리가 있으면 히스토리를 먼저 보여줌
    if (historyQuery.data && historyQuery.data.length > 0) {
      setMessages(historyQuery.data);
    } 
    // 히스토리가 없고 인사말 데이터가 왔을 때만 인사말 표시
    else if (greetingQuery.data && messages.length === 0 && !historyQuery.isLoading) {
      const greetingMessage: Message = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: greetingQuery.data.message,
        createdAt: new Date(),
      };
      setMessages([greetingMessage]);
    }
  }, [isStarted, historyQuery.data, historyQuery.isLoading, greetingQuery.data]);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        message: inputMessage,
      });

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '미안해 동생아, 지금 누나가 좀 힘든 상태야. 다시 말해줄래?',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, sendMessageMutation]);

  // Enter 키로 전송
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img 
            src={NUNA_CHARACTER_IMAGE} 
            alt="누나" 
            className="w-48 h-48 mx-auto mb-6 rounded-full shadow-lg"
          />
          <h1 className="text-4xl font-bold text-purple-900 mb-2">누나</h1>
          <p className="text-gray-700 mb-8">안녕! 나는 누나야. 뭐 하고 있었어?</p>
          <button
            onClick={() => setIsStarted(true)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
          >
            누나와 대화 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={NUNA_CHARACTER_IMAGE} 
            alt="누나" 
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h1 className="font-bold text-lg">누나</h1>
            <div className="flex items-center gap-1 text-xs opacity-90">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              동생 기다리는 중...
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowCharacter(!showCharacter)}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <Heart className={`w-6 h-6 ${showCharacter ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                msg.role === 'user'
                  ? 'bg-pink-500 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 rounded-tl-none border border-pink-100'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div
                className={`text-[10px] mt-1 opacity-70 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-pink-100 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
              <span className="text-sm text-gray-500">누나가 생각 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 bg-white border-t border-pink-100">
        <div className="relative max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="누나한테 하고 싶은 말 있어?"
            className="flex-1 p-3 pr-12 rounded-2xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none max-h-32 bg-pink-50/30"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          누나는 동생의 모든 이야기를 소중하게 들어줄게 💕
        </p>
      </div>

      {/* 캐릭터 오버레이 (선택 사항) */}
      {showCharacter && !isLoading && messages.length > 0 && (
        <div className="fixed bottom-24 right-6 w-24 h-24 pointer-events-none animate-bounce">
          <img 
            src={NUNA_CHARACTER_IMAGE} 
            alt="캐릭터" 
            className="w-full h-full rounded-full border-4 border-white shadow-xl opacity-80"
          />
        </div>
      )}
    </div>
  );
}
