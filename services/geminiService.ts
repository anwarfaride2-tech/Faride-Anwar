
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, Resolution, AudioType } from "../types";

export const generateVeoVideo = async (
  base64Image: string,
  aspectRatio: AspectRatio,
  resolution: Resolution,
  audioType: AudioType,
  onProgress: (message: string) => void
): Promise<string> => {
  // Always create a new instance to get the latest API key from global scope
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let audioDescription = "realistic environmental";
  if (audioType === 'city') audioDescription = "bustling city ambiance with distant traffic and street sounds";
  if (audioType === 'nature') audioDescription = "peaceful nature sounds with birds chirping and rustling leaves";
  if (audioType === 'quiet') audioDescription = "subtle quiet room atmosphere with faint background hum";

  const prompt = `Convert this image into a raw, unedited video captured with a rear phone camera. Handheld footage, subtle motion, natural lighting, slight exposure shifts, focus breathing, and ${audioDescription} audio. No filters, no cinematic effects — just authentic smartphone footage.`;

  try {
    onProgress("Initiating video generation process...");
    let operation;
    
    try {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
          imageBytes: base64Image.split(',')[1], // Remove data:image/png;base64,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        }
      });
    } catch (initialError: any) {
      console.error("Initial generation error:", initialError);
      if (initialError?.message?.includes("permission") || initialError?.message?.includes("PERMISSION_DENIED")) {
        throw new Error("PERMISSION_DENIED: Please ensure you selected an API key from a project with active billing.");
      }
      throw initialError;
    }

    onProgress("Veo is dreaming up your video. This usually takes a few minutes...");
    
    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
        onProgress(getRandomReassuringMessage());
      } catch (pollError: any) {
        console.error("Polling error:", pollError);
        // Reset key selection if entity not found or permission error occurs
        if (
          pollError?.message?.includes("Requested entity was not found") || 
          pollError?.message?.includes("permission") ||
          pollError?.message?.includes("PERMISSION_DENIED")
        ) {
           throw new Error("API Key session expired or lacks permission. Please re-select a key from a paid project.");
        }
        throw pollError;
      }
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Generation completed but no video link was found.");
    }

    onProgress("Video ready! Fetching your masterpiece...");
    
    // Append API key to the download link as required
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        if (response.status === 403) {
          throw new Error("PERMISSION_DENIED: Access to the generated file was denied. Check project billing.");
        }
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Video generation failed:", error);
    throw error;
  }
};

const REASSURING_MESSAGES = [
  "Our AI is meticulously crafting the handheld motion...",
  "Simulating focus breathing for that authentic look...",
  "Adding natural light shifts and exposure variations...",
  "The engine is rendering environmental audio textures...",
  "Fine-tuning the subtle camera shake for realism...",
  "Applying the finishing touches to the smartphone aesthetic...",
  "We're almost there, authenticating every frame...",
  "Generating the raw rear-camera feel...",
  "Nearly finished! Preparing the final MP4 stream..."
];

function getRandomReassuringMessage() {
  return REASSURING_MESSAGES[Math.floor(Math.random() * REASSURING_MESSAGES.length)];
}
