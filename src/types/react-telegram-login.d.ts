declare module 'react-telegram-login' {
    import React from 'react';

    interface TelegramLoginButtonProps {
        botName: string;
        dataOnauth: (user: TelegramUser) => void;
        buttonSize?: 'large' | 'medium' | 'small';
        cornerRadius?: number;
        requestAccess?: string;
        usePic?: boolean;
        lang?: string;
    }

    interface TelegramUser {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
        photo_url?: string;
        auth_date: number;
        hash: string;
    }

    const TelegramLoginButton: React.FC<TelegramLoginButtonProps>;
    export default TelegramLoginButton;
}
