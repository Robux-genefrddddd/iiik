export function TypingIndicator() {
  return (
    <div
      className="rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2"
      style={{
        backgroundColor: "#111418",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="flex gap-1.5 items-end">
        <div
          className="w-2 h-2 rounded-full bg-white/60 animate-threeDotPulse"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-white/60 animate-threeDotPulse"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-white/60 animate-threeDotPulse"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}
