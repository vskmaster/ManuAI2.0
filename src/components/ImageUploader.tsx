import React, { useState, useEffect, useRef } from "react";
import Upload from "lucide-react/dist/esm/icons/upload";
import X from "lucide-react/dist/esm/icons/x";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

interface ImageUploaderProps {
  onImagesChange: (base64Images: string[]) => void;
  maxFiles?: number;
}

export default function ImageUploader({ onImagesChange, maxFiles = 3 }: ImageUploaderProps) {
  const [images, setImages] = useState<{ id: string; url: string; base64: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state with parent on images changes securely and cleanly
  useEffect(() => {
    onImagesChange(images.map((item) => item.base64));
  }, [images, onImagesChange]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed as evidence.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }
    if (images.length >= maxFiles) {
      setError(`You can only upload up to ${maxFiles} evidence images.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        url: URL.createObjectURL(file),
        base64: base64String,
      };

      setImages((prev) => {
        if (prev.length >= maxFiles) {
          return prev;
        }
        return [...prev, newImage];
      });
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file: any) => processFile(file));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: any) => processFile(file));
    }
  };

  const handleRemove = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setError("");
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="image-uploader-module" className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
          Upload Photos & Evidence
        </h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-xs rounded-lg p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/10 scale-[0.99]"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3 border border-slate-200/50 dark:border-slate-700/50">
          <Upload className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Drag & drop images here or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse files</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supports JPG, PNG, WEBP (Max 5MB each)
        </p>
      </div>

      {/* Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video flex items-center justify-center">
              <img src={img.url} alt="Evidence preview" className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(img.id);
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 shadow-md active:scale-90 transition-transform"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
