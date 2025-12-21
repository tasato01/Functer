import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpDialog } from '../components/common/HelpDialog';

export const HelpPage: React.FC = () => {
    const navigate = useNavigate();

    // The HelpPage essentially just hosts the HelpDialog.
    // When the dialog is closed, we navigate back.
    return (
        <div className="h-screen w-screen bg-black relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black pointer-events-none" />
            <HelpDialog
                isOpen={true}
                onClose={() => navigate(-1)}
            />
        </div>
    );
};
