import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArtStyle, Quality, ReferenceImage, AppSettings, AIProvider } from "../types";

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

// Helper: Resize image to reduce payload size (Critical for free HF API)
const resizeImage = (base64: string, mimeType: string, maxDim: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        // No crossOrigin needed for Data URLs created from local strings
        img.src = `data:${mimeType};base64,${base64}`;
        img.onload = () => {
            let { width, height } = img;
            // If already small enough, return original
            if (width <= maxDim && height <= maxDim) {
                resolve(base64);
                return;
            }
            // Calculate new aspect ratio
            if (width > height) {
                height *= maxDim / width;
                width = maxDim;
            } else {
                width *= maxDim / height;
                height = maxDim;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to JPEG with compression to save bandwidth
                const newData = canvas.toDataURL('image/jpeg', 0.8);
                resolve(newData.split(',')[1]);
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => {
            console.warn("Resize failed, using original");
            resolve(base64);
        };
    });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const validateApiKey = async (settings: AppSettings): Promise<boolean> => {
  try {
    if (settings.provider === 'pollinations') {
        return true; // No key needed
    }
    else if (settings.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: settings.apiKey });
        await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'hi' });
        return true;
    } 
    else if (settings.provider === 'openai') {
        const baseUrl = settings.baseUrl || 'https://api.openai.com/v1';
        const res = await fetch(`${baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${settings.apiKey}` }
        });
        return res.ok;
    }
    else if (settings.provider === 'stability') {
        const baseUrl = settings.baseUrl || 'https://api.stability.ai/v1';
        const res = await fetch(`${baseUrl}/user/account`, {
            headers: { 'Authorization': `Bearer ${settings.apiKey}` }
        });
        return res.ok;
    }
    else if (settings.provider === 'huggingface') {
        // Method 1: Check whoami (Standard check for valid token)
        try {
            const res = await fetch('https://huggingface.co/api/whoami-v2', {
                headers: { 'Authorization': `Bearer ${settings.apiKey}` }
            });
            if (res.ok) return true;
        } catch (e) {
            console.warn("HF whoami check failed, trying fallback", e);
        }

        // Method 2: Check Model Status (Fallback)
        try {
            const res = await fetch('https://api-inference.huggingface.co/status/timbrooks/instruct-pix2pix', {
                headers: { 'Authorization': `Bearer ${settings.apiKey}` }
            });
            if (res.status === 401) return false; // Invalid Key
            return true; 
        } catch (e) {
            console.error("HF status check failed", e);
            return false;
        }
    }
    return false;
  } catch (e) {
    console.error("API Validation Failed:", e);
    return false;
  }
};

// --- PROMPT HELPERS ---
const getStylePrompt = (style: ArtStyle): string => {
      switch (style) {
        case ArtStyle.CARTOON: return "vibrant 2D cartoon caricature, flat colors, bold outlines, funny exaggeration";
        case ArtStyle.PENCIL: return "black and white pencil sketch caricature, cross-hatching, hand-drawn look";
        case ArtStyle.THREE_D: return "3D clay rendering, plasticine style, cute and rounded, caricature proportions";
        case ArtStyle.WATERCOLOR: return "watercolor painting, artistic, soft edges, caricature features, pastel colors";
        case ArtStyle.ANIME: return "anime style caricature, large eyes, expressive emotion, manga aesthetic";
        case ArtStyle.PIXEL: return "8-bit pixel art style caricature, retro game aesthetic, low resolution look, limited color palette";
        case ArtStyle.CYBERPUNK: return "futuristic cyberpunk caricature, neon lights, high tech elements, glowing eyes, dark background with bright accents";
        case ArtStyle.POP_ART: return "pop art style caricature, Andy Warhol style, vibrant contrasting colors, halftone patterns, bold artistic look";
        case ArtStyle.RETRO: return "vintage comic book style caricature, 1950s aesthetic, halftone dots, thick ink outlines, retro paper texture";
        case ArtStyle.OIL: return "classical oil painting caricature, visible brushstrokes, rich textures, fine art museum style";
        case ArtStyle.IMPRESSIONISM: return "impressionist painting style caricature, Monet style, visible brush strokes, sunlight and color focus";
        case ArtStyle.SURREALISM: return "surrealist caricature, Salvador Dali style, dreamlike, melting forms, bizarre elements, artistic distortion";
        case ArtStyle.STEAMPUNK: return "steampunk style caricature, brass gears, steam, victorian fashion, mechanical elements, sepia tones";
        case ArtStyle.GRAFFITI: return "street art graffiti style caricature, spray paint texture, vibrant drips, urban aesthetic, bold letters";
        case ArtStyle.NOIR: return "film noir style caricature, high contrast black and white, dramatic shadows, venetian blind shadows, mystery atmosphere";
        case ArtStyle.VAPORWAVE: return "vaporwave aesthetic caricature, retro 80s computer graphics, neon pink and cyan, glitch art elements";
        case ArtStyle.GOTHIC: return "gothic style caricature, dark atmosphere, victorian gothic fashion, pale skin, mysterious, tim burton style vibe";
        case ArtStyle.LOW_POLY: return "low poly art style caricature, geometric shapes, sharp edges, 3d rendered look, minimalist";
        case ArtStyle.ORIGAMI: return "paper folding origami style caricature, sharp paper creases, paper texture, geometric, folded paper look";
        case ArtStyle.MOSAIC: return "ceramic mosaic tile style caricature, small colored tiles, grout lines, ancient roman look";
        case ArtStyle.STAINED_GLASS: return "stained glass window style caricature, vibrant translucent colors, thick black lead lines, cathedral aesthetic";
        case ArtStyle.NEON: return "neon sign style caricature, glowing lines against dark background, electric colors, cyberpunk vibes";
        case ArtStyle.UKIO_E: return "ukiyo-e japanese woodblock print style caricature, hokusai style, flat perspective, traditional japanese patterns";
        case ArtStyle.LEGO: return "plastic brick construction toy style caricature, minifigure look, stud textures, glossy plastic, 3d render";
        case ArtStyle.LINE_ART: return "minimalist continuous line art caricature, single stroke style, clean black lines on white background, abstract";
        case ArtStyle.CHIBI: return "chibi anime style caricature, super deformed, giant head small body, large eyes, extremely cute and round";
        case ArtStyle.PHOTOREALISM: return "hyper-realistic caricature, cinematic lighting, 8k resolution, highly detailed skin texture, unreal engine 5 render style, exaggerated but realistic";
        case ArtStyle.NEWSREEL: return "vintage newsreel style caricature, grainy black and white film aesthetic, 1940s historical footage look, slight motion blur, vignette effect, scratches and dust";
        default: return "funny caricature";
      }
};

