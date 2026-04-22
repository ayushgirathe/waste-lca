'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, TrendingDown, Leaf, MapPin, Navigation, Wallet, Percent } from 'lucide-react';
import RouteCard from '@/components/RouteCard';
import toast from 'react-hot-toast';

// Exchange rate: 1 USD = 93.78 INR
const USD_TO_INR = 93.78;

export default function RecommendationsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState('');
  const [preference, setPreference] = useState('cost');
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [manualCity, setManualCity] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [wasteQuantity, setWasteQuantity] = useState(1000); // Default 1000 kg

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) router.push('/');
  }, [router]);

  const searchCity = async () => {
    if (!manualCity.trim()) {
      toast.error('Please enter a city name');
      return;
    }

    setIsSearchingCity(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name.split(',')[0]
        });
        toast.success(`Location set to ${data[0].display_name.split(',')[0]}`);
        setManualCity('');
      } else {
        toast.error('City not found. Please try a different name.');
      }
    } catch (error) {
      console.error('Error searching city:', error);
      toast.error('Could not find location. Please try again.');
    } finally {
      setIsSearchingCity(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Detecting location...', { id: 'location' });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const address = data.display_name?.split(',')[0] || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setLocation({
            lat: latitude,
            lng: longitude,
            address: address
          });
          toast.success('Location detected!', { id: 'location' });
        } catch {
          setLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          });
          toast.success('Location detected!', { id: 'location' });
        }
      },
      (error) => {
        console.error('Location error:', error);
        let errorMessage = 'Could not get location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access or enter manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location unavailable. Please enter manually.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please enter your location manually.';
        }
        toast.error(errorMessage, { id: 'location' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  const materialList = materials.split(',').map(m => m.trim().toLowerCase()).filter(m => m);
  
  if (materialList.length === 0) {
    toast.error('Please enter at least one material');
    setLoading(false);
    return;
  }
  
  try {
    const token = localStorage.getItem('access_token');
    
    const requestBody = {
      materials: materialList,
      preference: preference,
      user_lat: location?.lat,
      user_lng: location?.lng,
      waste_quantity_kg: wasteQuantity,
    };
    
    console.log('Sending request:', requestBody);
    
    const response = await fetch('http://localhost:8000/recommend/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 401) {
      localStorage.removeItem('access_token');
      router.push('/');
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error('Failed to get recommendations');
    }

    const data = await response.json();
    console.log('Received routes:', data.routes);
    
    const routesWithINR = (data.routes || []).map((route: any) => ({
      ...route,
      processing_cost_usd: route.processing_cost || route.cost || 0,
      transport_cost_usd: route.transport_cost_per_kg || 0,
      total_cost_usd: route.total_cost_per_kg || route.cost || 0,
      processing_cost_inr: (route.processing_cost || route.cost || 0) * USD_TO_INR,
      transport_cost_inr: (route.transport_cost_per_kg || 0) * USD_TO_INR,
      cost: (route.total_cost_per_kg || route.cost || 0) * USD_TO_INR,
      co2: route.total_co2_per_kg || route.co2 || 0,
      distance_km: route.distance_km,
      city: route.city,
      state: route.state,
      currency: 'INR',
      profitability: route.profitability
    }));
    
    setRoutes(routesWithINR);
    
    if (routesWithINR.length === 0) {
      toast.error('No recycling routes found for these materials');
    } else {
      toast.success(`Found ${routesWithINR.length} recycling routes sorted by ${preference === 'profit' ? 'highest profit' : preference === 'roi' ? 'highest ROI' : preference}`);
    }
  } catch (err) {
    console.error('Error:', err);
    toast.error('Failed to get recommendations');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text">Recycling Recommendations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Find the best recycling options for your waste</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Search Parameters
              </h2>
              
              {/* Location Section */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Your Location</span>
                </div>
                
                {location ? (
                  <div className="mb-2">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ {location.address}
                    </p>
                    <button
                      onClick={() => setLocation(null)}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Clear location
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Enter city name (e.g., Mumbai)"
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        className="flex-1 text-sm p-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300"
                        onKeyPress={(e) => e.key === 'Enter' && searchCity()}
                      />
                      <button
                        onClick={searchCity}
                        disabled={isSearchingCity}
                        className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isSearchingCity ? '...' : 'Set'}
                      </button>
                    </div>
                    <div className="text-center text-xs text-gray-400 my-1">or</div>
                    <button
                      onClick={detectLocation}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-dark-100 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      Use my current location
                    </button>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {location ? 'Distance to vendors will be calculated' : 'Set your location for distance-based sorting'}
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Materials (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., copper, gold, plastic"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    className="w-full border border-gray-300 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Example: copper, gold, plastic, aluminum</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Waste Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={wasteQuantity}
                    onChange={(e) => setWasteQuantity(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    step="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to calculate profit and ROI</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Optimization Preference
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    <button
                      type="button"
                      onClick={() => setPreference('cost')}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        preference === 'cost'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-gray-200 dark:border-dark-100 hover:border-blue-300'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 mx-auto mb-1" />
                      <span>Cost</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreference('emissions')}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        preference === 'emissions'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                          : 'border-gray-200 dark:border-dark-100 hover:border-green-300'
                      }`}
                    >
                      <Leaf className="w-4 h-4 mx-auto mb-1" />
                      <span>CO₂</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreference('distance')}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        preference === 'distance'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                          : 'border-gray-200 dark:border-dark-100 hover:border-orange-300'
                      }`}
                    >
                      <MapPin className="w-4 h-4 mx-auto mb-1" />
                      <span>Distance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreference('profit')}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        preference === 'profit'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                          : 'border-gray-200 dark:border-dark-100 hover:border-purple-300'
                      }`}
                    >
                      <Wallet className="w-4 h-4 mx-auto mb-1" />
                      <span>Profit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreference('roi')}
                      className={`p-2 rounded-lg border transition-all text-xs ${
                        preference === 'roi'
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                          : 'border-gray-200 dark:border-dark-100 hover:border-indigo-300'
                      }`}
                    >
                      <Percent className="w-4 h-4 mx-auto mb-1" />
                      <span>ROI</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2">Finding routes...</span>
                    </div>
                  ) : (
                    'Get Recommendations'
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {routes.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recommended Routes ({routes.length} found)
                  </h3>
                  <div className="text-sm text-gray-500">
                    {location && preference === 'distance' && '✓ Sorted by distance'}
                    {preference === 'cost' && '✓ Sorted by total cost (incl. transport)'}
                    {preference === 'emissions' && '✓ Sorted by total CO₂ (incl. transport)'}
                    {preference === 'profit' && '✓ Sorted by highest profit'}
                    {preference === 'roi' && '✓ Sorted by highest ROI'}
                    {!location && ' (set location for distance sorting)'}
                  </div>
                </div>
                <div className="space-y-4">
                  {routes.map((route, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <RouteCard route={route} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No recommendations yet
                </h3>
                <p className="text-gray-500">
                  Enter materials above to find recycling routes
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}