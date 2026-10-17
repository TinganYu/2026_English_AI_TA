export interface DialogueLine {
  id: string;
  speaker: 'Alex' | 'Emma' | string;
  voice: 'Puck' | 'Kore' | string;
  avatar: string;
  text: string;
  chineseText: string;
  audioNotes?: string;
  highlightWords?: string[];
}

export interface VocabularyItem {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  chineseMeaning: string;
  exampleSentence: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DialogueScript {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  level: string;
  characters: {
    Alex: {
      name: string;
      role: string;
      voice: string;
      avatarColor: string;
      habitSummary: string;
    };
    Emma: {
      name: string;
      role: string;
      voice: string;
      avatarColor: string;
      habitSummary: string;
    };
  };
  lines: DialogueLine[];
  vocabulary: VocabularyItem[];
  quiz: QuizQuestion[];
}
