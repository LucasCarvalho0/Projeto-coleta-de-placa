declare module '@yudiel/react-qr-scanner' {
  import * as React from 'react';
  export interface QrScannerProps {
    onDecode?: (result: string) => void;
    onError?: (error: any) => void;
    constraints?: MediaStreamConstraints;
    width?: number;
  }
  export const QrScanner: React.FC<QrScannerProps>;
}
