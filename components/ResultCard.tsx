import React, { useState } from 'react';
import { DictionaryEntry, ChatMessage } from '../types';
import { playTTS, sendChatMessage } from '../services/geminiService';
import { Spinner } from './Spinner';

interface ResultCardProps {
  data: DictionaryEntry;
  onSave: (entry: DictionaryEntry) => void;
  isSaved: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, onSave, isSaved }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleAudio = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    await playTTS(text);
    setIsPlayingAudio(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const newUserMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const responseText = await sendChatMessage(chatHistory, chatInput, data.term);
      const newModelMsg: ChatMessage = { role: 'model', text: responseText };
      setChatHistory(prev => [...prev, newModelMsg]);
    } catch (err) {
        console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-2xl mx-auto mb-24 border border-indigo-50">
      {/* Image Header */}
      <div className="relative h-64 w-full bg-indigo-100 flex items-center justify-center overflow-hidden">
        {data.imageUrl ? (
          <img src={data.imageUrl} alt={data.term} className="w-full h-full object-cover" />
        ) : (
          <div className="text-indigo-300 text-6xl">📷</div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            {data.term}
            <button 
                onClick={() => handleAudio(data.term)}
                className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/40 transition"
            >
              🔊
            </button>
          </h1>
        </div>
        <button 
            onClick={() => onSave(data)}
            className={`absolute top-4 right-4 p-3 rounded-full shadow-lg transition ${isSaved ? 'bg-yellow-400 text-white' : 'bg-white text-gray-400 hover:text-yellow-400'}`}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Definitions */}
        <div className="space-y-2">
            <div className="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                <p className="text-lg text-indigo-900 font-medium">{data.definitionEnglish}</p>
            </div>
            <p className="text-gray-500 italic px-4">{data.definitionMandarin}</p>
        </div>

        {/* Usage Note */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <h3 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
                <span>💡</span> Quick Note
            </h3>
            <p className="text-amber-900 text-sm leading-relaxed">{data.usageNote}</p>
        </div>

        {/* Examples */}
        <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Examples</h3>
            <div className="space-y-4">
                {data.examples.map((ex, idx) => (
                    <div key={idx} className="group relative pl-4 border-l-2 border-gray-200 hover:border-indigo-400 transition">
                        <p className="text-gray-800 font-medium flex items-start justify-between">
                            "{ex.english}"
                            <button onClick={() => handleAudio(ex.english)} className="opacity-0 group-hover:opacity-100 text-indigo-500 ml-2">🔊</button>
                        </p>
                        <p className="text-gray-500 text-sm mt-1">{ex.mandarin}</p>
                    </div>
                ))}
            </div>
        </div>

        <hr className="border-gray-100"/>

        {/* Chat Section */}
        <div className="space-y-4">
             <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ask AI about "{data.term}"</h3>
             
             <div className="max-h-60 overflow-y-auto space-y-3 no-scrollbar">
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
             </div>

             <div className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Is this formal?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button 
                    disabled={isChatLoading}
                    onClick={handleSendChat}
                    className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isChatLoading ? <Spinner /> : (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                        </svg>
                    )}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};
