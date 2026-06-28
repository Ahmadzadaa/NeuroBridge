"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AI_TOOLS } from "@/lib/constants";
import { Bot, Send } from "lucide-react";

interface AiToolsPageClientProps {
  userName: string;
}

export function AiToolsPageClient({ userName }: AiToolsPageClientProps) {
  const t = useTranslations("participant.aiTools");
  const ta = useTranslations("tenant.aiTools");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend(tool: string) {
    if (!message.trim()) return;
    setLoading(true);
    const userMsg = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, message: userMsg.content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response || "AI response placeholder" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "AI service unavailable. Configure ANTHROPIC_API_KEY." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <Tabs defaultValue={AI_TOOLS[0]}>
        <TabsList className="rounded-xl flex-wrap h-auto">
          {AI_TOOLS.map((tool) => (
            <TabsTrigger key={tool} value={tool}>
              <Bot className="mr-1 h-4 w-4" />
              {ta(tool)}
            </TabsTrigger>
          ))}
        </TabsList>

        {AI_TOOLS.map((tool) => (
          <TabsContent key={tool} value={tool}>
            <Card className="mt-4 rounded-2xl border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  {ta(tool)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-h-96 space-y-3 overflow-y-auto rounded-xl bg-muted/30 p-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Start a conversation with {ta(tool)}
                    </p>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-3 text-sm ${
                          msg.role === "user"
                            ? "ml-8 bg-primary/10"
                            : "mr-8 bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("chatPlaceholder")}
                    className="rounded-xl"
                    onKeyDown={(e) => e.key === "Enter" && handleSend(tool)}
                  />
                  <Button
                    onClick={() => handleSend(tool)}
                    disabled={loading}
                    className="rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
