
import { GoogleGenAI } from "@google/genai";
import { AppSettings } from "../types";

const MAX_DIMENSION = 1536; // Resize large images to this max dimension to speed up processing

// Helper: Resize image and return Base64 (without prefix) for Gemini
const processImageForGemini = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions if scaling is needed
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          // Fallback to raw base64 if canvas fails
          const raw = event.target?.result as string;
          resolve(raw.split(',')[1]); 
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as JPEG with 0.9 quality for optimal balance
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper: Resize image and return DataURL for OpenAI
const processImageForOpenAI = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
           if (width > height) {
             height = Math.round((height * MAX_DIMENSION) / width);
             width = MAX_DIMENSION;
           } else {
             width = Math.round((width * MAX_DIMENSION) / height);
             height = MAX_DIMENSION;
           }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
           resolve(event.target?.result as string);
           return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const generateWithGoogle = async (file: File, settings: AppSettings): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: settings.apiKey });
  // Use smart resizing
  const base64Data = await processImageForGemini(file);

  const response = await ai.models.generateContent({
    model: settings.model || 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg', // Always jpeg after resizing
          },
        },
        { text: settings.activePrompt }
      ]
    }
  });

  const candidate = response.candidates?.[0];
  if (!candidate) {
      throw new Error("API returned no candidates.");
  }

  // Check for truncation
  if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error("Response Truncated (Max Tokens). Try increasing the limit or shortening the prompt.");
  }
  
  // Other finish reasons that might indicate failure, though STOP is the normal one.
  // We generally accept STOP. 

  const text = response.text;
  if (!text && text !== "") {
       throw new Error("API returned an empty response.");
  }

  return text || "";
};

const generateWithOpenAI = async (file: File, settings: AppSettings): Promise<string> => {
  // Use smart resizing
  const imageUrl = await processImageForOpenAI(file);
  
  let rawBaseUrl = settings.baseUrl.trim();
  let baseUrl = rawBaseUrl.replace(/\/+$/, "");
  
  let apiUrl = baseUrl;

  if (apiUrl.endsWith('/chat/completions')) {
     // keep as is
  } else if (apiUrl.endsWith('/v1')) {
     apiUrl = `${apiUrl}/chat/completions`;
  } else {
     apiUrl = `${apiUrl}/v1/chat/completions`;
  }

  const payload = {
    model: settings.model || "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: settings.activePrompt },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    max_tokens: 2000
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error?.message || JSON.stringify(errorData);
      } catch (e) {
        // ignore
      }
      throw new Error(`API Error ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
        throw new Error("API returned no choices.");
    }

    if (choice.finish_reason === 'length') {
        throw new Error("Response Truncated (Max Tokens).");
    }
    
    if (choice.finish_reason === 'content_filter') {
        throw new Error("Response Filtered (Content Policy).");
    }

    const content = choice.message?.content;
    
    if (!content && content !== "") {
       throw new Error("API returned an empty response.");
    }
    
    return content || "";
  } catch (error: any) {
    console.error("API Request Failed:", error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Network Error: Could not connect to ${apiUrl}. Check CORS or URL.`);
    }
    throw error;
  }
};

export const generateCaption = async (
  file: File,
  settings: AppSettings
): Promise<string> => {
  if (!settings.apiKey) {
    throw new Error("Please configure your API Key in Settings.");
  }

  try {
    if (settings.protocol === 'google') {
      return await generateWithGoogle(file, settings);
    } else {
      return await generateWithOpenAI(file, settings);
    }
  } catch (error: any) {
    console.error("Generation Error:", error);
    throw new Error(error.message || "Failed to generate caption");
  }
};
