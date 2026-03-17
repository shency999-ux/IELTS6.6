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

const VocabularyDisplay: React.FC = () => {
  const [vocabulary, setVocabulary] = useState<VocabularyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        // Try to fetch latest vocabulary first
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

  if (loading) return <div className="loading">Loading daily vocabulary...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!vocabulary) return <div className="no-data">No vocabulary data available</div>;

  return (
    <div className="vocabulary-container">
      <h2>Daily Vocabulary ({vocabulary.date})</h2>
      <p className="word-count">Total words: {vocabulary.total_words}</p>
      <div className="words-grid">
        {vocabulary.words.map((word, index) => (
          <div key={index} className="word-card">
            <h3 className="word">{word.word}</h3>
            <p className="phonetic">{word.phonetic}</p>
            <p className="chinese">{word.chinese_definition}</p>
            <p className="english">{word.english_definition}</p>
            <div className="examples">
              <strong>Examples:</strong>
              <ul>
                {word.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
            <div className="meta">
              <span className="category">Level: {word.category}</span>
              <span className="type">Type: {word.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VocabularyDisplay;