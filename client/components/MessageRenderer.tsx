interface MessageRendererProps {
  content: string;
  role: "user" | "assistant";
  isStreaming?: boolean;
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

  // Check if content contains code blocks (```code```)
  const hasCodeBlock = /```[\s\S]*?```/.test(content);
  const isCodeBlock = content.trim().startsWith("```") && content.trim().endsWith("```");

  if (isCodeBlock || hasCodeBlock) {
    // Handle code blocks
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index).trim();
        if (textBefore) {
          parts.push(
            <p key={`text-${lastIndex}`} className="mb-4 leading-relaxed text-white/90">
              {textBefore}
            </p>
          );
        }
      }

      const lang = match[1] || "";
      const code = match[2].trim();

      parts.push(
        <div
          key={`code-${match.index}`}
          className="my-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-lg"
        >
          {lang && (
            <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 px-4 py-2 text-xs font-mono text-orange-300 border-b border-white/10 font-semibold">
              {lang}
            </div>
          )}
          <pre className="p-5 overflow-x-auto">
            <code className="font-mono text-sm leading-relaxed text-white/90">
              {code}
            </code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex).trim();
      if (remaining) {
        parts.push(
          <p key={`text-end`} className="mt-4 leading-relaxed text-white/90">
            {remaining}
          </p>
        );
      }
    }

    return (
      <div className="space-y-3">
        {parts}
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-white/50 ml-1 animate-pulse" />
        )}
      </div>
    );
  }

  // Plain text rendering with better spacing for long text
  const lines = content.split("\n");
  const hasLongText = content.length > 150;

  return (
    <div className={`text-white/90 ${hasLongText ? "space-y-2" : ""} leading-relaxed whitespace-pre-wrap break-words`}>
      {hasLongText ? (
        lines.map((line, idx) => (
          <div key={idx} className={line.trim() === "" ? "h-2" : ""}>
            {line || " "}
          </div>
        ))
      ) : (
        content
      )}
      {isStreaming && (
        <span className="inline-block w-2 h-5 bg-white/50 ml-1 animate-pulse" />
      )}
    </div>
  );
}
