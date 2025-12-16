export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum ArtStyle {
  NO_STYLE = 'Нет стиля',
  CARTOON = 'Мультяшный',
  PENCIL = 'Карандаш',
  THREE_D = '3D Пластилин',
  WATERCOLOR = 'Акварель',
  ANIME = 'Аниме',
  PIXEL = 'Пиксель-арт',
  CYBERPUNK = 'Киберпанк',
  POP_ART = 'Поп-арт',
  RETRO = 'Ретро-комикс',
  OIL = 'Масло',
  IMPRESSIONISM = 'Импрессионизм',
  SURREALISM = 'Сюрреализм',
  STEAMPUNK = 'Стимпанк',
  GRAFFITI = 'Граффити',
  NOIR = 'Нуар',
  VAPORWAVE = 'Вейпорвейв',
  GOTHIC = 'Готика',
  LOW_POLY = 'Low Poly',
  ORIGAMI = 'Оригами',
  MOSAIC = 'Мозаика',
  STAINED_GLASS = 'Витраж',
  NEON = 'Неон',
  UKIO_E = 'Укиё-э',
  LEGO = 'Конструктор',
  LINE_ART = 'Лайн-арт',
  CHIBI = 'Чиби',
  PHOTOREALISM = 'Фотореализм',
  NEWSREEL = 'Кинохроника'
}

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
}

export type Quality = 'Standard' | 'High';

export interface HistoryItem {
  id: string;
  url: string;
  style: ArtStyle;
  timestamp: number;
}

export interface ReferenceImage {
  id: string;
  originalUrl: string; // Blob URL for display
  base64: string;      // Original full base64
  croppedBase64?: string; // If user selected a specific part
  mimeType: string;
}

export enum Tool {
  NONE = 'NONE',
  PENCIL = 'PENCIL',
  RECTANGLE = 'RECTANGLE',
  ERASER = 'ERASER',
  STAMP = 'STAMP'
}

export interface Point {
  x: number;
  y: number;
}

export interface SelectionData {
  type: Tool;
  points: Point[]; // Used for pencil
  rect?: { x: number; y: number; w: number; h: number }; // Used for rectangle
}
