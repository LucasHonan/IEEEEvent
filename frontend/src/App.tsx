import { useQuery } from '@tanstack/react-query';
import { FixedSizeGrid as Grid } from 'react-window';
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

// 1. Move the Collection View into its own component
const CollectionView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCountry = searchParams.get('country'); // null if not in URL
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

  // Fetch all countries
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ['countries'],
    queryFn: () => fetch(`${API_BASE}/countries`).then(res => res.json()),
  });

  // Filter countries based on search input
  const filteredCountries = countries.filter((country: string) =>
    country.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Fetch stamps for the selected country (or all stamps if no country selected)
  const { data: stamps = [], isLoading } = useQuery<Stamp[]>({
    queryKey: ['stamps', page, selectedCountry],
    queryFn: () => {
      const url = selectedCountry
        ? `${API_BASE}/stamps?limit=${limit}&skip=${page * limit}&country=${selectedCountry}`
        : `${API_BASE}/stamps?limit=${limit}&skip=${page * limit}`;
      return fetch(url).then(res => res.json());
    },
  });

  // Reset to page 0 and update the URL when country changes
  const handleCountrySelect = (country: string | null) => {
    setSearchParams(country ? { country, page: '0' } : { page: '0' });
  };

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * 4 + columnIndex;
    const stamp = stamps[index];
    if (!stamp) return null;

    const needsImageUpdate = !stamp.image_url?.startsWith('http');

    return (
          <div style={style} className="p-2">
            <div className={`relative group rounded shadow-sm bg-white h-full p-2 flex flex-col border-2 ${needsImageUpdate ? 'border-amber-400' : 'border-gray-300'}`}>
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
              <img
                src={stamp.image_url?.startsWith('http') ? stamp.image_url : `${API_BASE}/images/${stamp.image_url}`}
                alt={stamp.name}
                className="w-full h-32 object-contain bg-gray-50 mb-2"
              />
              <h3 className="font-bold text-sm truncate">{stamp.name}{(stamp.quantity ?? 1) > 1 && <span className="text-gray-400 font-normal"> ({stamp.quantity})</span>}</h3>
              <p className="text-xs text-gray-600">{stamp.scott_number} • {stamp.country}</p>
            </div>
          </div>
        );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Country Filter Section */}
      <div className="w-full max-w-4xl mb-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Filter by Country</h2>
        
        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search countries..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Country List */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCountrySelect(null)}
            className={`px-4 py-2 rounded font-medium transition ${
              selectedCountry === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All Countries
          </button>
          {filteredCountries.map((country) => (
            <button
              key={country}
              onClick={() => handleCountrySelect(country)}
              className={`px-4 py-2 rounded font-medium transition ${
                selectedCountry === country
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      {/* Stamps Grid */}
      {isLoading ? (
        <div className="text-center p-10 text-lg text-gray-600">Loading stamps...</div>
      ) : stamps.length === 0 ? (
        <div className="text-center p-10 text-lg text-gray-600">No stamps found for the selected country.</div>
      ) : (
        <>
          <Grid
            columnCount={4}
            columnWidth={250}
            height={600}
            rowCount={Math.ceil(stamps.length / 4)}
            rowHeight={220}
            width={1000}
          >
            {Cell}
          </Grid>
          
          {/* Pagination Controls */}
          <div className="mt-8 flex gap-4 items-center">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="py-2 font-mono text-gray-700">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={stamps.length < limit}
              className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </>
      )}
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