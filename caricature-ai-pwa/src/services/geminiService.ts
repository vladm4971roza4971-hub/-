import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArtStyle } from "../types";
import type { ReferenceImage, AppSettings } from "../types";

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
        img.src = `data:${mimeType};base64,${base64}`;
        img.onload = () => {
            let { width, height } = img;
            if (width <= maxDim && height <= maxDim) {
                resolve(base64);
                return;
            }
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
        return true; 
    }
    else if (settings.provider === 'gemini') {
        // Validate Standard Key
        const ai = new GoogleGenAI({ apiKey: settings.apiKey });
        await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
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
        try {
            const res = await fetch('https://huggingface.co/api/whoami-v2', {
                headers: { 'Authorization': `Bearer ${settings.apiKey}` }
            });
            if (res.ok) return true;
        } catch (e) {
            console.warn("HF whoami check failed, trying fallback", e);
        }
        try {
            const res = await fetch('https://api-inference.huggingface.co/status/timbrooks/instruct-pix2pix', {
                headers: { 'Authorization': `Bearer ${settings.apiKey}` }
            });
            if (res.status === 401) return false;
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
        
        // --- NEW ADDITIONS ---
        case ArtStyle.CUTE_CREATURE: return "cute creature caricature, big shiny eyes, fluffy texture, soft lighting, adorable mascot style, 3d render";
        case ArtStyle.FUTURE_ARCH: return "futuristic architecture style, parametric design, zaha hadid style, sweeping curves, glass and steel, white modern structures";
        case ArtStyle.GOTHIC_ARCH: return "gothic architecture style, flying buttresses, pointed arches, intricate stone carving, cathedral atmosphere, dark stone";
        case ArtStyle.BRUTALISM: return "brutalist architecture style, raw concrete textures, massive geometric blocks, imposing structures, monolithic look";
        case ArtStyle.AI_LOGO: return "modern AI vector logo style, minimalist, gradient colors, clean lines, scalable vector graphics aesthetic, tech company logo";
        case ArtStyle.FANTASY_MAP: return "fantasy map style, parchment texture, ink drawn mountains and rivers, compass rose, calligraphy, lord of the rings map style";
        case ArtStyle.OCEAN_LIFE: return "underwater ocean life style, coral reef background, blue water caustics, bubbles, vibrant tropical fish colors";
        case ArtStyle.SPACE_WORLD: return "deep space style, stars, nebulae backgrounds, planets, sci-fi atmosphere, cosmic lighting";
        case ArtStyle.URBAN_FASHION: return "urban fashion illustration style, streetwear clothing, stylish pose, hypebeast aesthetic, marker drawing";
        case ArtStyle.MINIMALISM: return "minimalistic art style, ultra clean, negative space, simple shapes, limited color palette, flat design";
        case ArtStyle.HORROR: return "haunted horror portrait, ghostly apparition, motion blur, creepy atmosphere, dark shadows, scary movie aesthetic";
        case ArtStyle.ROMANTICISM: return "romanticism painting style, caspar david friedrich style, emotional, dramatic nature background, soft atmospheric fog";
        case ArtStyle.ABSTRACT_EXPRESSIONISM: return "abstract expressionism style, jackson pollock style, chaotic paint splatters, dynamic drips, intense energy";
        case ArtStyle.GLADIATOR: return "roman gladiator style, arena background, armor, dusty atmosphere, epic cinematic lighting, historical movie look";
        case ArtStyle.ALIEN_FLORA: return "alien world flora style, bioluminescent plants, strange colors, avatar movie aesthetic, exotic vegetation";
        case ArtStyle.FAIRY_TALE: return "classic fairy tale book illustration, magical dust, enchanted forest background, whimsical, golden hour lighting";
        case ArtStyle.MYTHIC_CREATURE: return "mythological creature style, epic fantasy art, scales and fur details, legendary beast aesthetic, dynamic pose";
        case ArtStyle.CARNIVAL: return "venetian carnival style, masquerade masks, festive colors, confetti, mysterious celebration atmosphere";
        case ArtStyle.ACTION_FIGURE: return "plastic action figure style, visible joints, toy packaging aesthetic, glossy plastic texture, blister pack look";
        case ArtStyle.BLUEPRINT: return "technical blueprint style, cyanotype blue background, white technical lines, measurements, schematic layout";
        case ArtStyle.ZOMBIE: return "zombie apocalypse style, decaying skin texture, ragged clothes, horror movie makeup, undead aesthetic";
        case ArtStyle.BIOLUMINESCENCE: return "bioluminescent art style, glowing blue and purple lights, darkness, avatar pandora style, glowing organic shapes";
        case ArtStyle.ICE_WORLD: return "frozen ice world style, ice sculptures, translucent blue ice textures, snow particles, cold atmosphere";
        case ArtStyle.ATLANTIS: return "ancient atlantis underwater city style, greek ruins underwater, magical glowing crystals, mysterious ocean depths";
        case ArtStyle.KAWAII_EMOJI: return "kawaii emoji style, simple vector graphics, extremely cute face, flat colors, stickers aesthetic";
        case ArtStyle.WITCHCRAFT: return "witchcraft aesthetic, potions, spell books, dark magic symbols, candles, mystical purple lighting";
        case ArtStyle.MECHANICAL_ANATOMY: return "mechanical anatomy cutaway style, gears inside body, medical illustration mixed with robotics, da vinci mechanical sketch";
        case ArtStyle.CLOCKWORK: return "intricate clockwork mechanism style, brass gears, watch parts, golden metallic textures, steampunk automation";
        case ArtStyle.MARIONETTE: return "wooden marionette puppet style, visible strings, wood grain texture, toy theater aesthetic";
        case ArtStyle.TROPICAL: return "tropical paradise style, vibrant jungle colors, palm leaves, hibiscus flowers, summer vibes, tiki art";
        case ArtStyle.ELVEN: return "elven fantasy art style, elegant ornate designs, nature magic, ethereal lighting, lord of the rings elf aesthetic";
        case ArtStyle.ZENTANGLE: return "zentangle art style, intricate black and white patterns, meditative doodles, high detail ink drawing";
        case ArtStyle.MAYAN: return "ancient mayan art style, stone carvings, glyphs, step pyramids background, mesoamerican patterns";
        case ArtStyle.DECOUPAGE: return "decoupage art style, layered paper cutouts, vintage floral patterns, craft aesthetic, mod podge texture";
        case ArtStyle.TERRARIUM: return "glass terrarium world style, miniature ecosystem inside glass, moss, small plants, macro photography look";
        case ArtStyle.COLLAGE: return "mixed media photo collage style, cut paper edges, magazine clippings, dada art aesthetic, chaotic composition";
        case ArtStyle.PLAYING_CARD: return "vintage playing card style, symmetry, king or queen card aesthetic, flat colors, ornate card border";

        default: return "funny caricature, " + style.toLowerCase();
      }
};

