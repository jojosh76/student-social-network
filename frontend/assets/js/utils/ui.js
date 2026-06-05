'use strict';

const AppUI = (() => {
    function ensureStyles() {
        if (document.getElementById('app-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'app-ui-styles';
        style.textContent = `
            .app-toast-stack {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: min(360px, calc(100vw - 32px));
            }
            .app-toast {
                background: #ffffff;
                border: 1px solid #e8edf5;
                border-left: 4px solid #4a90e2;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.12);
                color: #2d3436;
                padding: 12px 14px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 0.9rem;
                line-height: 1.4;
                animation: appToastIn 0.2s ease-out;
            }
            .app-toast.success { border-left-color: #2ecc71; }
            .app-toast.error { border-left-color: #e74c3c; }
            .app-toast.info { border-left-color: #4a90e2; }
            @keyframes appToastIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    function notify(message, type = 'info', timeout = 2800) {
        ensureStyles();
        let stack = document.querySelector('.app-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'app-toast-stack';
            document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        toast.className = `app-toast ${type}`;
        toast.textContent = message;
        stack.appendChild(toast);
        setTimeout(() => toast.remove(), timeout);
    }

    return { notify };
})();

window.AppUI = AppUI;