const getBasePrompt = (style: ArtStyle, qualityModifiers: string) => {
    let stylePrompt = getStylePrompt(style);
    
    if (style === ArtStyle.NO_STYLE) {
      return `Edit the MAIN IMAGE based on instructions. Maintain original photographic style, lighting, and realism. Do not apply filters or caricature distortion unless asked. Quality: ${qualityModifiers}.`;
    } else {
      return `Create a fun and artistic illustration based on the MAIN IMAGE in the style of ${stylePrompt}. Capture the essence and personality of the subject with a stylized, artistic approach. Quality: ${qualityModifiers}.`;
    }
};

// --- GEMINI HANDLER ---
const generateWithGemini = async (
    apiKey: string,
    mainImageBase64: string,
    style: ArtStyle,
    customPrompt: string,
    referenceImages: ReferenceImage[],
    quality: Quality,
    mimeType: string
) => {
    const ai = new GoogleGenAI({ apiKey });
    const qualityModifiers = quality === 'High' ? "high quality, 8k resolution, highly detailed" : "standard quality";
    let prompt = getBasePrompt(style, qualityModifiers);

    if (referenceImages.length > 0) {
      prompt += `\n\nUse provided ADDITIONAL IMAGES to modify the main image. Blend elements seamlessly.`;
    }
    if (customPrompt) prompt += `\n\nInstructions: ${customPrompt}`;

    const parts: any[] = [{ text: prompt }, { inlineData: { data: mainImageBase64, mimeType: mimeType } }];
    
    referenceImages.forEach((ref) => {
        parts.push({ inlineData: { data: ref.croppedBase64 || ref.base64, mimeType: ref.mimeType } });
    });

    let retries = 0;
    while (true) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                    ]
                }
            });
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
            throw new Error("No image in Gemini response");
        } catch (err: any) {
            // Enhanced 429 Quota Error Handling
            const msg = err.message || JSON.stringify(err);
            const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');

            if (isQuota) {
                if (retries < 2) {
                    retries++;
                    console.warn(`Quota exceeded. Retrying in ${2 * retries}s...`);
                    await wait(2000 * retries);
                    continue;
                }
                throw new Error("Лимит запросов Google Gemini исчерпан (429).\n\nСовет: Переключитесь на сервис 'Hugging Face' (бесплатно, с токеном) или 'Pollinations' (без фото) в настройках.");
            }
            throw err;
        }
    }
};

// --- STABILITY AI HANDLER ---
const generateWithStability = async (
    apiKey: string,
    mainImageBase64: string,
    style: ArtStyle,
    customPrompt: string,
    baseUrl: string = 'https://api.stability.ai'
) => {
    const stylePrompt = getStylePrompt(style);
    const finalPrompt = `(caricature:1.3), ${stylePrompt}, ${customPrompt}`;

    const formData = new FormData();
    formData.append('init_image', new Blob([Buffer.from(mainImageBase64, 'base64')], { type: 'image/png' }));
    formData.append('text_prompts[0][text]', finalPrompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('image_strength', '0.35'); // How much to respect the original image
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');
    formData.append('steps', '30');

    // Standard endpoint: https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
        },
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Stability API Error: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    return `data:image/png;base64,${result.artifacts[0].base64}`;
};

