import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import AddStampPage from './components/AddStampPage';
import EditStampPage from './components/EditStampPage';
import StatisticsPage from './components/StatisticsPage';

const API_BASE = 'http://localhost:8000';

interface Stamp {
  name: string;
  scott_number: string;
  country: string;
  denomination: string;
  print_date?: string;
  color: string;
  dimensions: string;
  condition: string;
  value: number;
  quantity: number;
  image_url: string;
  tags: string[];
}

interface CountryCount {
  country: string;
  count: number;
}

// 1. Move the Collection View into its own component
const CollectionView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCountries = searchParams.get('country')
    ? searchParams.get('country')!.split(',').filter(Boolean)
    : [];
  const page = parseInt(searchParams.get('page') || '0');
  const [searchInput, setSearchInput] = useState('');
  const limit = 50;

  const setPage = (updater: (p: number) => number) => {
    const next = updater(page);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('page', String(next));
      return params;
    });
  };

  const { data: countryCounts = [] } = useQuery<CountryCount[]>({
    queryKey: ['countries/counts'],
    queryFn: () => fetch(`${API_BASE}/countries/counts`).then(res => res.json()),
  });

  const filteredCountries = countryCounts.filter(({ country }) =>
    country.toLowerCase().includes(searchInput.toLowerCase())
  );

  const totalStamps = countryCounts.reduce((sum, c) => sum + c.count, 0);

  const countryParam = selectedCountries.length > 0 ? encodeURIComponent(selectedCountries.join(',')) : null;

  const { data: totalCount = 0 } = useQuery<number>({
    queryKey: ['stamps/count', countryParam],
    queryFn: () => {
      const url = countryParam ? `${API_BASE}/stamps/count?country=${countryParam}` : `${API_BASE}/stamps/count`;
      return fetch(url).then(res => res.json()).then(data => data.count);
    },
  });

  const totalPages = Math.ceil(totalCount / limit);

  const { data: stamps = [], isLoading } = useQuery<Stamp[]>({
    queryKey: ['stamps', page, selectedCountries.join(',')],
    queryFn: () => {
      const url = countryParam
        ? `${API_BASE}/stamps?limit=${limit}&skip=${page * limit}&country=${countryParam}`
        : `${API_BASE}/stamps?limit=${limit}&skip=${page * limit}`;
      return fetch(url).then(res => res.json());
    },
  });

  const handleCountryToggle = (country: string) => {
    const next = selectedCountries.includes(country)
      ? selectedCountries.filter(c => c !== country)
      : [...selectedCountries, country];
    setSearchParams(next.length > 0 ? { country: next.join(','), page: '0' } : { page: '0' });
  };

  const handleClearSelection = () => {
    setSearchParams({ page: '0' });
  };

  const StampCard = ({ stamp }: { stamp: Stamp }) => {
    const needsImageUpdate = !stamp.image_url?.startsWith('http');
    return (
      <div className={`relative group rounded-lg bg-white flex flex-col border-2 shadow-sm hover:shadow-md transition-shadow ${needsImageUpdate ? 'border-amber-400' : 'border-gray-200'}`}>
        {needsImageUpdate && (
          <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded z-10">
            No Image
          </span>
        )}
        <Link
          to={`/edit/${stamp.country}/${stamp.scott_number}?page=${page}&country=${encodeURIComponent(stamp.country)}`}
          className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition z-10"
        >
          Edit
        </Link>
        <div className="bg-gray-50 rounded-t-lg flex items-center justify-center h-36 overflow-hidden">
          <img
            src={stamp.image_url?.startsWith('http') ? stamp.image_url : `${API_BASE}/images/${stamp.image_url}`}
            alt={stamp.name}
            className="max-h-full max-w-full object-contain p-2"
          />
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm leading-tight truncate text-gray-900">
            {stamp.name}{(stamp.quantity ?? 1) > 1 && <span className="text-gray-400 font-normal"> ({stamp.quantity})</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{stamp.scott_number} • {stamp.country}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6 px-4">
      {/* Sidebar */}
      <div className="w-56 shrink-0">
        <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-4">
          <div className="p-4 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            <button
              onClick={handleClearSelection}
              className={`w-full flex justify-between items-center px-4 py-2.5 text-sm text-left transition ${
                selectedCountries.length === 0
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-gray-50 text-gray-800'
              }`}
            >
              <span>All Countries</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCountries.length === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {totalStamps}
              </span>
            </button>
            {filteredCountries.map(({ country, count }) => {
              const isSelected = selectedCountries.includes(country);
              return (
                <button
                  key={country}
                  onClick={() => handleCountryToggle(country)}
                  className={`w-full flex justify-between items-center px-4 py-2.5 text-sm text-left border-t border-gray-50 transition ${
                    isSelected ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="truncate pr-2">{country}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stamp Grid */}
      <div className="flex-1 flex flex-col items-center">
        {isLoading ? (
          <div className="text-center p-10 text-lg text-gray-600">Loading stamps...</div>
        ) : stamps.length === 0 ? (
          <div className="text-center p-10 text-lg text-gray-600">No stamps found for the selected country.</div>
        ) : (
          <>
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {stamps.map(stamp => (
                <StampCard key={`${stamp.country}-${stamp.scott_number}`} stamp={stamp} />
              ))}
            </div>
            <div className="mt-8 flex gap-3 items-center">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="py-2 text-gray-700">Page {page + 1} of {totalPages}</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page + 1}
                key={page}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= totalPages) setPage(() => val - 1);
                  }
                }}
                className="w-16 px-2 py-2 border border-gray-300 rounded text-center text-sm"
              />
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 2. Main App with Router Layout
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation Bar */}
        <nav className="bg-blue-900 text-white shadow-lg mb-8">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-serif font-bold tracking-tight">
              Philatelic Archive
            </Link>
            <div className="space-x-6 font-medium">
              <Link to="/" className="hover:text-blue-200 transition">Collection</Link>
              <Link to="/statistics" className="hover:text-blue-200 transition">Statistics</Link>
              <Link to="/add" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded shadow">
                + Add Stamp
              </Link>
            </div>
          </div>
        </nav>

        {/* Dynamic Content Area */}
        <div className="container mx-auto pb-12">
          <Routes>
            <Route path="/" element={<CollectionView />} />
            <Route path="/add" element={<AddStampPage />} />
            <Route path="/edit/:country/:scott_number" element={<EditStampPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;