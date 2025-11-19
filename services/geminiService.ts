
import { GoogleGenAI } from "@google/genai";
import { AppSettings } from "../types";

// Helper to convert File to Base64 (Raw) - for Gemini
const fileToBase64Raw = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to convert File to Data URL - for OpenAI
const fileToDataURL = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const generateWithGoogle = async (file: File, settings: AppSettings): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: settings.apiKey });
  const base64Data = await fileToBase64Raw(file);

  const response = await ai.models.generateContent({
    model: settings.model || 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        },
        { text: settings.activePrompt }
      ]
    }
  });

  return response.text || "";
};

const generateWithOpenAI = async (file: File, settings: AppSettings): Promise<string> => {
  const imageUrl = await fileToDataURL(file);
  
  let rawBaseUrl = settings.baseUrl.trim();
  // Remove trailing slashes to simplify logic
  let baseUrl = rawBaseUrl.replace(/\/+$/, "");
  
  let apiUrl = baseUrl;

  // Intelligent URL construction to match standard OpenAI-compatible providers
  if (apiUrl.endsWith('/chat/completions')) {
     // User provided the full endpoint, trust it.
  } else if (apiUrl.endsWith('/v1')) {
     // User provided .../v1, append /chat/completions
     apiUrl = `${apiUrl}/chat/completions`;
  } else {
     // User provided root domain (e.g. https://api.example.com)
     // Most compatible providers require /v1/chat/completions
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
        // ignore json parse error
      }
      throw new Error(`API Error ${response.status}: ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content && content !== "") {
       throw new Error("API returned an empty response (no content found).");
    }
    
    return content || "";
  } catch (error: any) {
    console.error("API Request Failed:", error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Network Error: Could not connect to ${apiUrl}. This is often caused by CORS issues (browser blocking the request) or an incorrect Base URL. Please check if the provider supports browser-based requests.`);
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