// --- OPENAI HANDLER ---
const generateWithOpenAI = async (
    apiKey: string,
    style: ArtStyle,
    customPrompt: string,
    baseUrl: string = 'https://api.openai.com/v1'
) => {
    const stylePrompt = getStylePrompt(style);
    // DALL-E 3 doesn't take input images, so we rely purely on the prompt description.
    const prompt = `A funny caricature in the style of ${stylePrompt}. ${customPrompt}`;

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return `data:image/png;base64,${data.data[0].b64_json}`;
};

// --- HUGGING FACE HANDLER (Text to Image OR Image to Image via InstructPix2Pix) ---
const generateWithHuggingFace = async (
    apiKey: string,
    mainImageBase64: string,
    style: ArtStyle,
    customPrompt: string,
    mimeType: string
) => {
    const stylePrompt = getStylePrompt(style);

    // CRITICAL: Resize image to max 512px to prevent "Failed to fetch" (Payload too large)
    // The free inference API struggles with anything larger than standard SD res (512x512)
    const resizedBase64 = await resizeImage(mainImageBase64, mimeType, 512);

    // INSTRUCT PIX2PIX (Image Editing)
    const model = "timbrooks/instruct-pix2pix";
    const prompt = `turn him into a funny caricature, ${stylePrompt} style. ${customPrompt}`;
    
    // Construct JSON payload for HF Inference API
    const payload = {
        inputs: resizedBase64, // Use the resized base64
        parameters: {
            prompt: prompt,
            num_inference_steps: 20,
            image_guidance_scale: 1.5,
            guidance_scale: 7.5
        }
    };

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "x-use-cache": "false" 
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.text();
            if (err.includes('loading')) throw new Error("Модель загружается (холодный старт). Пожалуйста, подождите 20 секунд и нажмите кнопку снова.");
            throw new Error(`HF Error: ${response.statusText} - ${err.slice(0, 100)}`);
        }

        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error: any) {
        // Handle network errors (Failed to fetch) gracefully
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
             throw new Error("Ошибка соединения с Hugging Face. Изображение слишком большое или сервер перегружен. Попробуйте обрезать фото или выбрать другое.");
        }
        throw error;
    }
};

// --- POLLINATIONS.AI HANDLER (Free) ---
const generateWithPollinations = async (
    style: ArtStyle,
    customPrompt: string
) => {
    // Pollinations is Text-to-Image in this implementation
    const stylePrompt = getStylePrompt(style);
    const prompt = encodeURIComponent(`funny caricature, ${stylePrompt}, ${customPrompt}`);
    
    // Pollinations generates image via URL.
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&nologo=true`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Pollinations Service Error");
    
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- MAIN EXPORT ---
export const generateCaricature = async (
  mainImageBase64: string, 
  style: ArtStyle, 
  customPrompt: string,
  referenceImages: ReferenceImage[] = [],
  quality: Quality = 'Standard',
  mimeType: string = 'image/jpeg',
  settings?: AppSettings | null
): Promise<string> => {
  
  // Default to Gemini from Env if no settings provided
  if (!settings && process.env.API_KEY) {
      return generateWithGemini(process.env.API_KEY, mainImageBase64, style, customPrompt, referenceImages, quality, mimeType);
  }

  // Pollinations doesn't need key, BUT it ignores image
  if (settings?.provider === 'pollinations') {
      return await generateWithPollinations(style, customPrompt);
  }

  if (!settings || !settings.apiKey) {
      throw new Error("API Key не найден. Пожалуйста, настройте провайдера в меню.");
  }

  try {
      if (settings.provider === 'gemini') {
          return await generateWithGemini(settings.apiKey, mainImageBase64, style, customPrompt, referenceImages, quality, mimeType);
      } else if (settings.provider === 'stability') {
          return await generateWithStability(settings.apiKey, mainImageBase64, style, customPrompt, settings.baseUrl);
      } else if (settings.provider === 'openai') {
          return await generateWithOpenAI(settings.apiKey, style, customPrompt, settings.baseUrl);
      } else if (settings.provider === 'huggingface') {
          return await generateWithHuggingFace(settings.apiKey, mainImageBase64, style, customPrompt, mimeType);
      }
      throw new Error("Неизвестный провайдер");
  } catch (error: any) {
      console.error("Generation Error:", error);
      throw new Error(error.message || "Ошибка генерации изображения");
  }
};
