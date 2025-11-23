export enum ViewState {
  SEARCH = 'SEARCH',
  NOTEBOOK = 'NOTEBOOK',
  FLASHCARDS = 'FLASHCARDS',
  STORY = 'STORY'
}

export interface Example {
  english: string;
  mandarin: string;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  context?: string;
  definitionEnglish: string;
  definitionMandarin: string;
  examples: Example[];
  usageNote: string;
  imageUrl?: string; // Base64 data URI
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FlashcardProps {
  entry: DictionaryEntry;
  onNext: () => void;
}
