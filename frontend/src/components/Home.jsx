import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Promt from "./Promt";
import { Menu } from "lucide-react";

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?._id) return;

    const selectedKey = `selectedChat_${user._id}`;
    const chatsKey = `chatSessions_${user._id}`;

    const savedSelected = localStorage.getItem(selectedKey);
    const savedChats = JSON.parse(localStorage.getItem(chatsKey) || "[]");

    if (savedSelected && savedChats.some((chat) => chat.id === savedSelected)) {
      setSelectedChatId(savedSelected);
      return;
    }

    if (savedChats.length > 0) {
      setSelectedChatId(savedChats[0].id);
      localStorage.setItem(selectedKey, savedChats[0].id);
      return;
    }

    const initialChat = {
      id: `chat_${Date.now()}`,
      title: "New Chat",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(chatsKey, JSON.stringify([initialChat]));
    localStorage.setItem(selectedKey, initialChat.id);
    setSelectedChatId(initialChat.id);
  }, []);

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[#232327] transition-transform z-40
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:relative md:flex-shrink-0`}
      >
        <Sidebar
          onClose={() => setIsSidebarOpen(false)}
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
        />
      </div>

      <div className="flex-1 flex flex-col w-full md:ml-64">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="text-xl font-bold">deepseek</div>
          <button onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-2 sm:px-6">
          <Promt selectedChatId={selectedChatId} />
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Home;
