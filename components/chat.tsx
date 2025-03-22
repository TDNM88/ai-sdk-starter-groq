"use client";

import { modelID } from "@/ai/providers";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { ModelPicker } from "./model-picker";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { Header } from "./header";

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
}

const ChatInput = ({ onSend }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSend = async (message: string, file?: File) => {
    try {
      const formData = new FormData();
      formData.append('message', message);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      onSend(message, file || undefined);
      setMessage('');
      setFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="p-2 border rounded"
      />
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 p-2 border rounded"
        onKeyPress={(e) => e.key === 'Enter' && handleSend(message, file || undefined)}
      />
      <button 
        onClick={() => handleSend(message, file || undefined)} 
        className="p-2 bg-blue-500 text-white rounded"
      >
        Gửi
      </button>
    </div>
  );
};

export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<modelID>("deepseek-r1-distill-llama-70b");
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    status,
    stop,
    append,
  } = useChat({
    maxSteps: 5,
    body: {
      selectedModel,
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const sendMessage = (input: string) => {
    append({ role: "user", content: input });
  };

  if (error) return <div>{error.message}</div>;

  return (
    <div className="h-dvh flex flex-col justify-center w-full stretch">
      <Header />
      <ModelPicker selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
      {messages.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview />
        </div>
      ) : (
        <Messages messages={messages} isLoading={isLoading} status={status} />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
          handleSubmit(e);
        }}
        className="pb-8 bg-white dark:bg-black w-full max-w-xl mx-auto px-4 sm:px-0"
      >
        <Textarea
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleInputChange={handleInputChange}
          input={input}
          isLoading={isLoading}
          status={status}
          stop={stop}
        />
      </form>
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
