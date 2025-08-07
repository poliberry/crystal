
import { PageContextProvider } from "@/components/providers/page-context-provider";

export default function ConversationsHome() {
  return (
    <PageContextProvider
      conversationData={{
        id: "home",
        name: "Conversations",
        type: "conversation",
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-2xl font-bold">Welcome to Conversations</h1>
        </div>
        <div className="p-4">
          <p>Start a new conversation or join an existing one.</p>
        </div>
      </div>
    </PageContextProvider>
  );
}