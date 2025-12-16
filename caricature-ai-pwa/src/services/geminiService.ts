import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArtStyle, Quality, ReferenceImage } from "../types";

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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateCaricature = async (
  mainImageBase64: string, 
  style: ArtStyle, 
  customPrompt: string,
  referenceImages: ReferenceImage[] = [],
  quality: Quality = 'Standard',
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a specific prompt based on the selected style
    let stylePrompt = "";
    
    if (style !== ArtStyle.NO_STYLE) {
      switch (style) {
        case ArtStyle.CARTOON:
          stylePrompt = "vibrant 2D cartoon caricature, flat colors, bold outlines, funny exaggeration";
          break;
        case ArtStyle.PENCIL:
          stylePrompt = "black and white pencil sketch caricature, cross-hatching, hand-drawn look";
          break;
        case ArtStyle.THREE_D:
          stylePrompt = "3D clay rendering, plasticine style, cute and rounded, caricature proportions";
          break;
        case ArtStyle.WATERCOLOR:
          stylePrompt = "watercolor painting, artistic, soft edges, caricature features, pastel colors";
          break;
        case ArtStyle.ANIME:
          stylePrompt = "anime style caricature, large eyes, expressive emotion, manga aesthetic";
          break;
        case ArtStyle.PIXEL:
          stylePrompt = "8-bit pixel art style caricature, retro game aesthetic, low resolution look, limited color palette";
          break;
        case ArtStyle.CYBERPUNK:
          stylePrompt = "futuristic cyberpunk caricature, neon lights, high tech elements, glowing eyes, dark background with bright accents";
          break;
        case ArtStyle.POP_ART:
          stylePrompt = "pop art style caricature, Andy Warhol style, vibrant contrasting colors, halftone patterns, bold artistic look";
          break;
        case ArtStyle.RETRO:
          stylePrompt = "vintage comic book style caricature, 1950s aesthetic, halftone dots, thick ink outlines, retro paper texture";
          break;
        case ArtStyle.OIL:
          stylePrompt = "classical oil painting caricature, visible brushstrokes, rich textures, fine art museum style";
          break;
        case ArtStyle.IMPRESSIONISM:
          stylePrompt = "impressionist painting style caricature, Monet style, visible brush strokes, sunlight and color focus";
          break;
        case ArtStyle.SURREALISM:
          stylePrompt = "surrealist caricature, Salvador Dali style, dreamlike, melting forms, bizarre elements, artistic distortion";
          break;
        case ArtStyle.STEAMPUNK:
          stylePrompt = "steampunk style caricature, brass gears, steam, victorian fashion, mechanical elements, sepia tones";
          break;
        case ArtStyle.GRAFFITI:
          stylePrompt = "street art graffiti style caricature, spray paint texture, vibrant drips, urban aesthetic, bold letters";
          break;
        case ArtStyle.NOIR:
          stylePrompt = "film noir style caricature, high contrast black and white, dramatic shadows, venetian blind shadows, mystery atmosphere";
          break;
        case ArtStyle.VAPORWAVE:
          stylePrompt = "vaporwave aesthetic caricature, retro 80s computer graphics, neon pink and cyan, glitch art elements";
          break;
        case ArtStyle.GOTHIC:
          stylePrompt = "gothic style caricature, dark atmosphere, victorian gothic fashion, pale skin, mysterious, tim burton style vibe";
          break;
        case ArtStyle.LOW_POLY:
          stylePrompt = "low poly art style caricature, geometric shapes, sharp edges, 3d rendered look, minimalist";
          break;
        case ArtStyle.ORIGAMI:
          stylePrompt = "paper folding origami style caricature, sharp paper creases, paper texture, geometric, folded paper look";
          break;
        case ArtStyle.MOSAIC:
          stylePrompt = "ceramic mosaic tile style caricature, small colored tiles, grout lines, ancient roman look";
          break;
        case ArtStyle.STAINED_GLASS:
          stylePrompt = "stained glass window style caricature, vibrant translucent colors, thick black lead lines, cathedral aesthetic";
          break;
        case ArtStyle.NEON:
          stylePrompt = "neon sign style caricature, glowing lines against dark background, electric colors, cyberpunk vibes";
          break;
        case ArtStyle.UKIO_E:
          stylePrompt = "ukiyo-e japanese woodblock print style caricature, hokusai style, flat perspective, traditional japanese patterns";
          break;
        case ArtStyle.LEGO:
          stylePrompt = "plastic brick construction toy style caricature, minifigure look, stud textures, glossy plastic, 3d render";
          break;
        case ArtStyle.LINE_ART:
          stylePrompt = "minimalist continuous line art caricature, single stroke style, clean black lines on white background, abstract";
          break;
        case ArtStyle.CHIBI:
          stylePrompt = "chibi anime style caricature, super deformed, giant head small body, large eyes, extremely cute and round";
          break;
        case ArtStyle.PHOTOREALISM:
          stylePrompt = "hyper-realistic caricature, cinematic lighting, 8k resolution, highly detailed skin texture, unreal engine 5 render style, exaggerated but realistic";
          break;
        case ArtStyle.NEWSREEL:
          stylePrompt = "vintage newsreel style caricature, grainy black and white film aesthetic, 1940s historical footage look, slight motion blur, vignette effect, scratches and dust";
          break;
        default:
          stylePrompt = "funny caricature";
      }
    }

    const qualityModifiers = quality === 'High' 
      ? "high quality, 8k resolution, highly detailed, professional rendering, masterpiece, sharp focus" 
      : "standard quality";

    // Build the prompt dynamically
    let basePrompt = "";

    if (style === ArtStyle.NO_STYLE) {
      // Special prompt for NO_STYLE: Focus on editing, preserving realism, and NO caricature distortion.
      basePrompt = `Edit the MAIN IMAGE based on the instructions, but strictly maintain the original photographic style, lighting, and realism of the source image.
      Do not apply any artistic filters, do not convert to a drawing, and do not exaggerate features into a caricature unless specifically asked in the user instructions.
      The goal is realistic photo editing/manipulation.
      
      Quality level: ${qualityModifiers}.`;
    } else {
      // Standard Caricature Prompt
      basePrompt = `Create a fun and artistic illustration based on the MAIN IMAGE in the style of ${stylePrompt}. 
      Capture the essence and personality of the subject with a stylized, artistic approach.
      The goal is a lighthearted, creative representation, not a realistic distortion.
      Quality level: ${qualityModifiers}.`;
    }
    
    if (referenceImages.length > 0) {
      basePrompt += `\n\nINTEGRATION INSTRUCTIONS: Use the elements provided in the ADDITIONAL IMAGES to modify the main image. 
      Blend these elements seamlessly into the composition. 
      For example, if an additional image shows a hat or a pet, add it to the person in the main image.`;
    }

    // Append user's custom instructions
    const finalPrompt = customPrompt && customPrompt.trim().length > 0 
      ? `${basePrompt} \n\nAdditional user instructions: ${customPrompt}` 
      : basePrompt;

    // Build parts
    const parts: any[] = [
      { text: finalPrompt },
      { 
        inlineData: {
          data: mainImageBase64,
          mimeType: mimeType,
        }
      }
    ];

    // Add reference images to parts
    referenceImages.forEach((ref) => {
        // Use cropped version if available, otherwise original
        const data = ref.croppedBase64 || ref.base64;
        parts.push({
            inlineData: {
                data: data,
                mimeType: ref.mimeType
            }
        });
    });

    let response;
    let retries = 0;
    const maxRetries = 2;

    while (true) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: parts,
          },
          config: {
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ]
          }
        });
        break; // Success, exit loop
      } catch (err: any) {
        // Check for Quota Exceeded (429)
        const msg = err.message || '';
        const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
        
        if (isQuota) {
           // Try to extract specific wait time
           const retryMatch = msg.match(/retry in ([0-9.]+)s/);
           if (retryMatch) {
              const seconds = Math.ceil(parseFloat(retryMatch[1]));
              throw new Error(`⚠️ Лимит запросов превышен. Пожалуйста, подождите ${seconds} сек. и попробуйте снова.`);
           }
           throw new Error("⚠️ Слишком много запросов. Сервер перегружен, попробуйте через минуту.");
        }

        if (retries < maxRetries) {
          retries++;
          console.warn(`Attempt ${retries} failed. Retrying...`);
          await wait(2000 * retries); // Exponential backoff
          continue;
        }
        
        throw err; // Re-throw if not a quota error or max retries reached
      }
    }

    // Parse response for image safely
    const candidate = response.candidates?.[0];
    
    if (!candidate) {
      throw new Error("Сервер не вернул вариантов изображения.");
    }

    if (!candidate.content) {
      if (candidate.finishReason === 'IMAGE_OTHER' || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
         console.warn(`Generation blocked. Reason: ${candidate.finishReason}`);
         throw new Error("ИИ не смог обработать это изображение (фильтры безопасности). Попробуйте другое фото.");
      }
      if (candidate.finishReason) {
         throw new Error(`Генерация прервана. Причина: ${candidate.finishReason}`);
      }
      throw new Error("Сервер вернул пустой ответ (без контента).");
    }

    const responseParts = candidate.content.parts;
    if (!responseParts || responseParts.length === 0) {
      throw new Error("В ответе отсутствуют данные изображения.");
    }

    for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }

    throw new Error("Изображение не найдено в ответе сервера.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
