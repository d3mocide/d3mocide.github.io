import React, { useState, useRef, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';
import { LOGO_ART } from '@/lib/asciiArt';

type ItemType = 'input' | 'output' | 'error' | 'system' | 'art';

interface HistoryItem {
  type: ItemType;
  content: string;
}

const PROMPT = 'guest@d3frag:~$';
const COMMANDS = ['about', 'banner', 'clear', 'date', 'echo', 'exit', 'flasher', 'help', 'ls', 'neofetch', 'projects', 'settings', 'sudo', 'whoami'];

const HELP = [
  'AVAILABLE COMMANDS',
  '  about      who we are',
  '  banner     print the logo',
  '  neofetch   system summary',
  '  ls         list the filesystem',
  '  projects   launch Project Explorer',
  '  flasher    launch Web Flasher',
  '  settings   open System Config',
  '  whoami     current user',
  '  date       current date/time',
  '  echo ...   repeat text',
  '  clear      clear the screen',
  '  exit       close this terminal',
  '',
  'TIP: Tab completes, ↑/↓ browse history.',
].join('\n');

const Terminal = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([
        { type: 'system', content: 'd3FRAG KERNEL v3.0.4' },
        { type: 'system', content: 'COPYRIGHT (C) 2026' },
        { type: 'output', content: 'Type "help" for available commands.' },
    ]);
    const past = useRef<string[]>([]);
    const cursor = useRef(-1);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { openWindow, closeWindow } = useOSStore();
    const { playKeystroke, playError } = useSoundFX();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    // Keep focus on input
    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        document.addEventListener('click', focusInput);
        return () => document.removeEventListener('click', focusInput);
    }, []);

    // Returns the output (and how to style it), null for no output, or throws for an error.
    const handleCommand = (raw: string): { type: ItemType; content: string } | null => {
        const [name, ...rest] = raw.trim().split(/\s+/);
        const cmd = (name || '').toLowerCase();

        switch (cmd) {
            case '':
                return null;
            case 'help':
                return { type: 'output', content: HELP };
            case 'clear':
                setHistory([]);
                return null;
            case 'about':
                return { type: 'output', content: 'd3FRAG Networks is a Portland based organization specializing in Radio Frequency Analysis and Mesh Network tool development.' };
            case 'whoami':
                return { type: 'output', content: 'guest (uid=1000) — group: visitors' };
            case 'date':
                return { type: 'output', content: new Date().toString() };
            case 'echo':
                return { type: 'output', content: rest.join(' ') };
            case 'ls':
                return { type: 'output', content: 'projects/   flasher/   settings/   README.txt' };
            case 'banner':
                return { type: 'art', content: LOGO_ART.join('\n') };
            case 'neofetch': {
                const up = Math.max(1, Math.round(performance.now() / 60000));
                return {
                    type: 'output',
                    content: [
                        'guest@d3frag',
                        '─────────────',
                        'OS      d3_OS v1.0.0',
                        'Kernel  d3FRAG v3.0.4',
                        `Uptime  ${up} min`,
                        'Shell   d3sh',
                        'Term    D3_TERM v2.0',
                        'Theme   ASCII // phosphor green',
                        `Screen  ${window.innerWidth}x${window.innerHeight}`,
                    ].join('\n'),
                };
            }
            case 'projects':
                openWindow('projects', 'PROJECT_EXPLORER');
                return { type: 'output', content: 'Launching Project Explorer...' };
            case 'flasher':
                openWindow('flasher', 'WEB_FLASHER');
                return { type: 'output', content: 'Launching Web Flasher...' };
            case 'settings':
                openWindow('settings', 'SYSTEM_CONFIG');
                return { type: 'output', content: 'Opening System Config...' };
            case 'exit':
                closeWindow('terminal');
                return null;
            case 'sudo':
                return { type: 'error', content: 'PERMISSION DENIED: You are not in the sudoers file. This incident will be reported.' };
            default:
                throw new Error(`Command not found: ${cmd}`);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const newHistory: HistoryItem[] = [...history, { type: 'input', content: input }];
            if (input.trim()) past.current.push(input);
            cursor.current = -1;

            try {
                const output = handleCommand(input);
                if (output) newHistory.push(output);
            } catch (err: unknown) {
                playError();
                newHistory.push({ type: 'error', content: err instanceof Error ? err.message : 'Unknown error' });
            }

            if (input.trim().split(/\s+/)[0]?.toLowerCase() !== 'clear') {
                setHistory(newHistory);
            }
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!past.current.length) return;
            cursor.current = cursor.current === -1 ? past.current.length - 1 : Math.max(0, cursor.current - 1);
            setInput(past.current[cursor.current]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (cursor.current === -1) return;
            cursor.current += 1;
            if (cursor.current >= past.current.length) {
                cursor.current = -1;
                setInput('');
            } else setInput(past.current[cursor.current]);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const matches = COMMANDS.filter((c) => c.startsWith(input.trim().toLowerCase()));
            if (input.trim() && matches.length === 1) setInput(matches[0]);
            else if (input.trim() && matches.length > 1) setHistory([...history, { type: 'input', content: input }, { type: 'output', content: matches.join('   ') }]);
        } else {
            playKeystroke();
        }
    };

    return (
        <div className="h-full flex flex-col font-mono text-sm" onClick={() => inputRef.current?.focus()}>
            <div className="flex-1 overflow-y-auto space-y-0.5 p-1">
                {history.map((item, i) => (
                    <div
                        key={i}
                        className={`whitespace-pre-wrap break-words ${
                            item.type === 'error' ? 'text-neon-red' :
                            item.type === 'input' ? 'text-white' :
                            item.type === 'system' ? 'text-neon-blue' :
                            item.type === 'art' ? 'text-neon-green leading-[1.1] text-[10px] sm:text-xs overflow-x-auto' :
                            'text-gray-300'
                        }`}
                    >
                        {item.type === 'input' && <span className="text-neon-green mr-2">{PROMPT}</span>}
                        {item.type === 'error' && <span className="mr-2" aria-hidden>✗</span>}
                        {item.content}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-center pt-2 border-t border-neon-green/20">
                <span className="text-neon-green mr-2 shrink-0">{PROMPT}</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-gray-700 [caret-color:#00ff41] [caret-shape:block]"
                    placeholder="type 'help'"
                    autoFocus
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    aria-label="Terminal input"
                />
            </div>
        </div>
    );
};

export default Terminal;
