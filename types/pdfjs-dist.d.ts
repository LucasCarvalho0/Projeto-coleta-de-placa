declare module 'pdfjs-dist/legacy/build/pdf' {
  interface PDFDocumentProxy {
    readonly numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<PDFPageTextContent>;
  }

  interface PDFPageTextContent {
    items: Array<{ str: string }>; // simplified
  }

  interface PDFDataRangeTransport {
    // placeholder, not used
  }

  interface PDFSource {
    data?: Uint8Array | ArrayBuffer;
    url?: string;
    range?: PDFDataRangeTransport;
    length?: number;
    httpHeaders?: Record<string, string>;
  }

  type PDFDocumentInitParameters = PDFSource & {
    // additional optional params can be added here
  };

  function getDocument(src: PDFDocumentInitParameters | Uint8Array | ArrayBuffer | string): {
    promise: Promise<PDFDocumentProxy>;
    // other properties omitted for brevity
  };

  export { getDocument };
}
