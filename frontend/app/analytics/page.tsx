'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Leaf, Recycle, Download, Calendar, Filter, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  stats: {
    total_waste_kg: number;
    total_co2_saved: number;
    total_water_saved: number;
    total_material_value: number;
    total_reports: number;
    total_materials: number;
    recovery_rate: number;
  };
  monthly_trend: Array<{ month: string; waste: number; count: number }>;
  material_breakdown: Array<{ name: string; value: number }>;
  recent_tasks: Array<{ id: number; file_name: string; status: string; created_at: string; materials: any[] }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [exporting, setExporting] = useState(false);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchAnalytics();
  }, [router, dateRange]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/analytics/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/upload/tasks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const tasks = await response.json();
        const headers = ['Date', 'File Name', 'Status', 'Materials', 'Recovery Value'];
        const rows = tasks.map((task: any) => [
          new Date(task.created_at).toLocaleDateString(),
          task.file_name,
          task.status,
          task.extracted_materials ? JSON.parse(task.extracted_materials).map((m: any) => `${m.name}(${m.percentage}%)`).join(', ') : 'N/A',
          '-'
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported successfully!');
      }
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Loading analytics from your data...</p>
        </div>
      </div>
    );
  }

  if (!data || data.stats.total_reports === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Recycle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Data Yet</h2>
          <p className="text-gray-500 mb-6">
            Upload waste analysis reports to see your recycling impact analytics.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Real analytics from your {data.stats.total_reports} uploaded reports
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-gray-100 dark:bg-dark-100 rounded-lg p-1">
              {(['month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 rounded-md text-sm transition-all ${
                    dateRange === range
                      ? 'bg-white dark:bg-dark-200 shadow-sm text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Cards - Real Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Waste Processed"
            value={`${data.stats.total_waste_kg.toLocaleString()} kg`}
            subtitle={`From ${data.stats.total_reports} reports`}
            icon={Recycle}
            color="blue"
          />
          <StatCard
            title="CO₂ Emissions Saved"
            value={`${data.stats.total_co2_saved.toLocaleString()} kg`}
            subtitle="Equivalent to planting trees"
            icon={Leaf}
            color="green"
          />
          <StatCard
            title="Water Saved"
            value={`${(data.stats.total_water_saved / 1000).toLocaleString()} kL`}
            subtitle={`${data.stats.total_water_saved.toLocaleString()} liters`}
            icon={DropletIcon}
            color="cyan"
          />
          <StatCard
            title="Material Value Recovered"
            value={`₹${(data.stats.total_material_value * 83.5).toLocaleString('en-IN')}`}
            subtitle={`$${data.stats.total_material_value.toLocaleString()} USD`}
            icon={DollarSign}
            color="yellow"
          />
        </div>

        {/* Charts - Real Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Waste Processed Trend</h2>
            {data.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    formatter={(value) => [`${value} kg`, 'Waste']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="waste" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Waste (kg)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Upload more reports to see trends
              </div>
            )}
          </motion.div>

          {/* Material Breakdown - Real Data */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Material Composition</h2>
            {data.material_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.material_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => {
                      const pct = percent !== undefined ? (percent * 100).toFixed(0) : '0';
                      return `${name} ${pct}%`;
                    }}
                  >
                    {data.material_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No material data available yet
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Tasks Table - Real Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-100">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Uploads</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {data.recent_tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(task.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                      {task.file_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[300px]">
                      {task.materials.length > 0 
                        ? task.materials.slice(0, 3).map((m: any) => `${m.name}(${m.percentage}%)`).join(', ')
                        : 'Processing...'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Data Source Note */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Powered by your data:</strong> All analytics are calculated from your uploaded waste analysis reports.
                Each report contributes to your environmental impact metrics.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'cyan' | 'yellow' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600',
  green: 'bg-green-100 dark:bg-green-900/20 text-green-600',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600',
  purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600',
};

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-dark-200 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}