import React from 'react';
import DotLogo from '@/components/DotLogo';

interface BrandingProps {
    className?: string;
    showNetworks?: boolean;
}

const Branding: React.FC<BrandingProps> = ({ className = '', showNetworks = true }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center pointer-events-none select-none ${className}`}>
            <DotLogo showNetworks={showNetworks} />
        </div>
    );
};

export default Branding;
