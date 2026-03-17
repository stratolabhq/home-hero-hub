'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  /** Pass highlighted HTML if you have a syntax highlighter */
  highlightedHtml?: string;
  /** Show copy / download buttons */
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'success';
    loading?: boolean;
  }>;
  streaming?: boolean;
  className?: string;
}

const variantBtn: Record<string, string> = {
  default:  'bg-slate-700 text-slate-300 hover:bg-slate-600',
  primary:  'bg-[#2e6f40] text-white hover:bg-[#3d8b54]',
  success:  'bg-[#10b981] text-white',
};

export function CodeBlock({
  code,
  language = 'yaml',
  filename,
  highlightedHtml,
  actions = [],
  streaming = false,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={['rounded-xl overflow-hidden border border-slate-700 shadow-lg', className].join(' ')}>
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 gap-3">
        <div className="flex items-center gap-2">
          {/* macOS-style traffic lights */}
          <span className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
          <span className="w-3 h-3 rounded-full bg-[#10b981] opacity-70" />
          {filename && (
            <span className="text-slate-400 text-xs ml-2 font-mono">{filename}</span>
          )}
          {language && !filename && (
            <span className="text-slate-500 text-xs ml-2 uppercase">{language}</span>
          )}
          {streaming && (
            <span className="ml-2 flex items-center gap-1 text-xs text-slate-500">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating…
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Built-in copy button */}
          <button
            onClick={handleCopy}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors',
              copied ? variantBtn.success : variantBtn.default,
            ].join(' ')}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>

          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.loading}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50',
                variantBtn[action.variant ?? 'default'],
              ].join(' ')}
            >
              {action.loading ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code body */}
      {highlightedHtml ? (
        <div
          className={[
            'code-block',
            streaming ? 'streaming-cursor' : '',
          ].join(' ')}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre
          className={[
            'code-block',
            streaming ? 'streaming-cursor' : '',
          ].join(' ')}
        >
          {code}
        </pre>
      )}
    </div>
  );
}
