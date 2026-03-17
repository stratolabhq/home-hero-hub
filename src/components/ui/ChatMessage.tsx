import { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  children: ReactNode;
  timestamp?: number;
  /** Optional avatar for the assistant */
  assistantAvatar?: ReactNode;
}

export function ChatMessage({
  role,
  children,
  timestamp,
  assistantAvatar,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={['flex gap-3', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2e6f40] flex items-center justify-center text-white text-xs font-bold mt-1">
          {assistantAvatar ?? 'AI'}
        </div>
      )}

      <div
        className={[
          'max-w-xl rounded-2xl text-sm leading-relaxed px-4 py-3',
          isUser
            ? 'bg-[#2e6f40] text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm',
        ].join(' ')}
      >
        {children}
        {timestamp && (
          <div
            className={[
              'text-[10px] mt-1.5',
              isUser ? 'text-[#a3d9b0] text-right' : 'text-gray-400',
            ].join(' ')}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold mt-1">
          You
        </div>
      )}
    </div>
  );
}

/** Typing / streaming indicator shown while the AI generates */
export function ChatTypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-[#2e6f40] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        AI
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-[#3d8b54] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
