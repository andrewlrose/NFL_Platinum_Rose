import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Platinum Rose. All rights reserved.
        </p>
        <div className="flex justify-center gap-4 mt-2 text-xs text-slate-600">
          <span>Powered by React & Vite</span>
          <span>•</span>
          <span>Data provided by The Odds API</span>
          <span>•</span>
          <span>Weather via Open-Meteo</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;