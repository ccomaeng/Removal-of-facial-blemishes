import { GoogleGenAI } from "@google/genai";

// Initialize the API client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends the image to Gemini to remove blemishes while keeping texture.
 * 
 * @param base64Image The base64 encoded string of the image (without the data URL prefix).
 * @param mimeType The mime type of the image (e.g., 'image/jpeg').
 * @returns The processed image as a base64 string.
 */
export const processFaceImage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    // Detailed prompt to ensure natural results and texture preservation
    const prompt = `
      You are a high-end beauty retoucher.
      Task: Remove temporary blemishes (acne, pimples, redness, small scars) from the face in this image.
      
      STRICT GUIDELINES:
      1. TEXTURE IS PARAMOUNT: Do NOT smooth the skin like a plastic filter. You must PRESERVE the original pores, skin grain, and lighting details. The goal is "invisible retouching".
      2. GEOMETRY: The output image MUST have the exact same dimensions and pixel alignment as the input. Do not crop, rotate, or shift the image.
      3. STRUCTURE: Do not change facial features (nose shape, jawline, eye size). Only heal the skin surface.
      4. SCOPE: Leave the background, hair, clothes, and eyes 100% untouched.
      5. Output: Return the fully processed image.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
        ]
      }
    });

    // Check for image parts in the response
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }

    throw new Error("No image data returned from the model.");

  } catch (error) {
    console.error("Gemini Image Processing Error:", error);
    throw error;
  }
};