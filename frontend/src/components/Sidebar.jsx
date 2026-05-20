import React, { useEffect, useMemo, useState } from "react";
import { LogOut, X, User, Pencil, Trash2, Check } from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4002";

function Sidebar({ onClose, selectedChatId, onSelectChat }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [, setAuthUser] = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [chats, setChats] = useState([]);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const chatsKey = useMemo(() => (user?._id ? `chatSessions_${user._id}` : null), [user?._id]);

  useEffect(() => {
    if (!chatsKey) return;
    const syncChats = () => {
      const stored = JSON.parse(localStorage.getItem(chatsKey) || "[]");
      setChats(stored.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")));
    };
    syncChats();
    window.addEventListener("storage", syncChats);
    const interval = setInterval(syncChats, 400);
    return () => {
      window.removeEventListener("storage", syncChats);
      clearInterval(interval);
    };
  }, [chatsKey]);

  const handleLogout = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/v1/user/logout`, { withCredentials: true });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setAuthUser(null);
      alert(data.message);
      navigate("/login");
    } catch (error) {
      alert(error?.response?.data?.errors || "Logout Failed");
    }
  };

  const handleNewChat = () => {
    if (!user?._id) return;
    const nextChat = { id: `chat_${Date.now()}`, title: "New Chat", messages: [], updatedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem(chatsKey) || "[]");
    const updated = [nextChat, ...existing];
    localStorage.setItem(chatsKey, JSON.stringify(updated));
    localStorage.setItem(`selectedChat_${user._id}`, nextChat.id);
    setChats(updated);
    onSelectChat(nextChat.id);
  };

  const handleSelect = (id) => {
    if (!user?._id) return;
    localStorage.setItem(`selectedChat_${user._id}`, id);
    onSelectChat(id);
    if (onClose) onClose();
  };

  const updateChatsInStorage = (nextChats) => {
    localStorage.setItem(chatsKey, JSON.stringify(nextChats));
    setChats([...nextChats].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")));
  };

  const handleSaveRename = (chatId) => {
    const cleanTitle = editingTitle.trim();
    if (!cleanTitle) return;
    const existing = JSON.parse(localStorage.getItem(chatsKey) || "[]");
    const nextChats = existing.map((chat) =>
      chat.id === chatId ? { ...chat, title: cleanTitle.slice(0, 60), updatedAt: new Date().toISOString() } : chat
    );
    updateChatsInStorage(nextChats);
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleDeleteChat = (chatId) => {
    const existing = JSON.parse(localStorage.getItem(chatsKey) || "[]");
    const nextChats = existing.filter((chat) => chat.id !== chatId);
    updateChatsInStorage(nextChats);
    if (!user?._id) return;

    if (selectedChatId === chatId) {
      const nextSelected = nextChats[0]?.id || null;
      if (nextSelected) localStorage.setItem(`selectedChat_${user._id}`, nextSelected);
      else localStorage.removeItem(`selectedChat_${user._id}`);
      onSelectChat(nextSelected);
    }

    const token = localStorage.getItem("token");
    axios.delete(`${API_URL}/api/v1/deepseekai/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    }).catch(() => {});
  };

  return (
    <div className="h-full flex flex-col justify-between p-4">
      <div>
        <div className="flex border-b border-gray-600 p-2 justify-between items-center mb-4">
          <div className="text-2xl font-bold text-gray-200">deepseek</div>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400 md:hidden" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2">
          <button onClick={handleNewChat} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl mb-2">+ New Chat</button>
          {chats.length === 0 ? (
            <div className="text-gray-500 text-sm mt-16 text-center">No chat history yet</div>
          ) : chats.map((chat) => (
            <div key={chat.id} className={`w-full px-2 py-2 rounded-lg text-sm transition ${selectedChatId === chat.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              <div className="flex items-center gap-2">
                {editingChatId === chat.id ? (
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(chat.id);
                    if (e.key === "Escape") { setEditingChatId(null); setEditingTitle(""); }
                  }} autoFocus className="flex-1 bg-[#1f1f1f] border border-gray-500 rounded px-2 py-1 text-white outline-none" />
                ) : (
                  <button onClick={() => handleSelect(chat.id)} className="flex-1 text-left truncate" title={chat.title || "New Chat"}>{chat.title || "New Chat"}</button>
                )}
                {editingChatId === chat.id ? (
                  <button onClick={() => handleSaveRename(chat.id)} className="text-green-400 hover:text-green-300" title="Save name"><Check className="w-4 h-4" /></button>
                ) : (
                  <button onClick={() => { setEditingChatId(chat.id); setEditingTitle(chat.title || "New Chat"); }} className="text-gray-300 hover:text-white" title="Rename chat"><Pencil className="w-4 h-4" /></button>
                )}
                <button onClick={() => handleDeleteChat(chat.id)} className="text-red-400 hover:text-red-300" title="Delete chat"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-1 border-t border-gray-600 relative">
        <button onClick={() => setShowProfile((prev) => !prev)} className="w-full flex items-center gap-2 cursor-pointer my-3 text-left">
          <img src="https://i.pravatar.cc/32" alt="profile" className="rounded-full w-8 h-8" />
          <span className="text-gray-300 font-bold">{user ? user?.firstName : "My Profile"}</span>
        </button>
        {showProfile && user && (
          <div className="absolute bottom-14 left-0 right-0 bg-[#2f2f2f] border border-gray-600 rounded-lg p-3 text-sm">
            <div className="flex items-start justify-between gap-2 text-gray-200">
              <div className="flex items-start gap-2"><User className="w-4 h-4 mt-0.5" /><div><p className="font-semibold">{`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}</p><p className="text-gray-400 break-all">{user?.email || "No email found"}</p></div></div>
              <button onClick={() => setShowProfile(false)} className="text-gray-300 hover:text-white" title="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {user && <button onClick={handleLogout} className="w-full flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 duration-300 transition"><LogOut />Logout</button>}
      </div>
    </div>
  );
}

export default Sidebar;
