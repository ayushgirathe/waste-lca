'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, QrCode, CheckCircle, XCircle, Upload, Search, Link as LinkIcon, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

interface BlockchainRecord {
  block_id: number;
  timestamp: string;
  file_hash: string;
  file_name: string;
  block_hash: string;
  transaction_id: string;
}

export default function BlockchainPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [verifyHash, setVerifyHash] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchRecords();
  }, [router]);

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/blockchain/records', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const handleRecordDocument = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/blockchain/record', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadResult(data);
        toast.success('Document recorded on blockchain!');
        fetchRecords();
        setSelectedFile(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to record document');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyHash.trim()) {
      toast.error('Please enter a hash');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/blockchain/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ file_hash: verifyHash }),
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationResult(data);
        if (data.verified) {
          toast.success('Document verified on blockchain!');
        } else {
          toast.error('Document not found on blockchain');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-300 dark:via-dark-200 dark:to-dark-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold gradient-text">Blockchain Verification</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tamper-proof document verification</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Record Document Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Record Document</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload a document to record its hash on the blockchain. This creates a tamper-proof timestamp.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-300"
              />
            </div>
            
            <button
              onClick={handleRecordDocument}
              disabled={loading || !selectedFile}
              className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record on Blockchain'}
            </button>

            {uploadResult && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">✅ Recorded Successfully</p>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  Transaction ID: {uploadResult.transaction_id}
                </p>
                <p className="text-xs text-gray-500">Block ID: {uploadResult.block_id}</p>
                {uploadResult.qr_code && (
                  <div className="mt-2 flex justify-center">
                    <QRCodeSVG value={uploadResult.verification_url} size={100} />
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Verify Document Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verify Document</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter a file hash or transaction ID to verify authenticity on the blockchain.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Hash or Transaction ID
              </label>
              <input
                type="text"
                placeholder="0x... or hash value"
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                className="w-full border border-gray-300 dark:border-dark-100 rounded-lg p-2 bg-white dark:bg-dark-300"
              />
            </div>
            
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify on Blockchain'}
            </button>

            {verificationResult && (
              <div className={`mt-4 p-3 rounded-lg ${verificationResult.verified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-2">
                  {verificationResult.verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`font-medium ${verificationResult.verified ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.verified ? 'Verified ✓' : 'Not Verified ✗'}
                  </p>
                </div>
                {verificationResult.verified && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="text-gray-500">File:</span> {verificationResult.file_name}</p>
                    <p><span className="text-gray-500">Block ID:</span> {verificationResult.block_id}</p>
                    <p><span className="text-gray-500">Timestamp:</span> {new Date(verificationResult.timestamp).toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Block Hash:</span>
                      <code className="text-xs bg-gray-100 dark:bg-dark-100 p-1 rounded break-all">{verificationResult.block_hash?.slice(0, 20)}...</code>
                      <button onClick={() => copyToClipboard(verificationResult.block_hash)} className="p-1 hover:bg-gray-200 rounded">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    {verificationResult.qr_code && (
                      <div className="mt-2 flex justify-center">
                        <img src={`data:image/png;base64,${verificationResult.qr_code}`} alt="Verification QR" className="w-24 h-24" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-100">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Blockchain Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Block ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {records.map((record) => (
                  <tr key={record.block_id} className="hover:bg-gray-50 dark:hover:bg-dark-100">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">#{record.block_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{record.file_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      {record.transaction_id?.slice(0, 16)}...
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setVerifyHash(record.file_hash);
                          handleVerify();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No blockchain records yet. Upload a document to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}