import React from 'react';

interface SpinnerProps {
    size?: string;
    color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'w-8 h-8', color = 'border-indigo-400' }) => {
    return (
        <div className={`${size} border-4 ${color} border-t-transparent border-solid rounded-full animate-spin`}></div>
    );
};

export default Spinner;
