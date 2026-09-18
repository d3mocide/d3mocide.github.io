import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        manifest?: string;
      };
    }
  }
}

declare module 'esp-web-tools/dist/web/install-button.js';

export {};
