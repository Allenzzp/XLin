import React, { useState, useEffect } from 'react';
import { ViewState, DictionaryEntry } from './types';
import { explainTerm, generateConceptImage, generateStoryFromList } from './services/geminiService';
import { ResultCard } from './components/ResultCard';
import { Flashcard } from './components/Flashcard';
import { Spinner } from './components/Spinner';

const LOCAL_STORAGE_KEY = 'canucklingo_notebook';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.SEARCH);
  const [notebook, setNotebook] = useState<DictionaryEntry[]>([]);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [context, setContext] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentResult, setCurrentResult] = useState<DictionaryEntry | null>(null);
  
  // Flashcard State
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  
  // Story State
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Load notebook on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setNotebook(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse notebook", e);
      }
    }
  }, []);

  // Save notebook on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notebook));
  }, [notebook]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setCurrentResult(null);
    
    try {
      // Parallel execution for Text and Image? 
      // Actually, better to get text first to get the imagePrompt from JSON, 
      // OR just use the term itself for image generation to speed it up.
      // Let's do strict sequence for high quality: Text -> Image
      
      const textData: any = await explainTerm(searchTerm, context);
      
      // Generate Image based on the AI's specific image prompt or the term
      const imagePrompt = textData.imagePrompt || searchTerm;
      const imageUrl = await generateConceptImage(imagePrompt);

      const entry: DictionaryEntry = {
        id: Date.now().toString(),
        term: searchTerm,
        context,
        timestamp: Date.now(),
        ...textData,
        imageUrl
      };
      
      setCurrentResult(entry);
    } catch (e) {
      alert("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSave = (entry: DictionaryEntry) => {
    const exists = notebook.find(n => n.term === entry.term);
    if (exists) {
      setNotebook(prev => prev.filter(n => n.term !== entry.term));
    } else {
      setNotebook(prev => [...prev, entry]);
    }
  };

  const handleGenerateStory = async () => {
    if (notebook.length === 0) return;
    setIsGeneratingStory(true);
    setStory(null);
    try {
      const terms = notebook.map(n => n.term);
      const result = await generateStoryFromList(terms);
      setStory(result);
      setView(ViewState.STORY);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // --- Render Views ---

  const renderSearch = () => (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4">
      <div className="text-center mb-8 mt-6">
        <h1 className="text-3xl font-bold text-indigo-900">CanuckLingo AI 🍁</h1>
        <p className="text-gray-500">Master North American English.</p>
      </div>

      <div className="w-full bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8 relative z-10">
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Term / Sentence</label>
                <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. Double-double"
                className="w-full text-lg p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none"
                />
            </div>
            
            <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Context (Optional)</label>
                <input 
                type="text" 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Ordering coffee"
                className="w-full text-sm p-3 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition outline-none"
                />
            </div>

            <button 
                onClick={handleSearch}
                disabled={isSearching || !searchTerm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition flex justify-center items-center shadow-lg shadow-indigo-200"
            >
                {isSearching ? <><Spinner /> Explaining...</> : 'Explain It'}
            </button>
        </div>
      </div>

      {currentResult && (
        <ResultCard 
            data={currentResult} 
            onSave={toggleSave} 
            isSaved={!!notebook.find(n => n.term === currentResult.term)}
        />
      )}
    </div>
  );

  const renderNotebook = () => (
    <div className="w-full max-w-2xl mx-auto p-4 pb-24">
        <div className="flex justify-between items-center mb-6 mt-6">
            <h2 className="text-2xl font-bold text-indigo-900">My Notebook ({notebook.length})</h2>
            <button 
                onClick={handleGenerateStory}
                disabled={notebook.length < 2 || isGeneratingStory}
                className="text-sm bg-pink-500 text-white px-4 py-2 rounded-full font-medium shadow-md hover:bg-pink-600 disabled:opacity-50 transition flex items-center gap-2"
            >
                {isGeneratingStory ? <Spinner /> : '✨ Story Mode'}
            </button>
        </div>

        {notebook.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
                <p className="text-6xl mb-4">📓</p>
                <p>Your notebook is empty.</p>
                <p className="text-sm">Save words from the search tab!</p>
            </div>
        ) : (
            <div className="space-y-4">
                {notebook.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <span className="flex h-full items-center justify-center">📝</span>}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800">{item.term}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{item.definitionEnglish}</p>
                        </div>
                        <button 
                            onClick={() => toggleSave(item)}
                            className="text-red-300 hover:text-red-500 p-2"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  const renderFlashcards = () => {
    if (notebook.length === 0) return (
        <div className="flex flex-col items-center justify-center h-screen text-gray-400">
            <p>Add words to your notebook to unlock flashcards!</p>
        </div>
    );

    const entry = notebook[flashcardIndex];
    
    return (
        <div className="h-screen w-full pt-4 pb-24 bg-indigo-50">
             <Flashcard 
                entry={entry} 
                total={notebook.length}
                currentIndex={flashcardIndex}
                onNext={() => setFlashcardIndex((prev) => (prev + 1) % notebook.length)}
                onPrev={() => setFlashcardIndex((prev) => (prev - 1 + notebook.length) % notebook.length)}
             />
        </div>
    );
  };

  const renderStory = () => (
    <div className="w-full max-w-2xl mx-auto p-6 pb-24">
        <button onClick={() => setView(ViewState.NOTEBOOK)} className="mb-4 text-indigo-500 flex items-center font-medium">
            ← Back to Notebook
        </button>
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">AI Generated Story</h2>
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-indigo-100 leading-loose text-lg text-gray-800">
            {/* Simple display since Markdown component is not available in imports */}
            <div className="whitespace-pre-wrap">{story || ''}</div>
        </div>
    </div>
  );

  // Simple Mock for Markdown rendering since we don't have the library installed in the prompt context
  // Replacing it with a simple div dangerously set inner html or just whitespace pre-wrap
  // We will use a simple whitespace-pre-wrap for now as `story` is just string.
  const StoryView = () => (
    <div className="w-full max-w-2xl mx-auto p-6 pb-24 mt-8">
         <button onClick={() => setView(ViewState.NOTEBOOK)} className="mb-6 text-indigo-600 font-bold flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-full w-fit">
            ← Back
        </button>
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-pink-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">A Tale from your Notebook</h2>
            <div className="prose prose-lg text-gray-700 whitespace-pre-wrap leading-loose">
                {story}
            </div>
        </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {view === ViewState.SEARCH && renderSearch()}
      {view === ViewState.NOTEBOOK && renderNotebook()}
      {view === ViewState.FLASHCARDS && renderFlashcards()}
      {view === ViewState.STORY && <StoryView />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <NavButton 
            active={view === ViewState.SEARCH} 
            onClick={() => setView(ViewState.SEARCH)} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>}
            label="Search"
        />
        <NavButton 
            active={view === ViewState.NOTEBOOK || view === ViewState.STORY} 
            onClick={() => setView(ViewState.NOTEBOOK)} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>}
            label="Notebook"
        />
        <NavButton 
            active={view === ViewState.FLASHCARDS} 
            onClick={() => setView(ViewState.FLASHCARDS)} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" /></svg>}
            label="Study"
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-600'}`}
    >
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
);

export default App;