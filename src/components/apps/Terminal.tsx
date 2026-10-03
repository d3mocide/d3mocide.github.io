import React, { useState, useRef, useEffect } from 'react';
import { useOSStore, THEMES, type ThemeId } from '@/store/useOSStore';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';
import { APPS } from '@/lib/apps';
import { useSoundFX } from '@/hooks/useSoundFX';
import { LOGO_ART } from '@/lib/asciiArt';

type ItemType = 'input' | 'output' | 'error' | 'system' | 'art';

interface HistoryItem {
  type: ItemType;
  content: string;
}

const PROMPT = 'guest@d3frag:~$';
const COMMANDS = ['about', 'banner', 'cat', 'clear', 'date', 'echo', 'exit', 'flasher', 'game', 'help', 'invaders', 'keys', 'ls', 'matrix', 'mesh', 'neofetch', 'open', 'ping', 'projects', 'reboot', 'settings', 'sudo', 'theme', 'whoami', 'whois'];

const QUICK_CMDS = ['help', 'about', 'projects', 'mesh', 'game', 'invaders', 'theme', 'clear'];

const HELP = [
  'AVAILABLE COMMANDS',
  '  about        who we are',
  '  whois d3frag organisation card',
  '  banner       print the logo',
  '  neofetch     system summary',
  '  ls           list the filesystem',
  '  cat <file>   read README.txt / about.txt',
  '  open <repo>  show a project on the Mesh Map',
  '  mesh         open the Mesh Map',
  '  projects     launch Project Explorer',
  '  flasher      launch Web Flasher',
  '  game         play PACKET_LOSS (snake)',
  '  invaders     play JAM_INVADERS',
  '  settings     open System Config',
  '  theme [name] list or switch theme',
  '  matrix       take the red pill',
  '  ping <host>  simulated ping',
  '  keys         keyboard shortcuts',
  '  reboot       replay the boot sequence',
  '  whoami, date, echo ..., clear, exit',
  '',
  'TIP: Tab completes, ↑/↓ browse history.',
].join('\n');

