import ChatInterface from "@/components/chat-interface"

export default function AIAssistantPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold text-center mb-4">AI Disaster Assistant</h1>
        <p className="text-muted-foreground text-center mb-8 max-w-xl">
          Ask any disaster-related questions or get guidance during emergencies. Our AI assistant is here to help.
        </p>

        <div className="w-full flex justify-center">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}
