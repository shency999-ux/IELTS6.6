import { useState, useEffect } from 'react';
import { AppState, LearningMaterial, ModuleType } from '../types';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useAppState() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<AppState>({
    materials: [],
    vocabulary: [],
    activeModule: 'dashboard',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setState(prev => ({ ...prev, materials: [] }));
      return;
    }

    const q = query(
      collection(db, 'materials'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LearningMaterial[];
      
      setState(prev => ({ ...prev, materials }));
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const addMaterial = async (material: Omit<LearningMaterial, 'id' | 'createdAt'>) => {
    if (!user) return;
    
    const newMaterial = {
      ...material,
      uid: user.uid,
      createdAt: Date.now(),
      mastery_score: material.mastery_score ?? 0,
      streak: material.streak ?? 0,
      last_seen: material.last_seen ?? Date.now(),
      next_review_at: material.next_review_at ?? Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'materials'), newMaterial);
      
      // If it's vocabulary, sync to Feishu table
      if (newMaterial.type === 'vocabulary') {
        fetch('/api/feishu/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            word: newMaterial.title, 
            translation: (newMaterial as any).chinese || newMaterial.content 
          })
        }).catch(err => console.error("Feishu sync error:", err));
      }

      return { id: docRef.id, ...newMaterial };
    } catch (error) {
      console.error("Error adding material:", error);
    }
  };

  const batchAddMaterials = async (materials: Omit<LearningMaterial, 'id' | 'createdAt'>[]) => {
    if (!user) return;
    
    const batch = writeBatch(db);
    materials.forEach(m => {
      const docRef = doc(collection(db, 'materials'));
      batch.set(docRef, {
        ...m,
        uid: user.uid,
        createdAt: Date.now(),
        mastery_score: m.mastery_score ?? 0,
        streak: m.streak ?? 0,
        last_seen: m.last_seen ?? Date.now(),
        next_review_at: m.next_review_at ?? Date.now()
      });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error batch adding materials:", error);
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      console.error("Error deleting material:", error);
    }
  };

  const updateMaterial = async (id: string, updates: Partial<LearningMaterial>) => {
    try {
      await updateDoc(doc(db, 'materials', id), updates);
    } catch (error) {
      console.error("Error updating material:", error);
    }
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
    user,
    isAuthReady,
    addMaterial,
    batchAddMaterials,
    deleteMaterial,
    updateMaterial,
    setActiveModule,
    getDashboardStats
  };
}
