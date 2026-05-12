import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Send, Sparkles } from "lucide-react";
import { chatHistory } from "@/data/mockData";

// TODO: replace with streaming endpoint backed by LLM (e.g. /api/b2c/chat)
// using GraphRAG over the plant knowledge base + uploaded image embeddings.
export function CognitiveAssistant() {
  const [messages, setMessages] = useState(chatHistory);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Got it. I've cross-checked your plant against 12k similar cases. Adjusting your care plan now.",
          tags: ["Plan updated", "Confidence: 88%"],
        },
      ]);
      setThinking(false);
    }, 1100);
  };

  return (
    <Card className="flex h-[560px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-secondary/50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Cognitive Assistant</div>
        <Badge variant="secondary" className="ml-auto text-xs">beta</Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "assistant"
                ? "bg-secondary text-secondary-foreground"
                : "ml-auto bg-primary text-primary-foreground"
            }`}
          >
            <div>{m.text}</div>
            {m.tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div className="text-xs text-muted-foreground">Diagnosing image…</div>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => send("📷 Uploaded photo of yellowing leaves")}
            title="Upload photo"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Ask about your plant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
          />
          <Button onClick={() => send(input)} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
