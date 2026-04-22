'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Search, IndianRupee, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

interface MaterialPrice {
  name: string;
  price: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  source?: string;
  price_usd?: number;
}

export default function MarketPricesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(93.78); // Default value

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchExchangeRate();
    fetchPrices();
    
    const interval = setInterval(() => {
      fetchPrices();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router, currency]);

  const fetchExchangeRate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/market-prices/exchange-rate', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data.usd_to_inr || 93.78);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Keep default value
    }
  };

  const fetchPrices = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/market-prices/?currency=${currency}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        router.push('/');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch prices');

      const data = await response.json();
      
      if (data.success && data.prices) {
        const priceList: MaterialPrice[] = Object.entries(data.prices).map(([name, info]: [string, any]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          price: info.price,
          unit: info.unit,
          change: info.change || 0,
          trend: info.trend || 'stable',
          lastUpdated: info.last_updated || new Date().toISOString(),
          source: info.source,
          price_usd: info.price_usd
        }));
        
        setPrices(priceList);
        setLastUpdated(data.last_updated || new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast.error('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/market-prices/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Prices refreshed');
        await fetchExchangeRate();
        await fetchPrices();
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleCurrency = () => {
    const newCurrency = currency === 'INR' ? 'USD' : 'INR';
    setCurrency(newCurrency);
    toast.success(`Switched to ${newCurrency}`);
  };

  const formatPrice = (price: number) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `$${price.toLocaleString()}`;
  };

  const filteredPrices = prices.filter(price =>
    price.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
              Market Prices
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Commodity prices in {currency} {exchangeRate && `| 1 USD = ₹${exchangeRate.toFixed(2)}`}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={toggleCurrency}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-all"
            >
              {currency === 'INR' ? <DollarSign className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
              <span>Switch to {currency === 'INR' ? 'USD' : 'INR'}</span>
            </button>
            <button
              onClick={refreshPrices}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </motion.div>

        {/* Last Updated Info */}
        <div className="mb-4 text-right">
          <p className="text-xs text-gray-400">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Loading...'}
          </p>
        </div>

        {/* Price Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrices.length > 0 ? (
            filteredPrices.map((price, idx) => (
              <motion.div
                key={price.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-5 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{price.name}</h3>
                  <div className={`flex items-center space-x-1 ${
                    price.trend === 'up' ? 'text-green-600' : price.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {price.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{Math.abs(price.change)}%</span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(price.price)}
                    </p>
                    <p className="text-xs text-gray-500">{price.unit}</p>
                    {currency === 'INR' && price.price_usd && (
                      <p className="text-xs text-gray-400 mt-1">${price.price_usd} USD</p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    {currency === 'INR' ? (
                      <IndianRupee className="w-5 h-5 text-blue-600" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
                {price.source && (
                  <p className="text-xs text-gray-400 mt-3">
                    Source: {price.source}
                  </p>
                )}
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No price data available</p>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Wallet className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Currency Conversion:</strong> Prices shown in {currency} {exchangeRate && `using exchange rate 1 USD = ₹${exchangeRate.toFixed(2)}`}.
                {currency === 'INR' && ' Prices are displayed in Indian Rupees (₹) for your convenience.'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Supported metals: Copper, Aluminum, Gold, Silver, Steel, Lead, Zinc, Tin, Nickel, Lithium, Cobalt
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}