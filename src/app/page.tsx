"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setOriginalImage(result);
        setProcessedImage(null);
        setIsLoading(true);

        // Simulate an API call to process the image
        setTimeout(() => {
          // In a real application, this would be the result from your API
          setProcessedImage(result);
          setIsLoading(false);
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center bg-card p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-4">
            <Wand2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-4xl font-headline font-bold tracking-tight">
            Image Shifter
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            Upload your image and watch our AI work its magic.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-8">
            <div className="w-full max-w-md">
              <Label htmlFor="image-upload" className="sr-only">
                Upload an image
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
                disabled={isLoading}
              />
              <Button
                onClick={triggerFileDialog}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 transform hover:scale-105"
                size="lg"
                disabled={isLoading}
              >
                <Upload className="mr-2 h-5 w-5" />
                {isLoading ? "Processing..." : "Upload Image"}
              </Button>
            </div>

            <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="flex flex-col items-center gap-4">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                  Processed Image
                </h3>
                <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 p-2 overflow-hidden shadow-inner">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-lg" />
                  ) : processedImage ? (
                    <Image
                      src={processedImage}
                      alt="Processed image"
                      width={500}
                      height={281}
                      className="rounded-lg object-contain w-full h-full"
                      data-ai-hint="abstract art"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Wand2 className="mx-auto h-12 w-12 opacity-50 mb-2" />
                      <p>Your processed image will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                  Original Image
                </h3>
                <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 p-2 overflow-hidden shadow-inner">
                  {originalImage ? (
                    <Image
                      src={originalImage}
                      alt="Original image"
                      width={500}
                      height={281}
                      className="rounded-lg object-contain w-full h-full"
                      data-ai-hint="photo upload"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Upload className="mx-auto h-12 w-12 opacity-50 mb-2" />
                      <p>Upload an image to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
