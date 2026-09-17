interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-accent-100 text-accent-700' : 'bg-primary-100 text-primary-700'
        }`}
      >
        <i className={`ri-${isUser ? 'user' : 'robot-2'}-line text-sm`}></i>
      </div>
      <div
        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed min-w-0 max-w-[85%] sm:max-w-[75%] [overflow-wrap:anywhere] ${
          isUser
            ? 'bg-accent-500 text-background-50 rounded-tr-md'
            : 'bg-background-100 text-foreground-800 rounded-tl-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}