const getBasePrompt = (style: ArtStyle) => {
    let stylePrompt = style === ArtStyle.NO_STYLE ? "" : getStylePrompt(style);
    
    if (style === ArtStyle.NO_STYLE) {
      return `Edit the MAIN IMAGE based on instructions. Maintain original photographic style, lighting, and realism. Do not apply filters or caricature distortion unless asked.`;
    } else {
      return `Create a fun and artistic illustration based on the MAIN IMAGE in the style of ${stylePrompt}. Capture the essence and personality of the subject with a stylized, artistic approach.`;
    }
};

const getFriendlyErrorMessage = (error: any): string => {
  const msg = error.message || error.toString();
  if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) return "Превышен лимит запросов Google. Попробуйте позже или смените ключ.";
  if (msg.includes('401') || msg.includes('API key')) return "Неверный API ключ. Проверьте настройки.";
  if (msg.includes('403') || msg.includes('permission')) return "Доступ запрещен. Проверьте права API ключа (GCP Project).";
  if (msg.includes('SAFETY') || msg.includes('HARM') || msg.includes('blocked')) return "Генерация заблокирована фильтром безопасности. Попробуйте другое фото или описание.";
  if (msg.includes('503') || msg.includes('Overloaded')) return "Сервис перегружен. Попробуйте через минуту.";
  if (msg.includes('finishReason')) return `Модель завершила работу с причиной: ${msg}`;
  return `Произошла ошибка: ${msg.slice(0, 100)}...`;
};

// --- GEMINI HANDLER ---
const generateWithGemini = async (
    apiKey: string,
    mainImageBase64: string,
    style: ArtStyle,
    customPrompt: string,
    referenceImages: ReferenceImage[],
    mimeType: string
) => {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-2.5-flash-image';
    
    let prompt = getBasePrompt(style);

    if (referenceImages.length > 0) {
      prompt += `\n\nUse provided ADDITIONAL IMAGES to modify the main image. Blend elements seamlessly.`;
    }
    if (customPrompt) prompt += `\n\nInstructions: ${customPrompt}`;

    const parts: any[] = [{ text: prompt }, { inlineData: { data: mainImageBase64, mimeType: mimeType } }];
    
    referenceImages.forEach((ref) => {
        parts.push({ inlineData: { data: ref.croppedBase64 || ref.base64, mimeType: ref.mimeType } });
    });

    const generationConfig: any = {
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        imageConfig: { aspectRatio: "1:1" }
    };

    let retries = 0;
    while (true) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: generationConfig
            });
            
            const candidate = response.candidates?.[0];
            
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                 throw new Error(`Finish Reason: ${candidate.finishReason}`);
            }

            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }
            }

            const textPart = candidate?.content?.parts?.find(p => p.text);
            if (textPart?.text) {
                 throw new Error(`Gemini Message: ${textPart.text}`);
            }

            throw new Error("Gemini не вернул изображение.");

        } catch (err: any) {
            const msg = err.message || JSON.stringify(err);
            const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded');

            if (isQuota) {
                if (retries < 2) {
                    retries++;
                    console.warn(`Quota exceeded. Retrying in ${2 * retries}s...`);
                    await wait(2000 * retries);
                    continue;
                }
            }
            throw err;
        }
    }
};

