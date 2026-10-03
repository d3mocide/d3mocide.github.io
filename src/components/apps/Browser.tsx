import { useState } from 'react';
import { Spinner } from '@/components/ascii/primitives';

interface BrowserProps {
  initialUrl?: string;
}

const Browser = ({ initialUrl = 'https://google.com' }: BrowserProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl;
    if (!target.startsWith('http')) {
        target = 'https://' + target;
    }
    setUrl(target);
    setIsLoading(true);
  };

  const barBtn = 'px-1.5 text-neon-green hover:bg-neon-green/10 transition-colors';

  return (
    <div className="h-full flex flex-col bg-bg-panel -m-4">
      {/* Browser Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-neon-green/5 border-b border-neon-green/30 font-mono text-xs">
        <button className={`${barBtn} opacity-40 cursor-not-allowed`} disabled aria-label="Back">[←]</button>
        <button className={`${barBtn} opacity-40 cursor-not-allowed`} disabled aria-label="Forward">[→]</button>
        <button
            aria-label="Reload"
            className={barBtn}
            onClick={() => { setIsLoading(true); const current = url; setUrl(''); setTimeout(() => setUrl(current), 10); }}
        >
            {isLoading ? <>[<Spinner />]</> : '[↻]'}
        </button>

        <form onSubmit={handleNavigate} className="flex-1 flex items-center border border-neon-green/30 rounded-[3px] bg-black px-2">
            <span aria-hidden className="text-neon-green/60 mr-2">&gt;</span>
            <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                aria-label="Address"
                spellCheck={false}
                className="w-full py-1 bg-transparent text-white text-xs focus:outline-none font-mono [caret-color:#00ff41]"
            />
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-panel z-10 text-neon-green text-sm tracking-widest">
                <Spinner className="mr-2 text-xl" /> LOADING
            </div>
        )}
        <iframe 
            src={url} 
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Browser"
        />
      </div>
    </div>
  );
};

export default Browser;
