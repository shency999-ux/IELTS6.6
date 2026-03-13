export type ModuleType = 'listening' | 'speaking' | 'reading' | 'writing' | 'vocabulary' | 'grammar' | 'dashboard';

export interface Channel {
  channel_id: string;
  channel_name_cn: string;
  channel_name_en: string;
  parent_id: string | null;
  target_words: number;
  description: string;
  recommended_order: number;
}

export interface LearningMaterial {
  id: string;
  type: ModuleType;
  subType?: 'word' | 'phrase'; // For vocabulary categorization
  channel_id?: string; // For hierarchical vocabulary
  mastery_score?: number; // 0-1
  last_seen?: number;
  next_review_at?: number;
  streak?: number;
  title: string;
  content?: string; // Text content or description
  fileUrl?: string; // For audio, images, or documents
  fileName?: string;
  fileType?: string;
  duration?: string; // For audio/video materials
  createdAt: number;
  tags?: string[];
  associations?: string[];
  phonetic?: string;
  chinese?: string;
  partOfSpeech?: string;
  plural?: string;
  pastTense?: string;
  phrases?: string[];
  examples?: string[];
  isEnriching?: boolean;
}

export interface WordItem {
  word: string;
  definition?: string;
  example?: string;
  count: number;
  lastSeen: number;
}

export interface AppState {
  materials: LearningMaterial[];
  vocabulary: WordItem[];
  activeModule: ModuleType;
}
