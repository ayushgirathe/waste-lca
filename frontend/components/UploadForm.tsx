'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '@/lib/api';

interface UploadFormProps {
  onUploadComplete: (taskId: number) => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadFile(file);
      onUploadComplete(res.task_id);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
      >
        <input {...getInputProps()} disabled={uploading} />
        {uploading ? (
          <p className="text-gray-600">Uploading and processing... This may take a moment.</p>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-gray-600">Drag & drop a PDF or image, or click to select</p>
            <p className="text-sm text-gray-400 mt-2">Supports PDF, PNG, JPG</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
    </div>
  );
}