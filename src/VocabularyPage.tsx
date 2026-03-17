import React, { useState, useEffect } from 'react';

interface Word {
  word: string;
  phonetic: string;
  chinese_definition: string;
  english_definition: string;
  examples: string[];
  category: string;
  type: string;
}

interface VocabularyData {
  date: string;
  total_words: number;
  words: Word[];
}

const VocabularyPage: React.FC = () => {
  const [vocabulary, setVocabulary] = useState<VocabularyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        const response = await fetch('/data/latest-vocabulary.json');
        
        if (!response.ok) {
          throw new Error('No vocabulary data found');
        }
        const data = await response.json();
        setVocabulary(data);
      } catch (err) {
        setError('Failed to load vocabulary data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVocabulary();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading daily vocabulary...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
  
  if (!vocabulary) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-600 mb-2">No Data Available</h2>
        <p className="text-gray-500">Please check back later.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Daily English Vocabulary</h1>
          <p className="text-xl text-gray-600">Learn {vocabulary.total_words} new words today ({vocabulary.date})</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vocabulary.words.map((word, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{word.word}</h2>
                  <p className="text-gray-500 italic">{word.phonetic}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {word.category}
                </span>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Chinese Definition</h3>
                <p className="text-lg font-medium text-gray-900">{word.chinese_definition}</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">English Definition</h3>
                <p className="text-gray-700">{word.english_definition}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Examples</h3>
                <ul className="space-y-2">
                  {word.examples.map((example, i) => (
                    <li key={i} className="text-gray-600 italic">"{example}"</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  {word.type}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 text-gray-500">
          <p>Updated daily at 9:00 AM (Asia/Shanghai)</p>
          <p className="mt-2">Powered by OpenClaw AI Assistant</p>
        </div>
      </div>
    </div>
  );
};

export default VocabularyPage;