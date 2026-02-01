# Agent Feature - Work in Progress

## Status: On Hold

The agent chat feature is partially implemented but not functioning. Committing current work for future reference.

## What's Implemented

### UI Components
- ✅ Agent setup card with provider/model selection (OpenAI, Anthropic, Groq, Gemini)
- ✅ API key management stored in database (`user_agent_keys` table)
- ✅ Pre-styled chat interface from assistant-ui (Thread component)
- ✅ Auto-save API keys on input

### Backend/Runtime
- ✅ Database migration for API key storage
- ✅ RLS policies for user isolation
- ✅ RAG system with document search (`docs/` markdown files)
- ✅ SQL query execution via `execute_readonly_query` function
- ✅ AI SDK integration with provider setup:
  - `@ai-sdk/openai`
  - `@ai-sdk/anthropic`
  - `@ai-sdk/google`
  - Groq via OpenAI-compatible endpoint

## What's Not Working

### Streaming Issue
The AI SDK `streamText` call completes immediately with 0 chunks. Debug logs show:
```
ChatAdapter.run called with X messages
Calling streamText with {provider: 'gemini', modelName: 'gemini-1.5-flash', messagesCount: X}
Streaming complete. Total chunks: 0
```

The `textStream` async iterator exits immediately without yielding any chunks.

### Possible Causes
1. Model configuration issue (incorrect model names for providers)
2. API key format/validation problem
3. AI SDK async generator pattern incompatibility with assistant-ui
4. Missing error handling causing silent failures

## Key Files

### Runtime Implementation
- `src/lib/agent/ai-sdk-runtime.ts` - AI SDK integration with providers
- `src/lib/agent/runtime.ts` - Old custom implementation (not used)
- `src/lib/agent/client.ts` - Legacy client code (not used)
- `src/lib/agent/docs.ts` - RAG document search
- `src/lib/agent/sql.ts` - Database query execution

### UI Components
- `src/components/Agent/AgentView.tsx` - Main agent page
- `src/components/assistant-ui/thread.tsx` - Chat interface (from assistant-ui CLI)

### Database
- `supabase/migrations/20260131000000_add_user_agent_keys.sql` - API key storage
- `supabase/migrations/20260131000001_add_readonly_query_function.sql` - SQL execution

### Configuration
- Model names in `ai-sdk-runtime.ts`:
  - OpenAI: `gpt-4o-mini`
  - Anthropic: `claude-3-5-sonnet-20241022`
  - Groq: `llama-3.3-70b-versatile`
  - Gemini: `gemini-1.5-flash`

## Next Steps (When Resuming)

1. **Test AI SDK in isolation** - Create a simple test script outside the app to verify AI SDK works with each provider
2. **Check API key validity** - Ensure keys are being passed correctly to AI SDK clients
3. **Try simpler integration** - Consider using assistant-ui's `useChatRuntime` from `@assistant-ui/react-ai-sdk` instead of custom adapter
4. **Add better error handling** - Wrap streamText in try-catch and log full error objects
5. **Verify model names** - Double-check current model names for each provider (they change frequently)

## Alternative Approaches to Consider

1. **Use API routes instead of client-side** - Move AI SDK calls to Next.js/Express API routes
2. **Use assistant-ui examples** - Copy working example from assistant-ui repository
3. **Simplify to single provider** - Start with just OpenAI working, then add others
4. **Skip streaming** - Use `generateText` instead of `streamText` for simpler debugging

## Dependencies Installed

```json
{
  "@ai-sdk/anthropic": "^1.0.8",
  "@ai-sdk/google": "^1.0.8",
  "@ai-sdk/openai": "^1.0.8",
  "@assistant-ui/react": "^0.12.3",
  "@assistant-ui/react-ai-sdk": "^1.3.3",
  "@assistant-ui/react-markdown": "^0.12.1",
  "ai": "^4.2.7"
}
```

## References

- [assistant-ui Documentation](https://www.assistant-ui.com/)
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
