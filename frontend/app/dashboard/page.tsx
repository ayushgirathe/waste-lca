'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, Clock, XCircle, TrendingUp, Recycle, ArrowRight } from 'lucide-react';
import UploadForm from '@/components/UploadForm';
import MaterialChart from '@/components/MaterialChart';
import toast from 'react-hot-toast';

interface Task {
  id: number;
  file_name: string;
  status: string;
  extracted_materials?: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, failed: 0 });
  const [recoveryValue, setRecoveryValue] = useState(0);
  const [recoveryValueINR, setRecoveryValueINR] = useState(0);

  // Exchange rate
  const USD_TO_INR = 93.78;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchTasks();
  }, [router]);

  // Calculate recovery value from completed tasks
  const calculateRecoveryValue = (tasks: Task[]) => {
    // Market prices (USD per kg)
    const marketPrices: Record<string, number> = {
      copper: 8.95,
      aluminum: 2.35,
      gold: 58200,
      silver: 740,
      steel: 0.52,
      plastic: 0.35,
      lithium: 12.50,
      lead: 2.15,
      zinc: 2.85,
      tin: 28.50,
      nickel: 16.50,
    };

    let totalValue = 0;
    
    tasks.forEach(task => {
      if (task.status === 'completed' && task.extracted_materials) {
        try {
          const materials = JSON.parse(task.extracted_materials);
          // Assume each report represents 100kg of waste
          const wasteKg = 100;
          
          materials.forEach((material: any) => {
            const name = material.name.toLowerCase();
            const percentage = material.percentage;
            const weightKg = wasteKg * (percentage / 100);
            const price = marketPrices[name] || 1.0;
            totalValue += weightKg * price;
          });
        } catch (e) {
          console.error('Error parsing materials:', e);
        }
      }
    });
    
    return totalValue;
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/upload/tasks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      setTasks(data);
      
      // Calculate stats
      const completed = data.filter((t: Task) => t.status === 'completed').length;
      const pending = data.filter((t: Task) => t.status === 'pending').length;
      const failed = data.filter((t: Task) => t.status === 'failed').length;
      setStats({ total: data.length, completed, pending, failed });
      
      // Calculate recovery value
      const recovery = calculateRecoveryValue(data);
      setRecoveryValue(recovery);
      setRecoveryValueINR(recovery * USD_TO_INR);
      
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    toast.success('File uploaded successfully! Processing...');
    setTimeout(fetchTasks, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'pending': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'failed': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'bg-gray-50 dark:bg-dark-200 border-gray-200 dark:border-dark-100';
    }
  };

  const materials = selectedTask?.extracted_materials
    ? JSON.parse(selectedTask.extracted_materials)
    : null;

  // Format currency in Indian Rupees
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your waste analysis reports</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-dark-200 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Uploads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-200 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-200 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-200 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recovery Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatINR(recoveryValueINR)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ${recoveryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Upload Waste Report
              </h2>
              <UploadForm onUploadComplete={handleUploadComplete} />
            </div>

            {/* Uploads List */}
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6 mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Uploads</h3>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-dark-100 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No uploads yet</p>
                  <p className="text-sm text-gray-400 mt-1">Upload your first waste report</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedTask(task)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${getStatusColor(task.status)} ${
                        selectedTask?.id === task.id
                          ? 'ring-2 ring-blue-500 border-transparent'
                          : 'hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {task.file_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(task.created_at).toLocaleDateString()} • {task.status}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Analysis Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Recycle className="w-5 h-5 text-green-600" />
                Material Analysis
              </h2>
              
              {selectedTask ? (
                selectedTask.status === 'completed' && materials ? (
                  <div>
                    <MaterialChart data={materials} />
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      {materials.map((material: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-dark-100 rounded-lg">
                          <span className="text-sm font-medium capitalize">{material.name}</span>
                          <span className="text-sm font-semibold text-blue-600">{material.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedTask.status === 'processing' ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-500">Processing document...</p>
                  </div>
                ) : selectedTask.status === 'failed' ? (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600">Processing failed. Please try again.</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <p className="text-gray-500">Document uploaded. Processing will begin soon.</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Select an upload to see material breakdown</p>
                  <p className="text-sm text-gray-400 mt-1">Click on any file from the list</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}