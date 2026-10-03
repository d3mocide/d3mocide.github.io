import React from 'react';
import AsciiLogo from '@/components/AsciiLogo';

interface BrandingProps {
    className?: string;
    showNetworks?: boolean;
}

const Branding: React.FC<BrandingProps> = ({ className = '', showNetworks = true }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center pointer-events-none select-none ${className}`}>
            <AsciiLogo showNetworks={showNetworks} />
        </div>
    );
};

export default Branding;