// --- OTHER HANDLERS ---
const generateWithStability = async (apiKey: string, mainImageBase64: string, style: ArtStyle, customPrompt: string, baseUrl: string = 'https://api.stability.ai') => {
    const stylePrompt = getStylePrompt(style);
    const finalPrompt = `${customPrompt ? customPrompt + ', ' : ''}(caricature:1.3), ${stylePrompt}`;
    const formData = new FormData();
    formData.append('init_image', new Blob([Buffer.from(mainImageBase64, 'base64')], { type: 'image/png' }));
    formData.append('text_prompts[0][text]', finalPrompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('image_strength', '0.35');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');
    formData.append('steps', '30');
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image`;
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json', }, body: formData, });
    if (!response.ok) { const errText = await response.text(); throw new Error(`Ошибка Stability API: ${response.status} - ${errText}`); }
    const result = await response.json();
    return `data:image/png;base64,${result.artifacts[0].base64}`;
};

const generateWithOpenAI = async (apiKey: string, style: ArtStyle, customPrompt: string, baseUrl: string = 'https://api.openai.com/v1') => {
    const stylePrompt = getStylePrompt(style);
    const prompt = `A funny caricature in the style of ${stylePrompt}. ${customPrompt}`;
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "dall-e-3", prompt: prompt, n: 1, size: "1024x1024", response_format: "b64_json" }) });
    if (!response.ok) { const err = await response.json(); throw new Error(`Ошибка OpenAI: ${err.error?.message || response.statusText}`); }
    const data = await response.json();
    return `data:image/png;base64,${data.data[0].b64_json}`;
};

const generateWithHuggingFace = async (apiKey: string, mainImageBase64: string, style: ArtStyle, customPrompt: string, mimeType: string) => {
    const stylePrompt = getStylePrompt(style);
    const resizedBase64 = await resizeImage(mainImageBase64, mimeType, 450);
    const model = "timbrooks/instruct-pix2pix";
    const prompt = `${customPrompt ? customPrompt + '. ' : ''}turn him into a funny caricature, ${stylePrompt} style.`;
    const payload = { inputs: resizedBase64, parameters: { prompt: prompt, num_inference_steps: 20, image_guidance_scale: 1.5, guidance_scale: 7.5 } };
    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, { method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "x-use-cache": "false" }, body: JSON.stringify(payload), });
        if (!response.ok) { const err = await response.text(); if (err.includes('loading')) throw new Error("Модель загружается. Подождите 20 сек."); if (response.status === 413) throw new Error("Файл слишком большой."); throw new Error(`Ошибка Hugging Face: ${response.status} - ${err.slice(0, 100)}`); }
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob); });
    } catch (error: any) { if (error.name === 'TypeError' || error.message.includes('fetch')) { throw new Error("Ошибка соединения с Hugging Face."); } throw error; }
};

const generateWithPollinations = async (style: ArtStyle, customPrompt: string) => {
    const stylePrompt = getStylePrompt(style);
    const prompt = encodeURIComponent(`${customPrompt ? customPrompt + ', ' : ''}funny caricature, ${stylePrompt}`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&nologo=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Ошибка сервиса Pollinations.");
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob); });
};

// --- MAIN EXPORT ---
export const generateCaricature = async (
  mainImageBase64: string, 
  style: ArtStyle, 
  customPrompt: string,
  referenceImages: ReferenceImage[] = [],
  mimeType: string = 'image/jpeg',
  settings?: AppSettings | null
): Promise<string> => {
  
  if (!settings && process.env.API_KEY) {
      try {
        return await generateWithGemini(process.env.API_KEY, mainImageBase64, style, customPrompt, referenceImages, mimeType);
      } catch (e) {
        throw new Error(getFriendlyErrorMessage(e));
      }
  }

  if (settings?.provider === 'pollinations') {
      return await generateWithPollinations(style, customPrompt);
  }

  if (!settings || !settings.apiKey) {
      throw new Error("API Key не найден. Пожалуйста, настройте провайдера в меню.");
  }

  try {
      if (settings.provider === 'gemini') {
          return await generateWithGemini(settings.apiKey, mainImageBase64, style, customPrompt, referenceImages, mimeType);
      } 
      else if (settings.provider === 'stability') {
          return await generateWithStability(settings.apiKey, mainImageBase64, style, customPrompt, settings.baseUrl);
      } 
      else if (settings.provider === 'openai') {
          return await generateWithOpenAI(settings.apiKey, style, customPrompt, settings.baseUrl);
      } 
      else if (settings.provider === 'huggingface') {
          return await generateWithHuggingFace(settings.apiKey, mainImageBase64, style, customPrompt, mimeType);
      }
      throw new Error("Неизвестный провайдер");
  } catch (error: any) {
      console.error("Generation Error:", error);
      const friendlyMsg = getFriendlyErrorMessage(error);
      throw new Error(friendlyMsg);
  }
};
