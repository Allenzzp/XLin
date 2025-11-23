import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import { playTTS } from '../services/geminiService';

interface Props {
  entry: DictionaryEntry;
  total: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export const Flashcard: React.FC<Props> = ({ entry, total, currentIndex, onNext, onPrev }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);

  // Play audio but prevent flip if clicking the speaker
  const handleAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playTTS(text);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto p-6">
        <div className="mb-4 text-gray-500 font-medium tracking-widest text-xs">
            CARD {currentIndex + 1} / {total}
        </div>
      <div 
        className="group w-full h-96 cursor-pointer card-perspective"
        onClick={handleFlip}
      >
        <div className={`card-inner relative w-full h-full shadow-xl rounded-3xl transition-transform duration-700 ${isFlipped ? 'card-flipped' : ''}`}>
          
          {/* Front */}
          <div className="card-face bg-white border border-indigo-50">
             {entry.imageUrl && (
                 <div className="absolute top-0 left-0 w-full h-1/2 rounded-t-3xl overflow-hidden">
                     <img src={entry.imageUrl} className="w-full h-full object-cover opacity-80" />
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
                 </div>
             )}
             <div className="z-10 flex flex-col items-center mt-12">
                <h2 className="text-4xl font-bold text-indigo-900 mb-4 text-center px-4">{entry.term}</h2>
                <p className="text-gray-400 text-sm">Tap to flip</p>
             </div>
             <button 
                onClick={(e) => handleAudio(e, entry.term)}
                className="absolute bottom-6 p-3 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition z-20"
             >
                🔊
             </button>
          </div>

          {/* Back */}
          <div className="card-back card-face bg-indigo-600 text-white">
             <div className="p-6 overflow-y-auto no-scrollbar w-full flex flex-col gap-4">
                 <div>
                    <h3 className="text-indigo-200 text-xs font-bold uppercase mb-1">Definition</h3>
                    <p className="text-lg font-medium">{entry.definitionEnglish}</p>
                 </div>
                 <hr className="border-indigo-500/50" />
                 <div>
                    <h3 className="text-indigo-200 text-xs font-bold uppercase mb-1">Meaning (CN)</h3>
                    <p className="text-base opacity-90">{entry.definitionMandarin}</p>
                 </div>
                 <div className="bg-indigo-700/50 p-3 rounded-xl mt-2">
                    <p className="text-sm italic">"{entry.examples[0].english}"</p>
                 </div>
             </div>
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6 mt-8">
        <button onClick={onPrev} className="p-4 rounded-full bg-white shadow text-indigo-600 hover:bg-gray-50">
            ←
        </button>
        <button onClick={onNext} className="p-4 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 text-white hover:bg-indigo-700">
            Next Card →
        </button>
      </div>
    </div>
  );
};
