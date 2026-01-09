"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Upload, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({
  onSignatureChange,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Responsive canvas sizing - use container width, maintain aspect ratio
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const aspectRatio = width / height;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        // Use full container width (minus border)
        const containerWidth = containerRef.current.clientWidth - 4; // -4 for border
        const newWidth = Math.max(containerWidth, 200); // minimum 200px
        const newHeight = Math.round(newWidth / aspectRatio);
        setCanvasSize({ width: newWidth, height: newHeight });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [aspectRatio]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing styles - thick line for better visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5; // Increased from 3 for thicker strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear to transparent (no white background)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  }, [canvasSize]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor between displayed size and canvas logical size
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing && hasSignature) {
      saveSignature();
    }
    setIsDrawing(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get signature as base64 PNG
    const signatureData = canvas.toDataURL("image/png");
    onSignatureChange(signatureData);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Clear to transparent
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target?.result as string;
      setUploadedImage(imgData);
      setHasSignature(true);
      onSignatureChange(imgData);
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setHasSignature(false);
    onSignatureChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "draw" | "upload");
    // Clear signature when switching tabs
    if (value === "draw") {
      clearUpload();
      clearCanvas();
    } else {
      clearCanvas();
    }
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Draw Signature
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-4">
          <div className="space-y-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg overflow-hidden",
                "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDIwIEwgMjAgMjAgMjAgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTVlN2ViIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IndoaXRlIi8+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]",
                isDrawing ? "border-[#ff5603]" : "border-gray-300"
              )}
            >
              <canvas
                ref={canvasRef}
                className="touch-none cursor-crosshair block"
                style={{ width: canvasSize.width, height: canvasSize.height }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Sign above using your mouse or finger
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={!hasSignature}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="space-y-3">
            {uploadedImage ? (
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white p-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-[200px] mx-auto object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={clearUpload}
                  className="absolute top-2 right-2 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <label
                htmlFor="signature-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-white p-8 cursor-pointer hover:border-[#ff5603] transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Click to upload signature image</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                <input
                  ref={fileInputRef}
                  id="signature-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
