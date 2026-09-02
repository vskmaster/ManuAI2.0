import React, { useState, useEffect, useRef } from "react";
import { Upload, X, AlertCircle, ShieldAlert } from "lucide-react";

interface ProblemImageUploaderProps {
  onImagesChange: (base64Images: string[]) => void;
  maxFiles?: number;
}

export default function ProblemImageUploader({ onImagesChange, maxFiles = 2 }: ProblemImageUploaderProps) {
  const [images, setImages] = useState<{ id: string; url: string; base64: string; type: "site" | "area" | "general" }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onImagesChange(images.map((item) => item.base64));
  }, [images, onImagesChange]);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed for problem area visualization.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }
    if (images.length >= maxFiles) {
      setError(`You can only upload up to ${maxFiles} problem images (Site Image and Area Image).`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const determinedType = images.length === 0 ? "site" : "area";
      const newImage = {
        id: `prob_img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        url: URL.createObjectURL(file),
        base64: base64String,
        type: determinedType as "site" | "area",
      };

      setImages((prev) => {
        if (prev.length >= maxFiles) return prev;
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
    <div id="problem-image-uploader-module" className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Attached Problem Upload Images</span>
        </h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-xs rounded-lg p-3 animate-pulse">
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
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
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
        <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full w-10 h-10 flex items-center justify-center mb-2 border border-slate-200/50 dark:border-slate-700/50">
          <Upload className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
          Drag & drop problem images here or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse files</span>
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          Accepts max 2 images (JPG, PNG, WEBP)
        </p>
      </div>

      {/* Previews labeled by type */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video flex flex-col justify-end">
              <img src={img.url} alt="Problem Site/Area preview" className="absolute inset-0 object-cover w-full h-full" />
              
              {/* Overlay Badge for Type */}
              <div className="absolute top-2 left-2 z-10 bg-slate-900/85 backdrop-blur-md text-white font-mono font-bold text-[9px] uppercase px-2 py-0.5 rounded border border-slate-800 shadow-sm">
                {idx === 0 ? "Problem Site Image" : "Problem Area Image"}
              </div>

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
