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
