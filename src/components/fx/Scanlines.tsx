// Deliberately faint: a hint of horizontal CRT lines, nothing more. Toggle in System Config.
const Scanlines = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.18] bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_3px]" />
    );
};

export default Scanlines;
