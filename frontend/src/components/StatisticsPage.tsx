import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://localhost:8000';

interface CountryStats {
  country: string;
  count: number;
  total_value: number;
}

interface StatisticsData {
  by_country: CountryStats[];
  grand_total_value: number;
  total_countries: number;
  total_stamps: number;
}

const StatisticsPage = () => {
  const { data: stats, isLoading } = useQuery<StatisticsData>({
    queryKey: ['statistics'],
    queryFn: () => fetch(`${API_BASE}/statistics`).then(res => res.json()),
  });

  if (isLoading) {
    return <div className="text-center p-10 text-lg text-gray-600">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center p-10 text-lg text-gray-600">No data available</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Countries</p>
          <p className="text-4xl font-bold text-blue-600">{stats.total_countries}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Stamps</p>
          <p className="text-4xl font-bold text-green-600">{stats.total_stamps}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
          <p className="text-gray-600 text-sm font-medium mb-2">Total Collection Value</p>
          <p className="text-4xl font-bold text-purple-600">{formatCurrency(stats.grand_total_value)}</p>
        </div>
      </div>

      {/* Country Details Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Country Breakdown</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Country</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Count</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Total Value</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Avg Value</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.by_country.map((item, index) => {
                const avgValue = item.count > 0 ? item.total_value / item.count : 0;
                const percentOfTotal = (item.total_value / stats.grand_total_value) * 100;
                
                return (
                  <tr
                    key={item.country}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.country}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.total_value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {formatCurrency(avgValue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentOfTotal}%` }}
                          ></div>
                        </div>
                        <span className="w-12 text-right">{percentOfTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
