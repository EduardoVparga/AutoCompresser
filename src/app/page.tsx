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
// import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { LoadingAnimation } from "@/components/ui/loading-animation";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Preparar la UI y limpiar estados anteriores
    setIsLoading(true);
    setProcessedImage(null);

    // Mostrar la vista previa de la imagen original inmediatamente
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setOriginalImage(reader.result as string);
    };

    // 2. Preparar los datos para enviar al backend
    const formData = new FormData();
    formData.append("file", file);

    // 3. Realizar la llamada a la API
    try {
      // Asegúrate de que la URL y el puerto coincidan con tu backend en ejecución
      const response = await fetch("http://localhost:8000/reconstruct/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`La llamada a la API falló con estado: ${response.status}`);
      }

      const data = await response.json();
      const reconstructedImageBase64 = data.reconstructed_image;

      // 4. Actualizar la UI con la imagen procesada
      const processedImageUrl = `data:image/png;base64,${reconstructedImageBase64}`;
      setProcessedImage(processedImageUrl);

    } catch (error) {
      console.error("Error al procesar la imagen:", error);
      toast({
        variant: "destructive",
        title: "El procesamiento ha fallado",
        description: "No se pudo procesar la imagen. Asegúrate de que el backend esté en ejecución.",
      });
    } finally {
      // 5. Finalizar el estado de carga
      setIsLoading(false);
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
            Sube tu imagen y observa cómo nuestra IA hace su magia.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-8">
            <div className="w-full max-w-md">
              <Label htmlFor="image-upload" className="sr-only">
                Sube una imagen
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
                {isLoading ? "Procesando..." : "Subir Imagen"}
              </Button>
            </div>

            <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="flex flex-col items-center gap-4">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                  Imagen Original
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
                      <p>Sube una imagen para empezar</p>
                    </div>
                  )}
                </div>
              </div>
            
              <div className="flex flex-col items-center gap-4">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                  Imagen Procesada
                </h3>
                <div className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 p-2 overflow-hidden shadow-inner">
                  {isLoading ? (
                    // <Skeleton className="w-full h-full rounded-lg" />
                    <LoadingAnimation />
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
                      <p>Tu imagen procesada aparecerá aquí</p>
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