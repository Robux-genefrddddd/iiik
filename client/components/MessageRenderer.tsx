import { Copy, Check } from "lucide-react";
import { useState, ReactNode } from "react";

interface MessageRendererProps {
  content: string;
  role: "user" | "assistant";
  isStreaming?: boolean;
}

function CodeBlockWithCopy({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-orange-500/10 px-4 py-3 border-b border-white/10">
        <span className="text-xs font-mono text-orange-300 font-semibold uppercase tracking-wide">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-all duration-200 hover:shadow-md"
          title="Copier le code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span>Copié!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto">
        <code className="font-mono text-sm leading-relaxed text-white/90 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

function parseMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  // Code blocks: ```language\ncode```
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push(
          <div key={`text-${lastIndex}`} className="mb-3 leading-relaxed text-white/90 whitespace-pre-wrap">
            {textBefore}
          </div>
        );
      }
    }

    const language = match[1] || "";
    const code = match[2].trim();

    parts.push(
      <CodeBlockWithCopy key={`code-${match.index}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim();
    if (remaining) {
      parts.push(
        <div key="text-end" className="mt-2 leading-relaxed text-white/90 whitespace-pre-wrap">
          {remaining}
        </div>
      );
    }
  }

  return parts.length > 0
    ? parts
    : [
        <div key="default" className="leading-relaxed text-white/90 whitespace-pre-wrap">
          {text}
        </div>,
      ];
}

export function MessageRenderer({
  content,
  role,
  isStreaming = false,
}: MessageRendererProps) {
  // Check if content is an image URL
  const imageUrlPattern = /^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)$/i;
  const isImageUrl = imageUrlPattern.test(content.trim());

  if (isImageUrl) {
    return (
      <div className="flex justify-center">
        <div className="rounded-3xl overflow-hidden border-2 border-white/20 shadow-lg max-w-xs">
          <img
            src={content}
            alt="Message content"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    );
  }

  // Parse and render markdown-like content
  const parsedContent = parseMarkdown(content);

  return (
    <div className="space-y-2 text-white/90">
      {parsedContent}
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-white/50 ml-1 animate-pulse" />
      )}
    </div>
  );
}
