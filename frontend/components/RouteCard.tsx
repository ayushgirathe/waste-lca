'use client';
import { motion } from 'framer-motion';
import { Factory, DollarSign, Cloud, Droplet, Award, TrendingUp, Truck, MapPin, Wallet, Percent, TrendingDown } from 'lucide-react';

interface RouteCardProps {
  route: {
    vendor: string;
    process: string;
    cost: number;
    co2: number;
    water: number;
    recovery: number;
    incentive?: string;
    distance_km?: number;
    city?: string;
    state?: string;
    processing_cost_usd?: number;
    processing_cost_inr?: number;
    transport_cost_usd?: number;
    transport_cost_inr?: number;
    total_cost_usd?: number;
    processing_co2?: number;
    transport_co2?: number;
    total_co2?: number;
    profitability?: {
      waste_quantity_kg: number;
      revenue_usd: number;
      processing_cost_usd: number;
      transport_cost_usd: number;
      total_cost_usd: number;
      net_profit_usd: number;
      roi_percentage: number;
      payback_months: number;
      is_profitable: boolean;
      material_breakdown: Array<{
        name: string;
        estimated_kg: number;
        recovered_kg: number;
        price_per_kg_usd: number;
        revenue_usd: number;
      }>;
    };
  };
}

// Exchange rate: 1 USD = 93.78 INR
const USD_TO_INR = 93.78;

const formatINR = (amount: number) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatUSD = (amount: number) => {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function RouteCard({ route }: RouteCardProps) {
  const profitability = route.profitability;
  const cost = route.cost || route.total_cost_usd || 0;
  const co2 = route.co2 || route.total_co2 || 0;
  const hasTransport = route.distance_km && route.distance_km > 0;
  const processingCost = route.processing_cost_inr || (route.processing_cost_usd || route.cost || 0) * USD_TO_INR;
  const transportCost = route.transport_cost_inr || (route.transport_cost_usd || 0) * USD_TO_INR;
  const totalCost = processingCost + transportCost;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-dark-100 hover:shadow-lg bg-white dark:bg-dark-200 transition-all"
    >
      {/* Profitability Badge */}
      {profitability && (
        <div className={`absolute top-0 right-0 z-10 ${profitability.is_profitable ? 'bg-gradient-to-l from-green-500 to-emerald-600' : 'bg-gradient-to-l from-red-500 to-rose-600'} text-white text-xs px-3 py-1 rounded-bl-lg font-medium`}>
          {profitability.is_profitable ? `💰 Profit: ${formatINR(profitability.net_profit_usd * USD_TO_INR)}` : `⚠️ Loss: ${formatINR(Math.abs(profitability.net_profit_usd) * USD_TO_INR)}`}
        </div>
      )}

      <div className="p-5">
        {/* Vendor Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{route.vendor}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{route.process}</p>
              {route.city && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {route.city}, {route.state}
                </p>
              )}
            </div>
          </div>
          {route.distance_km && (
            <div className="text-right bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-sm font-semibold flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {route.distance_km} km
              </p>
            </div>
          )}
        </div>

        {/* Profitability Section */}
        {profitability && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profitability Analysis</span>
              <span className="text-xs text-gray-500">(per {profitability.waste_quantity_kg.toLocaleString()} kg)</span>
            </div>
            
            {/* Revenue vs Cost Summary */}
            <div className="grid grid-cols-2 gap-3 mb-3 pb-2 border-b border-purple-200 dark:border-purple-800">
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-lg font-bold text-green-600">{formatINR(profitability.revenue_usd * USD_TO_INR)}</p>
                <p className="text-xs text-gray-400">{formatUSD(profitability.revenue_usd)} USD</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cost</p>
                <p className="text-lg font-bold text-red-600">{formatINR(profitability.total_cost_usd * USD_TO_INR)}</p>
                <p className="text-xs text-gray-400">{formatUSD(profitability.total_cost_usd)} USD</p>
              </div>
            </div>
            
            {/* Profit & ROI */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Net Profit
                </p>
                <p className={`text-xl font-bold ${profitability.is_profitable ? 'text-green-600' : 'text-red-600'}`}>
                  {formatINR(profitability.net_profit_usd * USD_TO_INR)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  ROI
                </p>
                <p className={`text-xl font-bold ${profitability.roi_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitability.roi_percentage}%
                </p>
              </div>
            </div>
            
            {/* Payback Period */}
            {profitability.payback_months > 0 && profitability.payback_months < 60 && (
              <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-500">📈 Payback Period</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ~{profitability.payback_months} month{profitability.payback_months !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-2">💰 Cost Breakdown</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Processing Cost</span>
              <span className="font-medium">{formatINR(processingCost)}/kg</span>
            </div>
            {hasTransport && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Transport Cost
                </span>
                <span className="font-medium">{formatINR(transportCost)}/kg</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-dark-200 pt-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total Cost/kg</span>
                <span className="text-xl font-bold text-green-600">{formatINR(totalCost)}</span>
              </div>
              {route.processing_cost_usd && (
                <p className="text-xs text-gray-400 text-right mt-1">
                  ≈ {formatUSD(route.processing_cost_usd + (route.transport_cost_usd || 0))} USD
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-100 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 mb-2">🌍 Environmental Impact</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Processing CO₂</span>
                <span className="font-medium">{route.processing_co2 || route.co2 || 0} kg</span>
              </div>
              {hasTransport && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Transport CO₂
                  </span>
                  <span className="font-medium">{((co2) - (route.processing_co2 || route.co2 || 0)).toFixed(2)} kg</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-dark-200 mt-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Total CO₂/kg</span>
                  <span className="font-bold text-blue-600">{co2} kg</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <Droplet className="w-3 h-3" />
                  Water
                </span>
                <span className="font-medium">{route.water} L/kg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Recovery
                </span>
                <span className="font-medium">{route.recovery}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Incentive */}
        {route.incentive && (
          <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Award className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">{route.incentive}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}