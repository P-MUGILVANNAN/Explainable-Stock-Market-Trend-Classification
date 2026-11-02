import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Newspaper,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { NewsArticle } from '../types';

export const NewsSentimentPage: React.FC = () => {
  const { selectedStock, refreshTrigger } = useOutletContext<{ selectedStock: string; refreshTrigger: number }>();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sentimentMeta, setSentimentMeta] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScoring, setIsScoring] = useState<boolean>(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const [newsRes, sentRes] = await Promise.all([
        api.getNews(selectedStock, 50),
        api.getSentimentAnalysis(selectedStock)
      ]);
      setArticles(newsRes.articles || []);
      setSentimentMeta(sentRes);
    } catch (err) {
      console.error('Failed to load news & sentiment', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedStock, refreshTrigger]);

  const handleRunFinBERT = async () => {
    setIsScoring(true);
    try {
      await api.refreshNews(selectedStock);
      await fetchNews();
    } catch (e) {
      console.error('FinBERT scoring error', e);
    } finally {
      setIsScoring(false);
    }
  };

  // Filter articles
  const filteredArticles = articles.filter((art) => {
    const matchesSentiment =
      sentimentFilter === 'all' || art.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      art.title.toLowerCase().includes(query) ||
      art.description?.toLowerCase().includes(query) ||
      art.source?.toLowerCase().includes(query);
    return matchesSentiment && matchesSearch;
  });

  const dist = sentimentMeta?.distribution || { positive_pct: 45, neutral_pct: 35, negative_pct: 20 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2.5">
            <Newspaper className="h-6 w-6 text-emerald-400" />
            <span>Financial News & FinBERT NLP Analysis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-trained FinBERT (ProsusAI/finbert) sentiment extraction and aggregate daily market mood metrics
          </p>
        </div>

        <button
          onClick={handleRunFinBERT}
          disabled={isScoring}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className={`h-4 w-4 ${isScoring ? 'animate-spin' : ''}`} />
          <span>{isScoring ? 'Executing FinBERT Inference...' : 'Run FinBERT Analysis'}</span>
        </button>
      </div>

      {/* Aggregate Polarity Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Positive */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Positive News Ratio</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{dist.positive_pct}%</div>
          <p className="text-xs text-slate-500 mt-1">{dist.positive || 0} bullish articles analyzed</p>
        </div>

        {/* Neutral */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Neutral Ratio</span>
            <MinusCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{dist.neutral_pct}%</div>
          <p className="text-xs text-slate-500 mt-1">{dist.neutral || 0} informational articles analyzed</p>
        </div>

        {/* Negative */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Negative News Ratio</span>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{dist.negative_pct}%</div>
          <p className="text-xs text-slate-500 mt-1">{dist.negative || 0} bearish articles analyzed</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111827] border border-slate-800 rounded-xl p-3">
        {/* Search Input */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline or source..."
            className="bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none w-full"
          />
        </div>

        {/* Sentiment Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-medium w-full sm:w-auto">
          {['all', 'positive', 'neutral', 'negative'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSentimentFilter(cat)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                sentimentFilter === cat ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Articles Feed */}
      <div className="space-y-3">
        {filteredArticles.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            No financial news matches the selected filter for {selectedStock}.
          </div>
        ) : (
          filteredArticles.map((art, idx) => {
            const probs = art.sentiment_probabilities || { positive: 0.33, negative: 0.33, neutral: 0.34, confidence: 0.5 };
            const isPos = art.sentiment === 'positive';
            const isNeg = art.sentiment === 'negative';

            return (
              <div
                key={art.url || idx}
                className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Article Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2 py-0.5 rounded">
                        {art.source}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {art.published_at ? art.published_at.replace('T', ' ').replace('Z', ' UTC') : 'Recent'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white hover:text-blue-400 transition-colors">
                      {art.url ? (
                        <a href={art.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1.5">
                          <span>{art.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 inline text-slate-500" />
                        </a>
                      ) : (
                        art.title
                      )}
                    </h4>

                    {art.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {art.description}
                      </p>
                    )}
                  </div>

                  {/* Right: FinBERT Confidence Badge & Probabilities */}
                  <div className="shrink-0 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 min-w-[220px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FinBERT Output</span>
                      <span
                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                          isPos
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isNeg
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                        }`}
                      >
                        {art.sentiment || 'neutral'}
                      </span>
                    </div>

                    {/* Probability Bars */}
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-emerald-400 font-semibold">Positive</span>
                        <span>{(probs.positive * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${probs.positive * 100}%` }}></div>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 pt-0.5">
                        <span className="text-red-400 font-semibold">Negative</span>
                        <span>{(probs.negative * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${probs.negative * 100}%` }}></div>
                      </div>

                      <div className="flex justify-between items-center text-slate-400 pt-0.5">
                        <span className="text-slate-400 font-semibold">Neutral</span>
                        <span>{(probs.neutral * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-500 h-full rounded-full" style={{ width: `${probs.neutral * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

