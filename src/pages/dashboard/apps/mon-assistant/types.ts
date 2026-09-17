export interface HistoryEntry {
  id: number;
  question: string;
  answer: string;
  date: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}