import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ArtStyle } from "../types";
import type { ReferenceImage, AppSettings } from "../types";

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

// File -> base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Ожидание
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Проверка API-ключа (только Gemini и Pollinations)
export const validateApiKey = async (settings: AppSettings): Promise<boolean> => {
  try {
    if (settings.provider === "pollinations") {
      // Pollinations не требует ключа
      return true;
    }

    if (settings.provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: settings.apiKey });
      // Простой тест-запрос
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "test" as any,
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// ================== ПОДГОТОВКА ПРОМПТОВ ==================

const getStylePrompt = (style: ArtStyle): string => {
  switch (style) {
    case ArtStyle.CARTOON:
      return "vibrant 2D cartoon caricature, flat colors, bold outlines, funny exaggeration";
    case ArtStyle.PENCIL:
      return "black and white pencil sketch caricature, cross-hatching, hand-drawn look";
    default:
      // Значения enum у вас на русском, но на всякий случай приводим к строке
      return "funny caricature, " + String(style).toLowerCase();
  }
};

const getBasePrompt = (style: ArtStyle) => {
  const stylePrompt = style === ArtStyle.NO_STYLE ? "" : getStylePrompt(style);

  if (style === ArtStyle.NO_STYLE) {
    return `Edit the MAIN IMAGE based on instructions. Maintain original photographic style, lighting, and realism. Do not apply filters or caricature distortion unless asked.`;
  } else {
    return `Create a fun and artistic illustration based on the MAIN IMAGE in the style of ${stylePrompt}. Capture the essence and personality of the subject with a stylized, artistic approach.`;
  }
};

const getFriendlyErrorMessage = (error: any): string => {
  const msg = error?.message || String(error);

  if (msg.includes("429") || msg.includes("Quota") || msg.includes("RESOURCE_EXHAUSTED"))
    return "Превышен лимит запросов Google. Попробуйте позже или смените ключ.";
  if (msg.includes("401") || msg.includes("API key"))
    return "Неверный API ключ. Проверьте настройки.";
  if (msg.includes("403") || msg.includes("permission"))
    return "Доступ запрещен. Проверьте права API ключа (GCP Project).";
  if (msg.includes("SAFETY") || msg.includes("HARM") || msg.includes("blocked"))
    return "Генерация заблокирована фильтром безопасности. Попробуйте другое фото или описание.";
  if (msg.includes("503") || msg.includes("Overloaded"))
    return "Сервис перегружен. Попробуйте через минуту.";
  if (msg.includes("finishReason")) return `Модель завершила работу с причиной: ${msg}`;

  return `Произошла ошибка: ${msg.slice(0, 100)}...`;
};

// ================== GEMINI ==================

const generateWithGemini = async (
  apiKey: string,
  mainImageBase64: string,
  style: ArtStyle,
  customPrompt: string,
  referenceImages: ReferenceImage[],
  mimeType: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  const modelName = "gemini-2.5-flash-image";

  let prompt = getBasePrompt(style);

  if (referenceImages.length > 0) {
    prompt += `\n\nUse provided ADDITIONAL IMAGES to modify the main image. Blend elements seamlessly.`;
  }
  if (customPrompt) prompt += `\n\nInstructions: ${customPrompt}`;

  const parts: any[] = [
    { text: prompt },
    { inlineData: { data: mainImageBase64, mimeType: mimeType } },
  ];

  referenceImages.forEach((ref) => {
    parts.push({
      inlineData: { data: ref.croppedBase64 || ref.base64, mimeType: ref.mimeType },
    });
  });

  const generationConfig: any = {
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
    imageConfig: { aspectRatio: "1:1" },
  };

  let retries = 0;
  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        // as any, чтобы TypeScript не ругался на форму contents
        contents: { parts } as any,
        config: generationConfig,
      });

      const candidate = (response as any).candidates?.[0];

      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(`Finish Reason: ${candidate.finishReason}`);
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      throw new Error("Gemini не вернул изображение.");
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isQuota =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("Quota exceeded");

      if (isQuota && retries < 2) {
        retries++;
        console.warn(`Quota exceeded. Retrying in ${2 * retries}s...`);
        await wait(2000 * retries);
        continue;
      }
      throw err;
    }
  }
};

// ================== POLLINATIONS ==================

const generateWithPollinations = async (style: ArtStyle, customPrompt: string): Promise<string> => {
  const stylePrompt = getStylePrompt(style);
  const prompt = encodeURIComponent(
    `${customPrompt ? customPrompt + ", " : ""}funny caricature, ${stylePrompt}`
  );
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${Math.floor(
    Math.random() * 1000
  )}&nologo=true`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Ошибка сервиса Pollinations.");

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// ================== ГЛАВНАЯ ФУНКЦИЯ ==================

export const generateCaricature = async (
  mainImageBase64: string,
  style: ArtStyle,
  customPrompt: string,
  referenceImages: ReferenceImage[] = [],
  mimeType: string = "image/jpeg",
  settings?: AppSettings | null
): Promise<string> => {
  // Вариант с API_KEY из env (если настроен)
  if (!settings && (process as any).env?.API_KEY) {
    try {
      return await generateWithGemini(
        (process as any).env.API_KEY,
        mainImageBase64,
        style,
        customPrompt,
        referenceImages,
        mimeType
      );
    } catch (e) {
      throw new Error(getFriendlyErrorMessage(e));
    }
  }

  // Pollinations без ключа
  if (settings?.provider === "pollinations") {
    return await generateWithPollinations(style, customPrompt);
  }

  if (!settings || !settings.apiKey) {
    throw new Error("API Key не найден. Пожалуйста, настройте провайдера в меню.");
  }

  try {
    if (settings.provider === "gemini") {
      return await generateWithGemini(
        settings.apiKey,
        mainImageBase64,
        style,
        customPrompt,
        referenceImages,
        mimeType
      );
    }

    // Другие провайдеры сейчас не поддерживаются
    throw new Error("Поддерживаются только Gemini и Pollinations.");
  } catch (error: any) {
    console.error("Generation Error:", error);
    const friendlyMsg = getFriendlyErrorMessage(error);
    throw new Error(friendlyMsg);
  }
};
