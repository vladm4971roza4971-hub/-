import React from 'react';
import { ArtStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: ArtStyle;
  onSelect: (style: ArtStyle) => void;
  disabled?: boolean;
}

// Rich visual definitions for style preview cards
const STYLE_VISUALS: Record<ArtStyle, { emoji: string; bgClass: string; darkText?: boolean; description: string }> = {
  [ArtStyle.NO_STYLE]: {
    emoji: '🚫',
    bgClass: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 border-2 border-dashed border-gray-300',
    darkText: true,
    description: 'Оригинальный стиль, только правки'
  },
  [ArtStyle.CARTOON]: { 
    emoji: '🤡', 
    bgClass: 'bg-gradient-to-br from-yellow-300 via-orange-300 to-red-300', 
    darkText: true,
    description: 'Веселый и яркий мультяшный стиль'
  },
  [ArtStyle.PENCIL]: { 
    emoji: '✏️', 
    bgClass: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-100 via-gray-200 to-gray-300', 
    darkText: true,
    description: 'Классический карандашный набросок'
  },
  [ArtStyle.THREE_D]: { 
    emoji: '🧊', 
    bgClass: 'bg-gradient-to-bl from-blue-300 via-cyan-300 to-teal-300', 
    darkText: true,
    description: 'Объемная 3D модель из пластилина'
  },
  [ArtStyle.WATERCOLOR]: { 
    emoji: '🎨', 
    bgClass: 'bg-gradient-to-tr from-pink-200 via-rose-200 to-indigo-200', 
    darkText: true,
    description: 'Нежный акварельный рисунок'
  },
  [ArtStyle.ANIME]: { 
    emoji: '✨', 
    bgClass: 'bg-gradient-to-br from-purple-300 via-pink-300 to-rose-300', 
    darkText: true,
    description: 'Выразительный аниме стиль'
  },
  [ArtStyle.PIXEL]: { 
    emoji: '👾', 
    bgClass: 'bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500', 
    darkText: true,
    description: '8-бит ретро графика'
  },
  [ArtStyle.CYBERPUNK]: { 
    emoji: '🤖', 
    bgClass: 'bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900', 
    darkText: false,
    description: 'Неон и технологии будущего'
  },
  [ArtStyle.POP_ART]: { 
    emoji: '🥫', 
    bgClass: 'bg-gradient-to-br from-yellow-400 via-red-500 to-blue-500', 
    darkText: false,
    description: 'Контрастный стиль Энди Уорхола'
  },
  [ArtStyle.RETRO]: { 
    emoji: '📰', 
    bgClass: 'bg-gradient-to-br from-amber-200 via-orange-300 to-yellow-600', 
    darkText: true,
    description: 'Винтажный комикс 50-х'
  },
  [ArtStyle.OIL]: { 
    emoji: '🖼️', 
    bgClass: 'bg-gradient-to-br from-amber-700 via-yellow-700 to-orange-900', 
    darkText: false,
    description: 'Классическая живопись маслом'
  },
  [ArtStyle.IMPRESSIONISM]: { 
    emoji: '🌻', 
    bgClass: 'bg-gradient-to-br from-green-300 via-teal-300 to-blue-300', 
    darkText: true,
    description: 'Мазки в стиле Моне'
  },
  [ArtStyle.SURREALISM]: { 
    emoji: '🫠', 
    bgClass: 'bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400', 
    darkText: false,
    description: 'Сны в стиле Сальвадора Дали'
  },
  [ArtStyle.STEAMPUNK]: { 
    emoji: '⚙️', 
    bgClass: 'bg-gradient-to-br from-orange-800 via-amber-900 to-stone-900', 
    darkText: false,
    description: 'Паровые машины и шестеренки'
  },
  [ArtStyle.GRAFFITI]: { 
    emoji: '🛹', 
    bgClass: 'bg-gradient-to-br from-lime-400 via-yellow-400 to-orange-500', 
    darkText: true,
    description: 'Уличный арт и баллончики'
  },
  [ArtStyle.NOIR]: { 
    emoji: '🕵️', 
    bgClass: 'bg-gradient-to-br from-gray-700 via-gray-900 to-black', 
    darkText: false,
    description: 'Драматичный черно-белый детектив'
  },
  [ArtStyle.VAPORWAVE]: { 
    emoji: '🌴', 
    bgClass: 'bg-gradient-to-br from-pink-400 via-fuchsia-400 to-cyan-400', 
    darkText: true,
    description: 'Эстетика 80-х и глитч'
  },
  [ArtStyle.GOTHIC]: { 
    emoji: '🏰', 
    bgClass: 'bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900', 
    darkText: false,
    description: 'Мрачная и таинственная атмосфера'
  },
  [ArtStyle.LOW_POLY]: { 
    emoji: '💎', 
    bgClass: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500', 
    darkText: false,
    description: 'Угловатая геометрия'
  },
  [ArtStyle.ORIGAMI]: { 
    emoji: '🦢', 
    bgClass: 'bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100', 
    darkText: true,
    description: 'Фигурки из сложенной бумаги'
  },
  [ArtStyle.MOSAIC]: { 
    emoji: '🧩', 
    bgClass: 'bg-gradient-to-br from-teal-400 via-emerald-400 to-green-500', 
    darkText: false,
    description: 'Узор из разноцветной плитки'
  },
  [ArtStyle.STAINED_GLASS]: { 
    emoji: '⛪', 
    bgClass: 'bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600', 
    darkText: false,
    description: 'Цветные витражные стекла'
  },
  [ArtStyle.NEON]: { 
    emoji: '💡', 
    bgClass: 'bg-gradient-to-br from-blue-700 via-indigo-800 to-violet-900', 
    darkText: false,
    description: 'Светящиеся линии во тьме'
  },
  [ArtStyle.UKIO_E]: { 
    emoji: '🌊', 
    bgClass: 'bg-gradient-to-br from-blue-200 via-sky-300 to-cyan-400', 
    darkText: true,
    description: 'Японская гравюра'
  },
  [ArtStyle.LEGO]: { 
    emoji: '🧱', 
    bgClass: 'bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500', 
    darkText: false,
    description: 'Конструктор из кубиков'
  },
  [ArtStyle.LINE_ART]: { 
    emoji: '✒️', 
    bgClass: 'bg-white border-2 border-gray-100', 
    darkText: true,
    description: 'Минималистичные линии'
  },
  [ArtStyle.CHIBI]: { 
    emoji: '👶', 
    bgClass: 'bg-gradient-to-br from-rose-200 via-pink-200 to-fuchsia-200', 
    darkText: true,
    description: 'Милые большеголовые персонажи'
  },
  [ArtStyle.PHOTOREALISM]: {
    emoji: '📸',
    bgClass: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600',
    darkText: true,
    description: 'Реалистичное фото'
  },
  [ArtStyle.NEWSREEL]: {
    emoji: '🎥',
    bgClass: 'bg-gradient-to-br from-stone-400 via-stone-500 to-stone-700',
    darkText: false,
    description: 'Старая черно-белая хроника'
  },
  // New Styles Visuals
  [ArtStyle.RENAISSANCE]: {
    emoji: '🎭',
    bgClass: 'bg-gradient-to-br from-yellow-700 via-amber-800 to-orange-900',
    darkText: false,
    description: 'Шедевр эпохи Возрождения'
  },
  [ArtStyle.ABSTRACT]: {
    emoji: '🌀',
    bgClass: 'bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400',
    darkText: true,
    description: 'Абстрактные формы и цвета'
  },
  [ArtStyle.HOLOGRAM]: {
    emoji: '💿',
    bgClass: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500',
    darkText: false,
    description: 'Футуристическая голограмма'
  },
  [ArtStyle.FANTASY]: {
    emoji: '🐉',
    bgClass: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700',
    darkText: false,
    description: 'Магический фэнтези мир'
  },
  [ArtStyle.COMICS]: {
    emoji: '🦸',
    bgClass: 'bg-gradient-to-br from-blue-600 via-red-600 to-yellow-500',
    darkText: false,
    description: 'Современный супергеройский комикс'
  },
  [ArtStyle.MANGA]: {
    emoji: '🗯️',
    bgClass: 'bg-white border-2 border-black bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px]',
    darkText: true,
    description: 'Японская черно-белая манга'
  },
  [ArtStyle.GROTESQUE]: {
    emoji: '👺',
    bgClass: 'bg-gradient-to-br from-stone-500 via-red-900 to-black',
    darkText: false,
    description: 'Странные и пугающие пропорции'
  },
  [ArtStyle.TRIBAL]: {
    emoji: '🗿',
    bgClass: 'bg-gradient-to-br from-orange-300 via-stone-400 to-stone-600',
    darkText: true,
    description: 'Этнические узоры и мотивы'
  },
  [ArtStyle.MYSTICISM]: {
    emoji: '🔮',
    bgClass: 'bg-gradient-to-br from-violet-600 via-fuchsia-700 to-purple-900',
    darkText: false,
    description: 'Таро, руны и магия'
  },
  [ArtStyle.CHILDRENS_BOOK]: {
    emoji: '🧸',
    bgClass: 'bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100',
    darkText: true,
    description: 'Иллюстрация из доброй сказки'
  },
  [ArtStyle.ART_DECO]: {
    emoji: '🍸',
    bgClass: 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-amber-200 border border-yellow-800',
    darkText: true,
    description: 'Роскошь 20-х годов'
  },
  [ArtStyle.ART_NOUVEAU]: {
    emoji: '🌺',
    bgClass: 'bg-gradient-to-br from-green-200 via-yellow-200 to-orange-200',
    darkText: true,
    description: 'Изящные линии и цветы'
  },
  [ArtStyle.BAROQUE]: {
    emoji: '🎻',
    bgClass: 'bg-gradient-to-br from-red-900 via-rose-900 to-slate-900',
    darkText: false,
    description: 'Драматичный и пышный стиль'
  },
  [ArtStyle.CUBISM]: {
    emoji: '🧊',
    bgClass: 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600',
    darkText: true,
    description: 'Геометрические фрагменты'
  },
  [ArtStyle.MECHA]: {
    emoji: '🦾',
    bgClass: 'bg-gradient-to-br from-gray-300 via-gray-500 to-slate-600',
    darkText: true,
    description: 'Боевые роботы и броня'
  },
  [ArtStyle.ANCIENT_EGYPT]: {
    emoji: '🏺',
    bgClass: 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400',
    darkText: true,
    description: 'Фрески Древнего Египта'
  },
  [ArtStyle.WILD_WEST]: {
    emoji: '🤠',
    bgClass: 'bg-[url("https://www.transparenttextures.com/patterns/aged-paper.png")] bg-amber-200',
    darkText: true,
    description: 'Постер розыска с Дикого Запада'
  },
  [ArtStyle.PSYCHEDELIC]: {
    emoji: '🍄',
    bgClass: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500',
    darkText: false,
    description: 'Кислотные цвета 60-х'
  },
  [ArtStyle.CAVE_PAINTING]: {
    emoji: '🐂',
    bgClass: 'bg-stone-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-400 via-stone-600 to-stone-800',
    darkText: false,
    description: 'Наскальная живопись'
  },
  [ArtStyle.POST_APOCALYPTIC]: {
    emoji: '☢️',
    bgClass: 'bg-gradient-to-br from-stone-600 via-gray-600 to-zinc-700',
    darkText: false,
    description: 'Ржавчина и пустошь'
  },
  [ArtStyle.BAUHAUS]: {
    emoji: '📐',
    bgClass: 'bg-white border-4 border-l-red-500 border-t-yellow-500 border-r-blue-500 border-b-black',
    darkText: true,
    description: 'Функциональный геометризм'
  },
  [ArtStyle.SAMURAI]: {
    emoji: '⚔️',
    bgClass: 'bg-gradient-to-br from-gray-200 via-red-100 to-gray-200',
    darkText: true,
    description: 'Японская тушь и воины'
  }
};

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelect, disabled }) => {
  return (
    <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar p-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.values(ArtStyle).map((style) => {
          const visual = STYLE_VISUALS[style] || { emoji: '🎨', bgClass: 'bg-gray-100', darkText: true, description: '' };
          const isSelected = selectedStyle === style;
          
          return (
            <button
              key={style}
              onClick={() => onSelect(style)}
              disabled={disabled}
              className={`
                group relative h-28 rounded-2xl overflow-hidden transition-all duration-300 text-left
                ${isSelected 
                  ? 'ring-4 ring-primary ring-offset-2 scale-[1.02] shadow-xl z-10' 
                  : 'hover:scale-[1.02] hover:shadow-lg border border-transparent opacity-90 hover:opacity-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
              `}
            >
              {/* Background Preview */}
              <div className={`absolute inset-0 ${visual.bgClass} transition-transform duration-700 group-hover:scale-110`} />
              
              {/* Content */}
              <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <span className="text-3xl drop-shadow-md transform transition-transform duration-300 group-hover:scale-110">
                  {visual.emoji}
                </span>
                
                <div>
                   <span className={`block text-xs sm:text-sm font-bold tracking-wide drop-shadow-sm leading-tight ${visual.darkText ? 'text-gray-900' : 'text-white'}`}>
                      {style}
                   </span>
                   <span className={`block text-[10px] mt-1 opacity-80 leading-3 ${visual.darkText ? 'text-gray-800' : 'text-gray-100'}`}>
                      {visual.description}
                   </span>
                </div>
              </div>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05); 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af; 
        }
      `}</style>
    </div>
  );
};
