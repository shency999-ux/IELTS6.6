import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { syncVocabularyFromFeishu } from '../server';
import { 
  Plus, 
  Search, 
  Trash2, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  X,
  TrendingUp,
  Clock,
  ChevronRight,
  FileAudio,
  FileText,
  FileImage,
  Mic,
  Languages,
  PenTool,
  Video,
  BookOpen,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { useAppState } from './hooks/useAppState';
import { MODULES, CHANNELS } from './constants';
import { ModuleType, LearningMaterial, Channel } from './types';
import { cn } from './lib/utils';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Target, 
  BookMarked, 
  BarChart3,
  ChevronDown,
  Settings,
  LogOut,
  LogIn,
  User as UserIcon,
  Copy,
  Check
} from 'lucide-react';

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { signInWithPopup, signOut, googleProvider, auth } from './firebase';
import { User } from 'firebase/auth';

// --- Constants ---
const API_KEY_STORAGE_KEY = 'gemini_api_key_v1';

const handleSync = async () => {
  await syncVocabularyFromFeishu();
};

const getApiKey = () => {
  // @ts-ignore
  return localStorage.getItem(API_KEY_STORAGE_KEY) || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
};

const fetchDictionaryInfo = async (word: string) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('API Key not found. Please set it in settings.');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Fetch dictionary information for the English word or phrase "${word}".`,
      config: { 
        systemInstruction: "You are a helpful English-Chinese dictionary assistant. Return accurate dictionary data in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phonetic: { type: Type.STRING, description: "IPA phonetic notation" },
            chinese: { type: Type.STRING, description: "Primary Chinese translation" },
            partOfSpeech: { type: Type.STRING, description: "e.g. noun, verb" },
            plural: { type: Type.STRING },
            pastTense: { type: Type.STRING },
            phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            definition: { type: Type.STRING }
          },
          required: ["phonetic", "chinese", "partOfSpeech", "definition"]
        }
      }
    });
    
    if (!response.text) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error('Dictionary API Error:', error);
    return null;
  }
};

// --- Components ---

const Header = ({ 
  wordCount,
  phraseCount,
  onUploadClick,
  materials,
  onSelectMaterial,
  user
}: { 
  wordCount: number;
  phraseCount: number;
  onUploadClick: () => void;
  materials: LearningMaterial[];
  onSelectMaterial: (m: LearningMaterial) => void;
  user: User | null;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(getApiKey());
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const copyUserId = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const suggestions = searchQuery.trim() 
    ? materials.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-white/5 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Languages className="text-white w-6 h-6" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold text-white tracking-tight">English Study</h1>
          <p className="text-xs text-indigo-200/60 font-medium uppercase tracking-wider">Assistant Pro</p>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-8 relative" ref={searchRef}>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search words, content, or files..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-2">
                {suggestions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMaterial(m);
                      setSearchQuery('');
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                      {m.type === 'listening' && <FileAudio className="w-4 h-4 text-indigo-400" />}
                      {m.type === 'reading' && <BookOpen className="w-4 h-4 text-blue-400" />}
                      {m.type === 'vocabulary' && <Languages className="w-4 h-4 text-emerald-400" />}
                      {m.type === 'writing' && <PenTool className="w-4 h-4 text-purple-400" />}
                      {m.type === 'grammar' && <FileText className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{m.title}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{m.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-bold text-white">{user.displayName}</span>
              <span className="text-[10px] text-zinc-500">{user.email}</span>
            </div>
            <div className="relative group">
              <img 
                src={user.photoURL || ''} 
                alt={user.displayName || ''} 
                className="w-10 h-10 rounded-xl border border-white/10"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={handleLogout}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        )}
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="hidden xl:flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">{wordCount}</span>
              <span className="text-[10px] text-indigo-200/60 uppercase font-bold">Words</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">{phraseCount}</span>
              <span className="text-[10px] text-indigo-200/60 uppercase font-bold">Phrases</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onUploadClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:scale-105 transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Content</span>
        </button>
      </div>
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Settings className="text-indigo-400 w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Settings</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Gemini API Key</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="Enter your Gemini API Key..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Your API Key is stored locally in your browser and never sent to our servers. 
                    You can get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
                  </p>
                </div>

                {user ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Webhook Integration</label>
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Your User ID</span>
                        <div className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                          <code className="text-xs text-indigo-300 truncate">{user.uid}</code>
                          <button 
                            onClick={copyUserId}
                            className="text-zinc-500 hover:text-white transition-colors"
                            title="Copy User ID"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Webhook URL</span>
                        <code className="block text-[10px] text-zinc-400 bg-white/5 rounded-lg px-3 py-2 border border-white/5 break-all">
                          {window.location.origin}/api/webhook/feishu
                        </code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-3 text-indigo-400 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Login Required</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Please login using the button in the top-right corner to view your User ID and enable Webhook integration.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem(API_KEY_STORAGE_KEY, tempApiKey);
                      setShowSettings(false);
                      window.location.reload(); // Reload to apply new key
                    }}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Sidebar = ({ 
  activeModule, 
  onModuleChange 
}: { 
  activeModule: ModuleType; 
  onModuleChange: (m: ModuleType) => void 
}) => (
  <nav className="w-64 border-r border-white/10 flex flex-col p-4 gap-2 bg-black/20 backdrop-blur-xl">
    <p className="px-4 py-2 text-[10px] font-bold text-indigo-200/40 uppercase tracking-[0.2em]">Learning Modules</p>
    {MODULES.map((module) => {
      const Icon = module.icon;
      const isActive = activeModule === module.id;
      return (
        <button
          key={module.id}
          onClick={() => onModuleChange(module.id)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
            isActive 
              ? "bg-white/10 text-white shadow-inner" 
              : "text-indigo-200/60 hover:text-white hover:bg-white/5"
          )}
        >
          {isActive && (
            <motion.div 
              layoutId="active-pill"
              className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-full"
            />
          )}
          <Icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "group-hover:text-indigo-300")} />
          <span className="font-medium">{module.label}</span>
          <ChevronRight className={cn("w-4 h-4 ml-auto opacity-0 transition-opacity", isActive && "opacity-40")} />
        </button>
      );
    })}
  </nav>
);

const UploadModal = ({ 
  isOpen, 
  onClose, 
  onAdd,
  onBatchAdd,
  onUpdate,
  materials
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (m: any) => any;
  onBatchAdd: (ms: any[]) => void;
  onUpdate?: (id: string, updates: any) => void;
  materials: LearningMaterial[];
}) => {
  const [tab, setTab] = useState<'text' | 'file' | 'batch'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chinese, setChinese] = useState('');
  const [batchContent, setBatchContent] = useState('');
  const [type, setType] = useState<ModuleType>('listening');
  const [channelId, setChannelId] = useState<string>('A1');
  const [subType, setSubType] = useState<'word' | 'phrase'>('word');
  const [associations, setAssociations] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check for duplicate file
      const isDuplicate = materials.some(m => 
        m.fileName === file.name && 
        m.fileType === file.type
      );
      
      if (isDuplicate) {
        if (!window.confirm(`A file named "${file.name}" already exists. Do you want to upload it again?`)) {
          e.target.value = '';
          return;
        }
      }

      setSelectedFile(file);
      if (!title) setTitle(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === 'batch') {
      const lines = batchContent.split('\n').filter(line => line.trim());
      const duplicates: string[] = [];
      const newMaterials = lines.map(line => {
        // Support formats like "word: definition" or "word - definition"
        const separator = line.includes(':') ? ':' : (line.includes('-') ? '-' : null);
        let titleText = '';
        let contentText = '';
        
        if (separator) {
          const [t, ...c] = line.split(separator);
          titleText = t.trim();
          contentText = c.join(separator).trim();
        } else {
          titleText = line.trim();
        }

        const isDuplicate = materials.some(m => 
          m.type === 'vocabulary' && 
          m.title.toLowerCase() === titleText.toLowerCase()
        );
        if (isDuplicate) duplicates.push(titleText);

        const finalSubType = subType === 'phrase' ? 'phrase' : (titleText.includes(' ') ? 'phrase' : 'word');
        return {
          title: titleText,
          content: contentText,
          type: 'vocabulary' as ModuleType,
          subType: finalSubType,
          channel_id: channelId
        };
      });

      if (duplicates.length > 0) {
        if (!window.confirm(`The following words already exist: ${duplicates.join(', ')}. Do you want to proceed with batch upload?`)) {
          return;
        }
      }

      onBatchAdd(newMaterials);
      setBatchContent('');
    } else if (tab === 'file') {
      if (!selectedFile) return;
      
      // Final check for duplicate on submit (in case title was changed)
      const isDuplicate = materials.some(m => 
        m.title === (title || selectedFile.name) && 
        m.type === type
      );
      
      if (isDuplicate) {
        if (!window.confirm(`A material with the title "${title || selectedFile.name}" already exists in this module. Proceed?`)) {
          return;
        }
      }

      const url = URL.createObjectURL(selectedFile);
      onAdd({
        title: title || selectedFile.name,
        type,
        fileUrl: url,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        createdAt: Date.now()
      });
      setSelectedFile(null);
      setTitle('');
    } else {
      if (!title) return;
      
      let finalTitle = title;
      let finalContent = content;
      let finalSubType = subType;

      // Handle separator in single upload title if it's vocabulary
      if (type === 'vocabulary') {
        const separator = title.includes(':') ? ':' : (title.includes('-') ? '-' : null);
        if (separator) {
          const [t, ...c] = title.split(separator);
          finalTitle = t.trim();
          finalContent = c.join(separator).trim() || content;
          // Auto-detect phrase if it has spaces
          if (finalTitle.includes(' ') && subType === 'word') {
            finalSubType = 'phrase';
          }
        }
      }

      // Check for duplicate word
      const isDuplicate = materials.some(m => 
        m.type === type && 
        m.title.toLowerCase() === finalTitle.toLowerCase()
      );

      if (isDuplicate) {
        if (!window.confirm(`"${finalTitle}" already exists in ${type}. Do you want to add it anyway?`)) {
          return;
        }
      }

      // Automatic enrichment for single words (Background process)
      if (type === 'vocabulary' && finalSubType === 'word') {
        const basicMaterial = { 
          title: finalTitle, 
          content: finalContent, 
          type, 
          subType: 'word',
          channel_id: channelId,
          chinese,
          associations: associations.split(',').map(s => s.trim()).filter(Boolean),
          isEnriching: true
        };
        
        // Save immediately and close
        const savedMaterial = onAdd(basicMaterial);
        onClose();
        setTitle('');
        setContent('');
        setChinese('');
        setAssociations('');

        // Background enrichment
        fetchDictionaryInfo(finalTitle).then(info => {
          if (info && onUpdate) {
            onUpdate(savedMaterial.id, {
              content: info.definition || savedMaterial.content,
              isEnriching: false,
              ...info
            });
          } else if (onUpdate) {
            onUpdate(savedMaterial.id, { isEnriching: false });
          }
        }).catch(err => {
          console.error('Background enrichment failed:', err);
          if (onUpdate) onUpdate(savedMaterial.id, { isEnriching: false });
        });
        
        return;
      }

      onAdd({ 
        title: finalTitle, 
        content: finalContent, 
        type, 
        subType: type === 'vocabulary' ? finalSubType : undefined,
        channel_id: type === 'vocabulary' ? channelId : undefined,
        associations: associations.split(',').map(s => s.trim()).filter(Boolean)
      });
      setTitle('');
      setContent('');
      setAssociations('');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add New Material</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <button 
  onClick={async () => {
    try {
      const result = await syncVocabularyFromFeishu();
      alert(`同步完成！${result.count} 个单词已同步`);
    } catch (error) {
      alert('同步失败：' + error.message);
    }
  }}
>
  同步飞书单词到网站
</button>
        <div className="p-6 space-y-6">
          <div className="flex p-1 bg-black/40 rounded-xl">
            <button 
              onClick={() => setTab('text')}
              className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all", tab === 'text' ? "bg-white/10 text-white" : "text-zinc-500")}
            >
              Text Input
            </button>
            <button 
              onClick={() => setTab('batch')}
              className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all", tab === 'batch' ? "bg-white/10 text-white" : "text-zinc-500")}
            >
              Batch Upload
            </button>
            <button 
              onClick={() => setTab('file')}
              className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-all", tab === 'file' ? "bg-white/10 text-white" : "text-zinc-500")}
            >
              File Upload
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab !== 'batch' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Module</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as ModuleType)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            )}

            {(type === 'vocabulary' || tab === 'batch') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Category</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={subType === 'word'} 
                        onChange={() => setSubType('word')}
                        className="accent-indigo-500"
                      />
                      <span className="text-sm text-zinc-300">Single Word</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={subType === 'phrase'} 
                        onChange={() => setSubType('phrase')}
                        className="accent-indigo-500"
                      />
                      <span className="text-sm text-zinc-300">Phrase</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Channel</label>
                  <select 
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {CHANNELS.filter(c => c.parent_id).map(c => (
                      <option key={c.channel_id} value={c.channel_id}>
                        {c.channel_id} - {c.channel_name_cn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tab === 'text' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Content / Definition</label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your text or definition here..."
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  />
                </div>
                {type === 'vocabulary' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Chinese Translation</label>
                    <input 
                      type="text" 
                      value={chinese}
                      onChange={(e) => setChinese(e.target.value)}
                      placeholder="e.g. 批准, 赞成"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                )}
                {type === 'vocabulary' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Associations (Roots, Related Words - comma separated)</label>
                    <input 
                      type="text" 
                      value={associations}
                      onChange={(e) => setAssociations(e.target.value)}
                      placeholder="e.g. spect (root), inspect, respect, spectacle"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                )}
              </>
            )}

            {tab === 'batch' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Batch Input (word: definition)</label>
                <textarea 
                  value={batchContent}
                  onChange={(e) => setBatchContent(e.target.value)}
                  placeholder="apple: a round fruit with red or green skin&#10;banana: a long curved fruit with yellow skin&#10;take off: to leave the ground and begin to fly"
                  rows={10}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono text-sm"
                />
                <p className="text-[10px] text-zinc-600 mt-2 italic">Format: One entry per line. Use ":" or "-" to separate word and definition.</p>
              </div>
            )}

            {tab === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
                    selectedFile 
                      ? "border-emerald-500/50 bg-emerald-500/5" 
                      : "border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                  )}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        {selectedFile.type.startsWith('audio/') ? (
                          <FileAudio className="w-6 h-6 text-emerald-400" />
                        ) : selectedFile.type.startsWith('video/') ? (
                          <Video className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Upload className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-zinc-500" />
                      <div className="text-center">
                        <p className="text-white font-medium">Click or drag file to upload</p>
                        <p className="text-xs text-zinc-500 mt-1">Supports PDF, MP3, MP4, DOCX, JPG</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept="audio/*,video/*,image/*,.pdf,.docx"
                    className="hidden" 
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {tab === 'batch' ? 'Batch Upload' : 'Save Material'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const DashboardView = ({ stats, materials }: { stats: any, materials: LearningMaterial[] }) => {
  const vocabMaterials = materials.filter(m => m.type === 'vocabulary');
  const mainCategories = CHANNELS.filter(c => !c.parent_id);
  
  return (
    <div className="space-y-8">
      {/* Top Summary Section */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-widest">
              <Target className="w-4 h-4" />
              IELTS Target
            </div>
            <div className="text-5xl font-black text-white tracking-tighter">6.5 <span className="text-xl font-medium text-zinc-500 tracking-normal">Score</span></div>
          </div>

          <div className="flex-1 max-w-md space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Vocabulary Coverage (Added)</div>
                  <div className="text-xl font-bold text-white">{stats.words_added_total} / {stats.total_target_words}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{stats.coverage_rate.toFixed(1)}%</div>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.coverage_rate, 100)}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Mastery Progress (Learned)</div>
                  <div className="text-xl font-bold text-white">{stats.words_mastered} / {stats.total_target_words}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-400">{stats.completion_rate.toFixed(1)}%</div>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.completion_rate, 100)}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-8 border-t border-white/5">
          {mainCategories.map(cat => {
            const children = CHANNELS.filter(c => c.parent_id === cat.channel_id);
            const catMaterials = vocabMaterials.filter(m => 
              m.channel_id === cat.channel_id || children.some(child => child.channel_id === m.channel_id)
            );
            const addedCount = catMaterials.length;
            const masteredCount = catMaterials.filter(m => (m.mastery_score ?? 0) >= 0.8).length;
            
            const coverageProgress = (addedCount / cat.target_words) * 100;
            const masteryProgress = (masteredCount / cat.target_words) * 100;

            return (
              <div key={cat.channel_id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{cat.channel_id}. {cat.channel_name_en}</div>
                    <div className="text-xs font-bold text-white truncate max-w-[120px]">{cat.channel_name_cn}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-emerald-400">{coverageProgress.toFixed(0)}%</div>
                    <div className="text-[10px] font-bold text-zinc-500">{addedCount}/{cat.target_words}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(coverageProgress, 100)}%` }}
                      className="h-full bg-emerald-500/50"
                    />
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(masteryProgress, 100)}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-bold flex justify-between">
                  <span>{masteredCount} Mastered</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Target className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.total_target_words}</div>
          <div className="text-xs text-zinc-500">Total Goal Words</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <BookMarked className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Added</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.words_added_total}</div>
          <div className="text-xs text-zinc-500">{stats.coverage_rate.toFixed(1)}% Coverage</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Learned</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.words_learned}</div>
          <div className="text-xs text-zinc-500">Words in Progress</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mastered</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.words_mastered}</div>
          <div className="text-xs text-zinc-500">{stats.completion_rate.toFixed(1)}% Mastery</div>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Channel Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHANNELS.filter(c => !c.parent_id).map(parent => {
            const children = CHANNELS.filter(c => c.parent_id === parent.channel_id);
            const parentMaterials = vocabMaterials.filter(m => 
              m.channel_id === parent.channel_id || children.some(child => child.channel_id === m.channel_id)
            );
            const addedCount = parentMaterials.length;
            const masteredCount = parentMaterials.filter(m => (m.mastery_score ?? 0) >= 0.8).length;
            
            const coverageProgress = (addedCount / parent.target_words) * 100;
            const masteryProgress = (masteredCount / parent.target_words) * 100;

            return (
              <div key={parent.channel_id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-bold">{parent.channel_name_cn}</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{parent.channel_name_en}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{addedCount} / {parent.target_words}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Words Added</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-400">Coverage</span>
                      <span className="text-emerald-400">{coverageProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(coverageProgress, 100)}%` }}
                        className="h-full bg-emerald-500/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-indigo-400">Mastery</span>
                      <span className="text-indigo-400">{masteryProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(masteryProgress, 100)}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {children.map(child => {
                    const childMaterials = vocabMaterials.filter(m => m.channel_id === child.channel_id);
                    const childAdded = childMaterials.length;
                    const childMastered = childMaterials.filter(m => (m.mastery_score ?? 0) >= 0.8).length;
                    
                    const childCoverage = (childAdded / child.target_words) * 100;
                    const childMastery = (childMastered / child.target_words) * 100;

                    return (
                      <div key={child.channel_id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 truncate pr-2">{child.channel_name_cn}</span>
                          <span className="text-[10px] font-mono text-white">{childAdded}/{child.target_words}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/30" style={{ width: `${Math.min(childCoverage, 100)}%` }} />
                          </div>
                          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500/50" style={{ width: `${Math.min(childMastery, 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ListeningView = ({ materials, onDelete }: { materials: LearningMaterial[], onDelete: (id: string) => void }) => {
  const [activeMaterial, setActiveMaterial] = useState<LearningMaterial | null>(null);

  return (
    <div className="space-y-6">
      {activeMaterial && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                {activeMaterial.fileType?.startsWith('video/') ? (
                  <Video className="text-indigo-400 w-6 h-6" />
                ) : (
                  <FileAudio className="text-indigo-400 w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-white font-bold">{activeMaterial.title}</h3>
                <p className="text-xs text-zinc-500">Now Playing</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveMaterial(null)}
              className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-black/40 rounded-2xl overflow-hidden border border-white/5">
            {activeMaterial.fileType?.startsWith('video/') ? (
              <video 
                src={activeMaterial.fileUrl} 
                controls 
                autoPlay
                className="w-full max-h-[400px] aspect-video"
              />
            ) : (
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <Play className="w-8 h-8 text-indigo-400 fill-current" />
                </div>
                <audio 
                  src={activeMaterial.fileUrl} 
                  controls 
                  autoPlay
                  className="w-full max-w-md accent-indigo-500"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map(m => (
          <motion.div 
            layout
            key={m.id} 
            className={cn(
              "bg-white/5 border rounded-2xl p-5 group transition-all",
              activeMaterial?.id === m.id ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-indigo-500/30"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                {m.fileType?.startsWith('video/') ? (
                  <Video className="text-indigo-400 w-6 h-6" />
                ) : (
                  <FileAudio className="text-indigo-400 w-6 h-6" />
                )}
              </div>
              <button onClick={() => onDelete(m.id)} className="p-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-white font-bold mb-1 truncate">{m.title}</h3>
            <p className="text-xs text-zinc-500 mb-4">{format(m.createdAt, 'MMM d, yyyy')}</p>
            <button 
              onClick={() => setActiveMaterial(m)}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                activeMaterial?.id === m.id 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white/5 hover:bg-white/10 text-white"
              )}
            >
              <Play className="w-4 h-4 fill-current" />
              {activeMaterial?.id === m.id ? 'Playing...' : 'Play Material'}
            </button>
          </motion.div>
        ))}
        {materials.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileAudio className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500">No listening materials yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SpeakingView = ({ materials, onDelete, onAdd }: { materials: LearningMaterial[], onDelete: (id: string) => void, onAdd: (m: any) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(0);
  const intervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Update timerRef whenever timer state changes
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        const finalDuration = formatTime(timerRef.current);
        const recordingNumber = materials.length + 1;

        // Auto-save to materials
        onAdd({
          title: `Recording #${recordingNumber} (${finalDuration})`,
          type: 'speaking',
          fileUrl: url,
          duration: finalDuration,
          fileName: `recording-${Date.now()}.webm`,
          fileType: 'audio/webm'
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Please allow microphone access to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Capture the final time immediately before stopping
      timerRef.current = timer; 
      mediaRecorderRef.current.stop();
      clearInterval(intervalRef.current);
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePlayback = (id: string) => {
    const audio = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (!audio) return;

    if (playingId === id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
    } else {
      // Stop any currently playing audio
      if (playingId) {
        const currentAudio = document.getElementById(`audio-${playingId}`) as HTMLAudioElement;
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }
      audio.play();
      setPlayingId(id);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl shadow-indigo-500/20">
        <div className="relative mb-6">
          <div className={cn(
            "w-24 h-24 rounded-full bg-white/20 flex items-center justify-center transition-all duration-500",
            isRecording && "scale-110 bg-white/30"
          )}>
            <Mic className={cn("w-10 h-10 text-white", isRecording && "animate-pulse")} />
          </div>
          {isRecording && (
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full border-2 border-white/50"
            />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Practice Speaking</h2>
        <p className="text-indigo-100/60 text-sm mb-8 max-w-md">Record your voice to practice pronunciation and fluency. Recordings are automatically saved below.</p>
        
        <div className="flex items-center gap-6">
          <div className="text-3xl font-mono font-bold text-white w-24">{formatTime(timer)}</div>
          <button 
            onClick={toggleRecording}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90",
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-white text-indigo-600 hover:bg-zinc-100"
            )}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((m) => {
          return (
            <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Mic className="text-emerald-400 w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">
                    {m.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{format(m.createdAt, 'MMM d, HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.fileUrl && (
                  <audio 
                    src={m.fileUrl} 
                    className="hidden" 
                    id={`audio-${m.id}`} 
                    onEnded={() => setPlayingId(null)}
                  />
                )}
                <button 
                  onClick={() => togglePlayback(m.id)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    playingId === m.id ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {playingId === m.id ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button onClick={() => onDelete(m.id)} className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReadingView = ({ materials, onDelete }: { materials: LearningMaterial[], onDelete: (id: string) => void }) => (
  <div className="space-y-6">
    {materials.map(m => (
      <motion.div 
        layout
        key={m.id} 
        className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-indigo-500/30 transition-all"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <FileText className="text-orange-400 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">{m.title}</h3>
              <p className="text-xs text-zinc-500">{format(m.createdAt, 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <button onClick={() => onDelete(m.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8">
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{m.content}</p>
          </div>
        </div>
      </motion.div>
    ))}
    {materials.length === 0 && (
      <div className="py-20 text-center">
        <p className="text-zinc-500">No reading materials yet.</p>
      </div>
    )}
  </div>
);

const WritingView = ({ materials, onDelete, onAdd, onUpdate }: { 
  materials: LearningMaterial[], 
  onDelete: (id: string) => void,
  onAdd: (m: Omit<LearningMaterial, 'id' | 'createdAt'>) => void,
  onUpdate: (id: string, updates: Partial<LearningMaterial>) => void
}) => {
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!title.trim() || !draft.trim()) return;

    if (editingId) {
      onUpdate(editingId, { title, content: draft });
    } else {
      onAdd({
        type: 'writing',
        title,
        content: draft,
      });
      setTitle('');
      setDraft('');
    }
  };

  const handleLoad = (m: LearningMaterial) => {
    setTitle(m.title);
    setDraft(m.content || '');
    setEditingId(m.id);
  };

  const handleNew = () => {
    setTitle('');
    setDraft('');
    setEditingId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <input 
              type="text" 
              placeholder="Essay Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-bold text-white placeholder:text-zinc-700 focus:outline-none"
            />
            {editingId && (
              <button 
                onClick={handleNew}
                className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-all"
              >
                + New Essay
              </button>
            )}
          </div>
          <textarea 
            placeholder="Start writing your essay here..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={15}
            className="w-full bg-transparent text-zinc-300 leading-relaxed placeholder:text-zinc-700 focus:outline-none resize-none"
          />
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs text-zinc-500 font-medium">
              {draft.split(/\s+/).filter(Boolean).length} Words
            </div>
            <button 
              onClick={handleSave}
              disabled={!title.trim() || !draft.trim()}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update Draft' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2">Recent Essays</h4>
        <div className="space-y-3">
          {materials.map(m => (
            <div 
              key={m.id} 
              onClick={() => handleLoad(m)}
              className={cn(
                "bg-white/5 border rounded-2xl p-4 group hover:bg-white/10 transition-all cursor-pointer",
                editingId === m.id ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-white font-semibold text-sm truncate pr-4">{m.title}</h5>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                    if (editingId === m.id) handleNew();
                  }} 
                  className="text-zinc-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">{format(m.createdAt, 'MMM d, yyyy')}</p>
            </div>
          ))}
          {materials.length === 0 && (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-xs text-zinc-600">No essays saved yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VocabularyView = ({ materials, onUpdate, onDelete }: { materials: LearningMaterial[], onUpdate: (id: string, updates: any) => void, onDelete: (id: string) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editChinese, setEditChinese] = useState('');
  const [editAssociations, setEditAssociations] = useState('');
  const [activeChannel, setActiveChannel] = useState<string>('A1');

  const filteredMaterials = materials.filter(m => (m.channel_id || 'A1') === activeChannel);
  const currentMaterial = filteredMaterials[currentIndex];

  useEffect(() => {
    if (currentMaterial) {
      setEditTitle(currentMaterial.title);
      setEditContent(currentMaterial.content || '');
      setEditChinese(currentMaterial.chinese || '');
      setEditAssociations(currentMaterial.associations?.join(', ') || '');
    }
  }, [currentMaterial]);

  // Reset index when channel changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsEditing(false);
  }, [activeChannel]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMaterial) {
      onUpdate(currentMaterial.id, { 
        title: editTitle, 
        content: editContent,
        chinese: editChinese,
        associations: editAssociations.split(',').map(s => s.trim()).filter(Boolean)
      });
      setIsEditing(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
    if (currentIndex >= filteredMaterials.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const activeChannelData = CHANNELS.find(c => c.channel_id === activeChannel);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Pre-fetch audio for current card
  useEffect(() => {
    if (currentMaterial && currentMaterial.type === 'vocabulary') {
      const key = `${currentMaterial.title}-en-GB`;
      if (!audioCache.current.has(key)) {
        // Silent pre-fetch
        generateAudio(currentMaterial.title).then(audio => {
          if (audio) audioCache.current.set(key, audio);
        });
      }
    }
  }, [currentIndex, activeChannel]);

  const generateAudio = async (text: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in an elegant British voice: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return new Audio(`data:audio/wav;base64,${base64Audio}`);
      }
    } catch (error) {
      console.error('TTS API Error:', error);
    }
    return null;
  };

  const speak = async (text: string) => {
    const key = `${text}-en-GB`;
    
    // Immediate playback if cached
    if (audioCache.current.has(key)) {
      const cachedAudio = audioCache.current.get(key)!;
      setIsSpeaking(key);
      cachedAudio.currentTime = 0;
      cachedAudio.onended = () => setIsSpeaking(null);
      await cachedAudio.play();
      return;
    }

    if (isSpeaking === key || isGenerating === key) return;
    setIsGenerating(key);

    const audio = await generateAudio(text);
    setIsGenerating(null);

    if (audio) {
      audioCache.current.set(key, audio);
      setIsSpeaking(key);
      audio.onended = () => setIsSpeaking(null);
      await audio.play();
    } else {
      // Fallback to browser TTS if Gemini fails
      setIsSpeaking(key);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.onend = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-8">
      {/* Channel Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHANNELS.filter(c => c.parent_id).map(c => (
          <button 
            key={c.channel_id}
            onClick={() => setActiveChannel(c.channel_id)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              activeChannel === c.channel_id 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20" 
                : "bg-white/5 text-zinc-500 border-white/10 hover:text-zinc-300 hover:bg-white/10"
            )}
          >
            {c.channel_id} {c.channel_name_cn}
          </button>
        ))}
      </div>

      {activeChannelData && (
        <div className="text-center max-w-2xl mx-auto">
          <h3 className="text-white font-bold">{activeChannelData.channel_name_cn}</h3>
          <p className="text-xs text-zinc-500 mt-1">{activeChannelData.description}</p>
        </div>
      )}

      {filteredMaterials.length > 0 ? (
        <div className="flex flex-col items-center gap-8">
          <div 
            onClick={() => !isEditing && setIsFlipped(!isFlipped)}
            className="perspective-1000 w-full max-w-md h-80 cursor-pointer group relative"
          >
            {/* Delete Button - Appears on hover */}
            <button 
              onClick={(e) => handleDelete(e, currentMaterial.id)}
              className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div 
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
              className="relative w-full h-full preserve-3d"
            >
              {/* Front: Word (Title) */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl shadow-indigo-500/30">
                <div className="absolute top-6 right-6 flex gap-2">
                  {!isEditing ? (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(currentMaterial.id, { mastery_score: (currentMaterial.mastery_score ?? 0) >= 0.8 ? 0 : 1 });
                        }}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          (currentMaterial.mastery_score ?? 0) >= 0.8 
                            ? "bg-emerald-500 text-white" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        title={(currentMaterial.mastery_score ?? 0) >= 0.8 ? "Unmark Mastered" : "Mark as Mastered"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleEditClick}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleSave}
                      className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-all"
                    >
                      Save
                    </button>
                  )}
                </div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
                  {currentMaterial.subType === 'phrase' ? 'Phrase' : 'Word'}
                </p>
                {isEditing ? (
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <h2 className="text-5xl font-bold text-white mb-2 tracking-tight">{currentMaterial.title}</h2>
                    {currentMaterial.isEnriching ? (
                      <div className="flex items-center justify-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                        <div className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        AI Enriching...
                      </div>
                    ) : currentMaterial.phonetic && (
                      <p className="text-rose-400 font-mono text-sm mb-6 font-bold">{currentMaterial.phonetic}</p>
                    )}
                    <div className="flex justify-center mb-6">
                      <button 
                        disabled={!!isSpeaking || !!isGenerating}
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentMaterial.title);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-all",
                          (isSpeaking === `${currentMaterial.title}-en-GB` || isGenerating === `${currentMaterial.title}-en-GB`) && "bg-white/30"
                        )}
                      >
                        {isGenerating === `${currentMaterial.title}-en-GB` ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Volume2 className={cn("w-4 h-4", isSpeaking === `${currentMaterial.title}-en-GB` && "animate-bounce")} />
                        )}
                        Pronounce
                      </button>
                    </div>
                  </>
                )}
                {!isEditing && (
                  <div className="px-4 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
                    Click to see definition
                  </div>
                )}
              </div>
              {/* Back: Definition (Content) */}
              <div className="absolute inset-0 backface-hidden bg-zinc-900 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center rotate-y-180 shadow-2xl">
                <div className="absolute top-6 right-6 flex gap-2">
                  {!isEditing ? (
                    <>
                      <button 
                        disabled={!!isSpeaking || !!isGenerating}
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentMaterial.title);
                        }}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          (isSpeaking === `${currentMaterial.title}-en-GB` || isGenerating === `${currentMaterial.title}-en-GB`) ? "bg-white/30 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        title="Pronounce"
                      >
                        {isGenerating === `${currentMaterial.title}-en-GB` ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Volume2 className={cn("w-4 h-4", isSpeaking === `${currentMaterial.title}-en-GB` && "animate-bounce")} />
                        )}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(currentMaterial.id, { mastery_score: (currentMaterial.mastery_score ?? 0) >= 0.8 ? 0 : 1 });
                        }}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          (currentMaterial.mastery_score ?? 0) >= 0.8 
                            ? "bg-emerald-500 text-white" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        )}
                        title={(currentMaterial.mastery_score ?? 0) >= 0.8 ? "Unmark Mastered" : "Mark as Mastered"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleEditClick}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                      >
                        <PenTool className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={handleSave}
                      className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-all"
                    >
                      Save
                    </button>
                  )}
                </div>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Definition / Content</p>
                <div className="w-full max-h-full overflow-y-auto custom-scrollbar pr-2">
                  {currentMaterial.isEnriching && (
                    <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-6">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">AI Dictionary Enrichment in progress...</span>
                    </div>
                  )}
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Chinese Translation</label>
                        <input 
                          type="text"
                          value={editChinese}
                          onChange={(e) => setEditChinese(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Definition / Explanation</label>
                        <textarea 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Associations (comma separated)</label>
                        <input 
                          type="text"
                          value={editAssociations}
                          onChange={(e) => setEditAssociations(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentMaterial.chinese && (
                        <div className="text-center p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                          <p className="text-3xl font-bold text-indigo-400 mb-1">{currentMaterial.chinese}</p>
                          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Chinese Translation</p>
                        </div>
                      )}
                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-white/5" />
                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Notes & Definition</span>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <p className="text-xl text-white font-medium italic leading-relaxed">
                          {currentMaterial.content}
                        </p>
                        {currentMaterial.partOfSpeech && (
                          <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase border border-indigo-500/20">
                            {currentMaterial.partOfSpeech}
                          </span>
                        )}
                      </div>

                      {(currentMaterial.plural || currentMaterial.pastTense) && (
                        <div className="flex justify-center gap-4 text-xs text-zinc-400">
                          {currentMaterial.plural && <div><span className="text-zinc-600 mr-1">Plural:</span> {currentMaterial.plural}</div>}
                          {currentMaterial.pastTense && <div><span className="text-zinc-600 mr-1">Past:</span> {currentMaterial.pastTense}</div>}
                        </div>
                      )}

                      {currentMaterial.examples && currentMaterial.examples.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Example Sentences</p>
                          <div className="space-y-2">
                            {currentMaterial.examples.map((ex, i) => (
                              <p key={i} className="text-sm text-zinc-300 italic leading-relaxed">"{ex}"</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentMaterial.phrases && currentMaterial.phrases.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Common Phrases</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {currentMaterial.phrases.map((phrase, i) => (
                              <span key={i} className="text-xs text-indigo-400/80">{phrase}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {currentMaterial.associations && currentMaterial.associations.length > 0 && (
                        <div className="pt-4 border-t border-white/5">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Associations & Roots</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {currentMaterial.associations.map((assoc, i) => (
                              <span 
                                key={i}
                                className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold"
                              >
                                {assoc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => (prev - 1 + filteredMaterials.length) % filteredMaterials.length);
                setIsFlipped(false);
                setIsEditing(false);
              }}
              className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div className="text-zinc-500 font-mono text-sm">
              {currentIndex + 1} / {filteredMaterials.length}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => (prev + 1) % filteredMaterials.length);
                setIsFlipped(false);
                setIsEditing(false);
              }}
              className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Languages className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-500">No words or phrases added to this channel yet.</p>
          <p className="text-xs text-zinc-600 mt-2">Use the "Add Content" button to add new items to {activeChannelData?.channel_name_cn}.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMaterials.map((m, idx) => (
          <div key={m.id} className="relative group">
            <button 
              key={m.id} 
              onClick={() => {
                setCurrentIndex(idx);
                setIsFlipped(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={cn(
                "w-full bg-white/5 border rounded-2xl p-4 text-center transition-all hover:bg-white/10",
                currentIndex === idx ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/10"
              )}
            >
              <div className="text-white font-bold mb-1 truncate">{m.title}</div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase">{m.subType === 'phrase' ? 'Phrase' : 'Word'} {idx + 1}</div>
            </button>
            <button 
              onClick={(e) => handleDelete(e, m.id)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Root Explorer / Association View */}
      {filteredMaterials.some(m => m.associations && m.associations.length > 0) && (
        <div className="mt-12 pt-12 border-t border-white/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Root Explorer</h3>
              <p className="text-xs text-zinc-500">Words grouped by common roots or associations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Set(filteredMaterials.flatMap(m => m.associations || []))).map(root => {
              const relatedWords = filteredMaterials.filter(m => m.associations?.includes(root));
              if (relatedWords.length < 1) return null;
              
              return (
                <div key={root} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                      {root}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{relatedWords.length} Words</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {relatedWords.map(word => (
                      <button
                        key={word.id}
                        onClick={() => {
                          const idx = filteredMaterials.findIndex(m => m.id === word.id);
                          setCurrentIndex(idx);
                          setIsFlipped(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-sm text-zinc-300 hover:text-white transition-colors underline decoration-indigo-500/30 underline-offset-4"
                      >
                        {word.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const GrammarView = ({ materials, onDelete }: { materials: LearningMaterial[], onDelete: (id: string) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {materials.map(m => (
      <div key={m.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FileText className="text-purple-400 w-5 h-5" />
            </div>
            <h3 className="text-white font-bold">{m.title}</h3>
          </div>
          <button onClick={() => onDelete(m.id)} className="p-2 text-zinc-600 hover:text-red-400 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-4">{m.content}</p>
        <button className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-all flex items-center gap-1">
          Read Full Guide <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    ))}
    {materials.length === 0 && (
      <div className="col-span-full py-20 text-center">
        <p className="text-zinc-500">No grammar guides added yet.</p>
      </div>
    )}
  </div>
);

// --- Main App ---

export default function App() {
  const { 
    state, 
    user, 
    isAuthReady, 
    addMaterial, 
    batchAddMaterials, 
    deleteMaterial, 
    updateMaterial, 
    setActiveModule, 
    getDashboardStats 
  } = useAppState();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredMaterials = state.materials.filter(m => m.type === state.activeModule);

  const wordCount = state.materials.filter(m => m.type === 'vocabulary' && (m.subType === 'word' || !m.subType)).length;
  const phraseCount = state.materials.filter(m => m.type === 'vocabulary' && m.subType === 'phrase').length;

  const dashboardStats = getDashboardStats();

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col h-screen">
        <Header 
          wordCount={wordCount}
          phraseCount={phraseCount}
          onUploadClick={() => setIsUploadOpen(true)}
          materials={state.materials}
          onSelectMaterial={(m) => setActiveModule(m.type)}
          user={user}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            activeModule={state.activeModule} 
            onModuleChange={setActiveModule} 
          />
          
          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {MODULES.find(m => m.id === state.activeModule)?.label}
                  </h2>
                  <p className="text-zinc-500 mt-1">
                    {MODULES.find(m => m.id === state.activeModule)?.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Last updated: {format(new Date(), 'HH:mm')}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={state.activeModule}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {state.activeModule === 'dashboard' && <DashboardView stats={dashboardStats} materials={state.materials} />}
                  {state.activeModule === 'listening' && <ListeningView materials={filteredMaterials} onDelete={deleteMaterial} />}
                  {state.activeModule === 'speaking' && <SpeakingView materials={filteredMaterials} onDelete={deleteMaterial} onAdd={addMaterial} />}
                  {state.activeModule === 'reading' && <ReadingView materials={filteredMaterials} onDelete={deleteMaterial} />}
                  {state.activeModule === 'writing' && <WritingView materials={filteredMaterials} onDelete={deleteMaterial} onAdd={addMaterial} onUpdate={updateMaterial} />}
                  {state.activeModule === 'vocabulary' && <VocabularyView materials={filteredMaterials} onUpdate={updateMaterial} onDelete={deleteMaterial} />}
                  {state.activeModule === 'grammar' && <GrammarView materials={filteredMaterials} onDelete={deleteMaterial} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
{/* 飞书单词同步按钮 */}
<div className="sync-section" style={{ 
  margin: '20px 0', 
  padding: '15px', 
  backgroundColor: '#e8f5e8', 
  borderRadius: '8px',
  border: '1px solid #4CAF50'
}}>
  <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>飞书词汇同步</h3>
  <button 
    onClick={async () => {
      try {
        const response = await fetch('/api/sync-vocabulary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const result = await response.json();
        if (result.success) {
          alert(`同步成功！共 ${result.count} 个单词已同步到网站`);
        } else {
          alert(`同步失败：${result.message}`);
        }
      } catch (error) {
        console.error('Sync error:', error);
        alert('同步出错，请检查控制台');
      }
    }}
    style={{
      padding: '10px 20px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    }}
  >
    🔄 同步飞书单词到网站
  </button>
</div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onAdd={addMaterial} 
        onBatchAdd={batchAddMaterials}
        onUpdate={updateMaterial}
        materials={state.materials}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}} />
    </div>
  );
}
