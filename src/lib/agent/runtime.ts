import { useEffect, useState } from 'react';
import type { ChatModelAdapter } from '@assistant-ui/react';
import type { AgentProvider } from './client';
import { createAgentReply } from './client';
import { searchDocChunks } from './docs';

export function useAgentRuntime(
  provider: AgentProvider,
  apiKey: string,
  model?: string
) {
  const [adapter, setAdapter] = useState<ChatModelAdapter | null>(null);

  useEffect(() => {
    if (!apiKey.trim()) {
      setAdapter(null);
      return;
    }

    const chatAdapter: ChatModelAdapter = {
      async run({ messages }) {
        // Get last user message for doc search
        const lastMessage = messages[messages.length - 1];
        const query = lastMessage?.content?.[0]?.type === 'text'
          ? lastMessage.content[0].text
          : '';

        // Search docs for context
        const context = query ? searchDocChunks(query, 6) : [];

        // Convert assistant-ui messages to agent format
        const agentMessages = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join('\n'),
          }));

        const response = await createAgentReply({
          provider,
          apiKey: apiKey.trim(),
          model,
          messages: agentMessages,
          context,
          enableSQL: true,
        });

        // Return in assistant-ui format
        return {
          content: [{ type: 'text', text: response.content }],
        };
      },
    };

    setAdapter(chatAdapter);
  }, [provider, apiKey, model]);

  return adapter;
}
