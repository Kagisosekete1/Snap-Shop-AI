import { GoogleGenAI, Type } from "@google/genai";
import { ApiResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

// Fix: Define a response schema to enforce structured JSON output from the model.
const shoppingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    identifiedProduct: {
      type: Type.STRING,
      description: "A description of the identified item.",
    },
    searchResults: {
      type: Type.ARRAY,
      description: "A list of online stores where the product can be purchased.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the product listing." },
          link: { type: Type.STRING, description: "A valid URL to the product page." },
          imageUrl: { type: Type.STRING, description: "URL of an image for the product listing." },
          price: { type: Type.STRING, description: "The price of the product, including currency." },
          storeName: { type: Type.STRING, description: "The name of the online store." },
        },
        required: ["title", "link"],
      },
    },
  },
  required: ["identifiedProduct", "searchResults"],
};


// Helper to safely parse JSON from the model's text response
// Fix: Simplified parser as responseMimeType: "application/json" guarantees a clean JSON string.
const parseGeminiResponse = (responseText: string): ApiResult => {
    try {
        const data = JSON.parse(responseText);

        // Basic validation of the parsed data structure
        if (typeof data.identifiedProduct === 'string' && Array.isArray(data.searchResults)) {
            return {
                identifiedProduct: data.identifiedProduct,
                searchResults: data.searchResults.map((item: any) => ({
                    title: item.title || 'Untitled',
                    link: item.link || '#',
                    imageUrl: item.imageUrl,
                    price: item.price,
                    storeName: item.storeName,
                })).filter(item => item.link !== '#'),
            };
        }
        console.warn("Parsed JSON from Gemini does not match expected structure.", data);
        // Fallback for correctly parsed JSON that doesn't match the expected structure.
        return {
            identifiedProduct: "The AI response was not in the expected format.",
            searchResults: [],
        };
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", e);
        // Fallback if JSON.parse throws
        return {
            identifiedProduct: `An error occurred while processing the AI response.`,
            searchResults: [],
        };
    }
};


export const identifyAndSearch = async (base64Image: string, mimeType: string, location?: string): Promise<ApiResult> => {
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    
    let prompt = 'You are an expert shopping assistant. Look at this image and identify the main product. Then, find up to 20 online stores where this product can be purchased.';
    if (location) {
        prompt += ` Prioritize local physical stores near "${location}" if possible, otherwise list online retailers.`;
    }
    prompt += ' Provide details for each shopping result including a title, link, image URL, price, and the store name.';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [imagePart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: shoppingResponseSchema,
      },
    });

    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to identify and search: ${error.message}`);
    }
    throw new Error("An unknown error occurred during the Gemini API call.");
  }
};

export const searchWithText = async (query: string, location?: string): Promise<ApiResult> => {
    try {
        let prompt = `You are an expert shopping assistant. The user is looking for "${query}". Identify the product and find up to 20 online stores where it can be purchased.`;
        if (location) {
            prompt += ` Prioritize local physical stores near "${location}" if possible, otherwise list online retailers.`;
        }
        prompt += ' Provide details for each shopping result including a title, link, image URL, price, and the store name.';

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: shoppingResponseSchema,
            },
        });

        return parseGeminiResponse(response.text);
    } catch (error) {
        console.error("Error calling Gemini API for text search:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to search with text: ${error.message}`);
        }
        throw new Error("An unknown error occurred during the Gemini API call for text search.");
    }
};