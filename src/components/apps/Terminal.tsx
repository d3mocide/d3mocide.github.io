import React, { useState, useRef, useEffect } from 'react';
import { useOSStore } from '@/store/useOSStore';
import { useSoundFX } from '@/hooks/useSoundFX';

interface HistoryItem {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

const Terminal = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<HistoryItem[]>([
        { type: 'system', content: 'd3FRAG KERNEL v3.0.4' },
        { type: 'system', content: 'COPYRIGHT (C) 2026' },
        { type: 'output', content: 'Type "help" for available commands.' },
    ]);
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

    const handleCommand = (cmd: string) => {
        const trimmed = cmd.trim().toLowerCase();
        
        switch (trimmed) {
            case 'help':
                return [
                    'AVAILABLE COMMANDS:',
                    '  about     - WHOAMI / System Info',
                    '  projects  - Launch Portfolio Explorer',
                    '  flasher   - Launch Web Flasher',
                    '  clear     - Clear terminal history',
                    '  exit      - Close terminal session',
                    '  sudo      - Execute as superuser'
                ].join('\n');
            case 'clear':
                setHistory([]);
                return null;
            case 'about':
                return 'd3FRAG Networks is a Portland based organization specializing in Radio Frequency Analysis and Mesh Network tool development.';
            case 'projects':
                openWindow('projects', 'PROJECT_EXPLORER');
                return 'Launching Project Explorer...';
            case 'flasher':
                openWindow('flasher', 'WEB_FLASHER');
                return 'Launching Web Flasher...';
            case 'exit':
                closeWindow('terminal');
                return null;
            case 'sudo':
                return 'PERMISSION DENIED: You are not in the sudoers file. This incident will be reported.';
            case '':
                return null;
            default:
                throw new Error(`Command not found: ${trimmed}`);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const newHistory = [...history, { type: 'input', content: input } as HistoryItem];
            
            try {
                const output = handleCommand(input);
                if (output) {
                    newHistory.push({ type: 'output', content: output });
                }
            } catch (err: unknown) {
                playError();
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                newHistory.push({ type: 'error', content: errorMessage });
            }

            if (input.trim() !== 'clear') { 
                setHistory(newHistory);
            }
            setInput('');
        } else {
            playKeystroke();
        }
    };

    return (
        <div className="h-full flex flex-col font-mono text-sm" onClick={() => inputRef.current?.focus()}>
            <div className="flex-1 overflow-y-auto space-y-1 p-1">
                {history.map((item, i) => (
                    <div key={i} className={`whitespace-pre-wrap ${
                        item.type === 'error' ? 'text-neon-red text-glow-pink' :
                        item.type === 'input' ? 'text-white' : // Input text itself doesn't glow, only the '$'
                        item.type === 'system' ? 'text-neon-blue text-glow-blue' :
                        'text-neon-green text-glow-green' // This is for 'output' type
                    }`}>
                        {item.type === 'input' && <span className="text-neon-blue text-glow-blue mr-2">$</span>}
                        {item.content}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            
            <div className="flex items-center pt-2 border-t border-neon-green/20">
                <span className="text-neon-blue mr-2">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600"
                    placeholder="..."
                    autoFocus
                    spellCheck={false}
                />
            </div>
        </div>
    );
};

export default Terminal;
