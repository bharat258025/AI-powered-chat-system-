import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { ArrowUp, Globe, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4002";

function Promt({ selectedChatId }) {
  const [inputValue, setInputValue] = useState("");
  const [typeMessage, setTypeMessage] = useState("");
  const [promt, setPromt] = useState([]);
  const [loading, setLoading] = useState(false);

  const promtEndRef = useRef();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const chatsKey = useMemo(() => (user?._id ? `chatSessions_${user._id}` : null), [user?._id]);

  useEffect(() => {
    if (!chatsKey || !selectedChatId) return setPromt([]);
    const chats = JSON.parse(localStorage.getItem(chatsKey) || "[]");
    setPromt(chats.find((chat) => chat.id === selectedChatId)?.messages || []);
  }, [chatsKey, selectedChatId]);

  useEffect(() => {
    promtEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [promt, loading]);

  const updateChatMessages = (messages, fallbackTitle) => {
    if (!chatsKey || !selectedChatId) return;
    const storedChats = JSON.parse(localStorage.getItem(chatsKey) || "[]");
    const nextChats = storedChats.map((chat) => {
      if (chat.id !== selectedChatId) return chat;
      const derivedTitle = chat.title && chat.title !== "New Chat" ? chat.title : (fallbackTitle || "New Chat").slice(0, 36);
      return { ...chat, title: derivedTitle, messages, updatedAt: new Date().toISOString() };
    });
    localStorage.setItem(chatsKey, JSON.stringify(nextChats));
    setPromt(messages);
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage = { role: "user", content: trimmed };
    setInputValue("");
    setTypeMessage(trimmed);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_URL}/api/v1/deepseekai/promt`,
        { content: trimmed, chatId: selectedChatId || "" },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      updateChatMessages([...promt, userMessage, { role: "assistant", content: data.reply }], trimmed);
    } catch (error) {
      updateChatMessages([...promt, userMessage, { role: "assistant", content: "Something went wrong with the AI response." }], trimmed);
    } finally {
      setLoading(false);
      setTypeMessage("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-between flex-1 w-full px-4 pb-4 md:pb-8">
      <div className="w-full max-w-4xl flex-1 overflow-y-auto mt-4 mb-4 space-y-4 max-h-[72vh] px-1 pr-2 [scrollbar-width:thin] [scrollbar-color:#4b5563_#1f2937] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1f2937] [&::-webkit-scrollbar-thumb]:bg-[#4b5563] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#6b7280]">
        {promt.map((msg, index) => (
          <div key={index} className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" ? (
              <div className="w-full bg-[#232323] text-white rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter style={codeTheme} language={match[1]} PreTag="div" className="rounded-lg mt-2" {...props}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-gray-800 px-1 py-0.5 rounded" {...props}>{children}</code>
                    );
                  },
                }}>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="w-[50%] md:w-[30%] bg-blue-600 text-white rounded-xl px-4 py-3 text-sm whitespace-pre-wrap self-start">{msg.content}</div>
            )}
          </div>
        ))}

        {loading && typeMessage && <div className="whitespace-pre-wrap px-4 py-3 rounded-2xl text-sm break-words bg-blue-600 text-white self-end ml-auto max-w-[50%] md:max-w-[40%]">{typeMessage}</div>}
        {loading && <div className="flex justify-start w-full"><div className="bg-[#2f2f2f] text-white px-4 py-3 rounded-xl text-sm animate-pulse">Loading...</div></div>}
        <div ref={promtEndRef} />
      </div>

      <div className="w-full max-w-4xl relative mt-auto">
        <div className="bg-[#2f2f2f] rounded-[2rem] px-4 md:px-6 py-6 md:py-8 shadow-md">
          <input type="text" placeholder="Message DeepSeek" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} className="bg-transparent w-full text-white placeholder-gray-400 text-base md:text-lg outline-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-4">
            <div className="flex gap-2 flex-wrap">
              <button className="flex items-center gap-2 border border-gray-500 text-white text-sm md:text-base px-3 py-1.5 rounded-full hover:bg-gray-600 transition"><Bot className="w-4 h-4" />DeepThink (R1)</button>
              <button className="flex items-center gap-2 border border-gray-500 text-white text-sm md:text-base px-3 py-1.5 rounded-full hover:bg-gray-600 transition"><Globe className="w-4 h-4" />Search</button>
            </div>
            <div className="flex items-center gap-2 ml-auto"><button onClick={handleSend} className="bg-gray-500 hover:bg-blue-600 p-2 rounded-full text-white transition"><ArrowUp className="w-4 h-4" /></button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Promt;