const FILES: Record<string, string> = {
  'about.txt': 'd3FRAG Networks is a Portland based organization specializing in Radio Frequency Analysis and Mesh Network tool development.',
  'readme.txt': [
    'd3_OS — a web operating system for d3FRAG Networks.',
    '',
    '  * The background is a living ASCII mesh: pinned GitHub repos are the named nodes.',
    '    Click a node (or run "open <repo>") to inspect it on the Mesh Map.',
    '  * Drag windows to a screen edge to snap them; Alt+Enter maximizes.',
    '  * Signal strength and packet traffic are simulated; repos, stars and links are real.',
  ].join('\n'),
};

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
    const { openWindow, closeWindow, setTheme, setBooting, triggerMatrix, selectNode } = useOSStore();
    const { repos, username } = usePinnedRepos();
    const { playKeystroke, playError } = useSoundFX();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    // Desktop: keep the cursor in the prompt. On touch screens focusing pops the keyboard over
    // everything, so only do it when the user taps the prompt itself (see the container's onClick).
    useEffect(() => {
        if (!window.matchMedia?.('(pointer: coarse)').matches) inputRef.current?.focus();
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
                return { type: 'output', content: 'projects/   flasher/   mesh/   about.txt   README.txt' };
            case 'cat': {
                const f = FILES[(rest[0] || '').toLowerCase()];
                if (!rest[0]) throw new Error('cat: missing file operand');
                if (!f) throw new Error(`cat: ${rest[0]}: No such file`);
                return { type: 'output', content: f };
            }
            case 'whois':
                return {
                    type: 'output',
                    content: [
                        'd3FRAG Networks',
                        '───────────────',
                        'Location  Portland',
                        'Focus     Radio Frequency Analysis, Mesh Network tooling',
                        `GitHub    github.com/${username}`,
                        'Web       d3frag.net',
                        `Projects  ${repos.filter((r) => !r.isArchived).length} pinned`,
                    ].join('\n'),
                };
            case 'open': {
                const visible = repos.filter((r) => !r.isArchived);
                const q = rest.join(' ').toLowerCase();
                if (!q) return { type: 'output', content: 'USAGE: open <repo>\n' + visible.map((r) => `  ${r.name}`).join('\n') };
                const hit = visible.find((r) => r.name.toLowerCase() === q) ?? visible.find((r) => r.name.toLowerCase().includes(q));
                if (!hit) throw new Error(`open: no project matching "${rest.join(' ')}"`);
                selectNode(hit.id);
                openWindow('mesh', 'MESH_MAP');
                return { type: 'output', content: `Opening ${hit.name} on the Mesh Map...` };
            }
            case 'mesh':
                openWindow('mesh', 'MESH_MAP');
                return { type: 'output', content: 'Opening Mesh Map...' };
            case 'matrix':
                triggerMatrix();
                return { type: 'output', content: 'Wake up, guest...\n(the background will recover in ~12 seconds)' };
            case 'theme': {
                const want = (rest[0] || '').toLowerCase();
                if (!want) return { type: 'output', content: `THEMES: ${THEMES.join('  ')}\nUSAGE: theme <name>` };
                if (!THEMES.includes(want as ThemeId)) throw new Error(`theme: unknown theme "${want}" (try: ${THEMES.join(', ')})`);
                setTheme(want as ThemeId);
                return { type: 'output', content: `Theme set to ${want}.` };
            }
            case 'ping': {
                const host = rest[0] || 'd3frag.net';
                const lines = [`PING ${host} (simulated — no packets leave your browser)`];
                let total = 0;
                for (let n = 0; n < 4; n++) {
                    const ms = 8 + Math.round(Math.random() * 24);
                    total += ms;
                    lines.push(`64 bytes from ${host}: icmp_seq=${n + 1} ttl=57 time=${ms} ms`);
                }
                lines.push(`avg ${(total / 4).toFixed(1)} ms`);
                return { type: 'output', content: lines.join('\n') };
            }
            case 'keys':
                return {
                    type: 'output',
                    content: [
                        ...APPS.map((a) => `  Alt+${a.key}      ${a.label}`),
                        '  Alt+1..9    focus nth window',
                        '  Alt+[ / ]   previous / next window',
                        '  Alt+W       close   Alt+N  minimize',
                        '  Alt+Enter   maximize / restore',
                        '  Alt+←/→     snap to left / right half',
                        '  Alt+D       show desktop',
                        '  right-click the desktop for a quick menu',
                    ].join('\n'),
                };
            case 'reboot':
                setBooting(true);
                return null;
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
            case 'game':
            case 'play':
                openWindow('game', 'PACKET_LOSS');
                return { type: 'output', content: 'Routing packets... good luck.' };
            case 'invaders':
                openWindow('invaders', 'JAM_INVADERS');
                return { type: 'output', content: 'Jammers inbound. Defend the mesh.' };
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

    const run = (line: string) => {
        const newHistory: HistoryItem[] = [...history, { type: 'input', content: line }];
        if (line.trim()) past.current.push(line);
        cursor.current = -1;

        try {
            const output = handleCommand(line);
            if (output) newHistory.push(output);
        } catch (err: unknown) {
            playError();
            newHistory.push({ type: 'error', content: err instanceof Error ? err.message : 'Unknown error' });
        }

        if (line.trim().split(/\s+/)[0]?.toLowerCase() !== 'clear') {
            setHistory(newHistory);
        }
        setInput('');
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            run(input);
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
        <div
            className="h-full flex flex-col font-mono text-sm"
            onClick={() => { if (!window.getSelection()?.toString()) inputRef.current?.focus(); }}
        >
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

            {/* Tap-to-run shortcuts: typing on a phone keyboard is slow */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto pt-2 pb-1" onClick={(e) => e.stopPropagation()}>
                {QUICK_CMDS.map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => run(c)}
                        className="shrink-0 h-9 px-3 border border-neon-green/40 rounded-[3px] text-neon-green text-xs active:bg-neon-green/20"
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div className="flex items-center pt-2 border-t border-neon-green/20">
                <span className="text-neon-green mr-2 shrink-0">{PROMPT}</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-gray-700 [caret-color:rgb(var(--c-primary))] [caret-shape:block]"
                    placeholder="type 'help'"
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
