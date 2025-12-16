import React from 'react';

const LOADING_MESSAGES = [
  "Учим ИИ рисовать...",
  "Преувеличиваем черты лица...",
  "Добавляем побольше носа...",
  "Ищем смешной ракурс...",
  "Точим цифровые карандаши...",
  "Советуемся с богами комедии..."
];

export const Spinner: React.FC = () => {
  const [message, setMessage] = React.useState(LOADING_MESSAGES[0]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative w-24 h-24">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
          🎨
        </div>
      </div>
      <p className="text-lg font-comic font-bold text-dark animate-pulse text-center">
        {message}
      </p>
    </div>
  );
};
