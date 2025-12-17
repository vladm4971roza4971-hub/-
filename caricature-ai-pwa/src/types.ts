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
  NEWSREEL = 'Кинохроника',
  RENAISSANCE = 'Ренессанс',
  ABSTRACT = 'Абстракция',
  HOLOGRAM = 'Голограмма',
  FANTASY = 'Фэнтези',
  COMICS = 'Супергерой',
  MANGA = 'Манга',
  GROTESQUE = 'Гротеск',
  TRIBAL = 'Трайбл',
  MYSTICISM = 'Мистика',
  CHILDRENS_BOOK = 'Детская книга',
  ART_DECO = 'Арт-деко',
  ART_NOUVEAU = 'Ар-нуво',
  BAROQUE = 'Барокко',
  CUBISM = 'Кубизм',
  MECHA = 'Меха',
  ANCIENT_EGYPT = 'Египет',
  WILD_WEST = 'Дикий Запад',
  PSYCHEDELIC = 'Психоделика',
  CAVE_PAINTING = 'Наскальный',
  POST_APOCALYPTIC = 'Постапокалипсис',
  BAUHAUS = 'Баухаус',
  SAMURAI = 'Самурай',
  
  // --- NEW ADDITIONS ---
  CUTE_CREATURE = 'Милашка',
  FUTURE_ARCH = 'Футуризм (Арх)',
  GOTHIC_ARCH = 'Готика (Арх)',
  BRUTALISM = 'Брутализм',
  AI_LOGO = 'Логотип',
  FANTASY_MAP = 'Карта',
  OCEAN_LIFE = 'Подводный мир',
  SPACE_WORLD = 'Космос',
  URBAN_FASHION = 'Уличная мода',
  MINIMALISM = 'Минимализм',
  HORROR = 'Хоррор',
  ROMANTICISM = 'Романтизм',
  ABSTRACT_EXPRESSIONISM = 'Экспрессионизм',
  GLADIATOR = 'Гладиатор',
  ALIEN_FLORA = 'Инопланетный',
  FAIRY_TALE = 'Сказка',
  MYTHIC_CREATURE = 'Мифическое существо',
  CARNIVAL = 'Карнавал',
  ACTION_FIGURE = 'Экшен-фигурка',
  BLUEPRINT = 'Чертеж',
  ZOMBIE = 'Зомби',
  BIOLUMINESCENCE = 'Биолюминесценция',
  ICE_WORLD = 'Ледяной мир',
  ATLANTIS = 'Атлантида',
  KAWAII_EMOJI = 'Кавай эмодзи',
  WITCHCRAFT = 'Ведьмовство',
  MECHANICAL_ANATOMY = 'Мех. анатомия',
  CLOCKWORK = 'Заводной',
  MARIONETTE = 'Марионетка',
  TROPICAL = 'Тропики',
  ELVEN = 'Эльфийский',
  ZENTANGLE = 'Зентангл',
  MAYAN = 'Майя',
  DECOUPAGE = 'Декупаж',
  TERRARIUM = 'Террариум',
  COLLAGE = 'Фотоколлаж',
  PLAYING_CARD = 'Игральная карта'
}

export enum Tool {
  NONE = 'NONE',
  PENCIL = 'PENCIL',
  RECTANGLE = 'RECTANGLE',
  ERASER = 'ERASER',
  STAMP = 'STAMP'
}

export type AIProvider = 'gemini' | 'openai' | 'stability' | 'huggingface' | 'pollinations';

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  style: ArtStyle;
  timestamp: number;
}

export interface ReferenceImage {
  id: string;
  originalUrl: string;
  base64: string;
  croppedBase64?: string;
  mimeType: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface SelectionData {
  type: Tool;
  points: Point[];
  rect?: { x: number; y: number; w: number; h: number };
}

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
}

export interface SavedCredential {
  id: string;
  provider: AIProvider;
  alias: string;
  key: string;
  createdAt: number;
}

export interface SavedProxy {
  id: string;
  alias: string;
  url: string;
  createdAt: number;
}
