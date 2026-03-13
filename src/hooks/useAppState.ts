import { useState, useEffect } from 'react';
import { AppState, LearningMaterial, ModuleType, WordItem } from '../types';

const STORAGE_KEY = 'english_study_assistant_data';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state', e);
      }
    }
    return {
      materials: [],
      vocabulary: [],
      activeModule: 'dashboard',
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Migration: Fix vocabulary items that have separator in title
  useEffect(() => {
    setState(prev => {
      let changed = false;
      const newMaterials = prev.materials.map(m => {
        if (m.type === 'vocabulary') {
          const separator = m.title.includes(':') ? ':' : (m.title.includes('-') ? '-' : null);
          if (separator) {
            const [t, ...c] = m.title.split(separator);
            const titleText = t.trim();
            const contentText = c.join(separator).trim();
            
            // If we found a separator, we should always split it to ensure 
            // English is on front and Chinese is on back.
            changed = true;
            // If it has spaces, it's likely a phrase
            const isPhrase = titleText.includes(' ');
            return {
              ...m,
              title: titleText,
              content: contentText || m.content, // Use split content if available, otherwise keep existing
              subType: m.subType || (isPhrase ? 'phrase' : 'word'),
              mastery_score: m.mastery_score ?? 0,
              streak: m.streak ?? 0,
              last_seen: m.last_seen ?? Date.now(),
              next_review_at: m.next_review_at ?? Date.now()
            };
          }
        }
        return m;
      });
      
      if (changed) {
        return { ...prev, materials: newMaterials };
      }
      return prev;
    });
  }, []);

  const addMaterial = (material: Omit<LearningMaterial, 'id' | 'createdAt'>) => {
    const newMaterial: LearningMaterial = {
      ...material,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      mastery_score: material.mastery_score ?? 0,
      streak: material.streak ?? 0,
      last_seen: material.last_seen ?? Date.now(),
      next_review_at: material.next_review_at ?? Date.now()
    };
    setState(prev => ({
      ...prev,
      materials: [newMaterial, ...prev.materials],
    }));
    
    // Extract words if it's text content
    if (material.content) {
      updateVocabularyFromText(material.content);
    }

    return newMaterial;
  };

  const batchAddMaterials = (materials: Omit<LearningMaterial, 'id' | 'createdAt'>[]) => {
    const newMaterials: LearningMaterial[] = materials.map(m => ({
      ...m,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      mastery_score: m.mastery_score ?? 0,
      streak: m.streak ?? 0,
      last_seen: m.last_seen ?? Date.now(),
      next_review_at: m.next_review_at ?? Date.now()
    }));
    
    setState(prev => ({
      ...prev,
      materials: [...newMaterials, ...prev.materials],
    }));
  };

  const deleteMaterial = (id: string) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== id),
    }));
  };

  const updateMaterial = (id: string, updates: Partial<LearningMaterial>) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  };

  const updateVocabularyFromText = (text: string) => {
    const words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    setState(prev => {
      const newVocab = [...prev.vocabulary];
      words.forEach(word => {
        const index = newVocab.findIndex(v => v.word === word);
        if (index > -1) {
          newVocab[index] = {
            ...newVocab[index],
            count: newVocab[index].count + 1,
            lastSeen: Date.now(),
          };
        } else {
          newVocab.push({
            word,
            count: 1,
            lastSeen: Date.now(),
          });
        }
      });
      return { ...prev, vocabulary: newVocab };
    });
  };

  const setActiveModule = (module: ModuleType) => {
    setState(prev => ({ ...prev, activeModule: module }));
  };

  const getDashboardStats = () => {
    const vocab = state.materials.filter(m => m.type === 'vocabulary');
    const total_target_words = 8000;
    const words_added_total = vocab.length;
    const words_learned = vocab.filter(m => (m.mastery_score ?? 0) > 0).length;
    const words_mastered = vocab.filter(m => (m.mastery_score ?? 0) >= 0.8).length;
    const now = Date.now();
    const words_in_review = vocab.filter(m => (m.next_review_at ?? 0) <= now && (m.mastery_score ?? 0) > 0).length;
    
    const completion_rate = (words_mastered / total_target_words) * 100;
    const coverage_rate = (words_added_total / total_target_words) * 100;

    return {
      total_target_words,
      words_added_total,
      words_learned,
      words_mastered,
      words_in_review,
      completion_rate,
      coverage_rate
    };
  };

  return {
    state,
    addMaterial,
    batchAddMaterials,
    deleteMaterial,
    updateMaterial,
    setActiveModule,
    getDashboardStats
  };
}
