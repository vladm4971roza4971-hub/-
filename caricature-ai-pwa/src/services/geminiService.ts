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
// Reduced to 480px and 0.6 quality to ensure it fits in free tier payload limits
const resizeImage = (base64: string, mimeType: string, maxDim: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
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
                // Aggressive compression (0.6) for free tier stability
                const newData = canvas.toDataURL('image/jpeg', 0.6);
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
            // If network fails entirely, assume key might be ok but net is down, 
            // but for validation purposes we return false to force check.
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
        
        // New Styles
        case ArtStyle.RENAISSANCE: return "renaissance painting style caricature, Leonardo da Vinci style, oil on canvas, soft lighting, sfumato, classical composition";
        case ArtStyle.ABSTRACT: return "abstract painting style caricature, picasso style, distorted shapes, bold geometric forms, artistic abstraction";
        case ArtStyle.HOLOGRAM: return "3D hologram projection caricature, translucent blue glowing figure, sci-fi interface style, digital scanlines, futuristic tech";
        case ArtStyle.FANTASY: return "fantasy world caricature, magic glowing effects, mythical atmosphere, rpg character portrait style, detailed background";
        case ArtStyle.COMICS: return "modern comic book superhero style caricature, bold ink lines, dynamic shading, vibrant glossy colors, marvel/dc comics aesthetic";
        case ArtStyle.MANGA: return "black and white manga panel style caricature, screen tones, speed lines, dramatic shading, japanese comic aesthetic";
        case ArtStyle.GROTESQUE: return "grotesque art style caricature, exaggerated ugly features, strange proportions, dark humor, highly detailed texture, odd realism";
        case ArtStyle.TRIBAL: return "tribal art style caricature, indigenous patterns, tattoo style linework, earthy tones, symbolic motifs";
        case ArtStyle.MYSTICISM: return "mysticism art style caricature, tarot card aesthetic, glowing runes, celestial symbols, spiritual atmosphere, esoteric";
        case ArtStyle.CHILDRENS_BOOK: return "children's book illustration style caricature, soft pastel colors, whimsical, friendly shapes, storybook aesthetic";
        case ArtStyle.ART_DECO: return "art deco style caricature, geometric gold patterns, roaring 20s aesthetic, elegant lines, luxury poster style";
        case ArtStyle.ART_NOUVEAU: return "art nouveau style caricature, alphonse mucha style, organic curves, floral borders, elegant flowing hair, vintage poster";
        case ArtStyle.BAROQUE: return "baroque painting style caricature, dramatic lighting, rich deep colors, emotional expression, ornate details, rembrandt style";
        case ArtStyle.CUBISM: return "cubist art style caricature, fragmented objects, multiple viewpoints, geometric planes, abstract faces";
        case ArtStyle.MECHA: return "mecha robot style caricature, mechanical parts, metal armor plates, robotic joints, scifi machinery, gundam aesthetic";
        case ArtStyle.ANCIENT_EGYPT: return "ancient egyptian art style caricature, profile view, hieroglyphs background, gold and lapis lazuli colors, papyrus texture";
        case ArtStyle.WILD_WEST: return "wild west wanted poster style caricature, sepia tone, parchment texture, western font, cowboy aesthetic";
        case ArtStyle.PSYCHEDELIC: return "psychedelic poster art style caricature, swirling colors, trippy patterns, 60s flower power, hallucinogenic visuals";
        case ArtStyle.CAVE_PAINTING: return "prehistoric cave painting style caricature, primitive stick figures, ochre and charcoal pigments, stone wall texture";
        case ArtStyle.POST_APOCALYPTIC: return "post-apocalyptic wasteland style caricature, mad max aesthetic, dusty, rusty metal, survival gear, dystopian atmosphere";
        case ArtStyle.BAUHAUS: return "bauhaus design style caricature, minimalist geometric shapes, primary colors (red blue yellow), clean typography, functional art";
        case ArtStyle.SAMURAI: return "feudal japan samurai art style, ink wash painting, aggressive stance, katana, cherry blossoms, traditional japanese warrior";
        
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
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
                }
            });
            const candidate = response.candidates?.[0];
            const part = candidate?.content?.parts?.[0];
            
            if (part?.inlineData?.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }

            // If no image, check for text (refusal message)
            if (part?.text) {
                 throw new Error(`Gemini отклонил запрос: ${part.text}`);
            }
            
            if (candidate?.finishReason) {
                throw new Error(`Gemini завершил запрос со статусом: ${candidate.finishReason}. Попробуйте изменить описание или фото.`);
            }

            throw new Error("Gemini не вернул изображение. Попробуйте снова.");
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
    // PRIORITIZE USER PROMPT: Putting customPrompt first helps model adherence
    const finalPrompt = `${customPrompt ? customPrompt + ', ' : ''}(caricature:1.3), ${stylePrompt}`;

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
        throw new Error(`Ошибка Stability API: ${response.status} - ${errText}`);
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
        throw new Error(`Ошибка OpenAI: ${err.error?.message || response.statusText}`);
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

    // CRITICAL: Resize image to max 450px to prevent "Failed to fetch" (Payload too large)
    // The free inference API struggles with anything larger.
    const resizedBase64 = await resizeImage(mainImageBase64, mimeType, 450);

    // INSTRUCT PIX2PIX (Image Editing)
    const model = "timbrooks/instruct-pix2pix";
    // Prioritize custom prompt instruction
    const prompt = `${customPrompt ? customPrompt + '. ' : ''}turn him into a funny caricature, ${stylePrompt} style.`;
    
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
            // If still too large
            if (response.status === 413) throw new Error("Файл слишком большой для Hugging Face. Попробуйте обрезать его.");
            throw new Error(`Ошибка Hugging Face: ${response.status} - ${err.slice(0, 100)}`);
        }

        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error: any) {
        // Explicitly handle TypeError for network/fetch failures
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
             throw new Error("Ошибка соединения с Hugging Face. \nВозможно, интернет-фильтр блокирует доступ или файл все еще велик.\nПопробуйте VPN или другой сервис в настройках.");
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
    
    // PRIORITIZE USER PROMPT: Put customPrompt at the very beginning. 
    // This helps the model see the subject ("pike fish", etc) before "funny caricature".
    const prompt = encodeURIComponent(`${customPrompt ? customPrompt + ', ' : ''}funny caricature, ${stylePrompt}`);
    
    // Pollinations generates image via URL.
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&nologo=true`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Ошибка сервиса Pollinations. Попробуйте позже.");
    
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
