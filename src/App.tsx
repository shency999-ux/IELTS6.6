import React, { useState, useEffect } from 'react';

// Simple Vocabulary Display Component
const VocabularyPage = () => {
  const [vocabulary, setVocabulary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVocabulary = async () => {
      try {
        const response = await fetch('/data/latest-vocabulary.json');
        if (!response.ok) {
          throw new Error('Failed to load vocabulary data');
        }
        const data = await response.json();
        setVocabulary(data);
      } catch (err) {
        setError(err.message);
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
      <header className="header">
        <h1>IELTS 6.6 Vocabulary</h1>
        <p>Daily English words for IELTS preparation</p>
      </header>
      
      <div className="date-info">
        <span className="date">{vocabulary.date}</span>
        <span className="count">Total words: {vocabulary.total_words}</span>
      </div>

      <div className="words-grid">
        {vocabulary.words.map((word, index) => (
          <div key={index} className="word-card">
            <div className="word-header">
              <h2 className="word">{word.word}</h2>
              <span className="phonetic">{word.phonetic}</span>
            </div>
            <div className="word-content">
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
            </div>
            <div className="word-meta">
              <span className="category">Level: {word.category}</span>
              <span className="type">Type: {word.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VocabularyPage;