import { createWorker, Worker } from 'tesseract.js';

let cachedWorker: Worker | null = null;

/**
 * Get or create Tesseract worker (Spanish language)
 */
async function getWorker(): Promise<Worker> {
  if (cachedWorker) {
    return cachedWorker;
  }

  cachedWorker = await createWorker('spa', 1, { 
    logger: (m) => console.log('[OCR]', m.status, m.progress) 
  });

  return cachedWorker;
}

/**
 * Extract text from an image (base64, URL, or File)
 */
export async function extractText(imageSource: string | File | Blob): Promise<string> {
  const worker = await getWorker();
  
  const result = await worker.recognize(imageSource);
  
  return result.data.text;
}

export interface ProcessedImage {
  text: string;
  confidence: number;
}

/**
 * Process image and return text with confidence score
 */
export async function processImage(imageData: string): Promise<ProcessedImage> {
  const worker = await getWorker();
  
  const result = await worker.recognize(imageData);
  
  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

/**
 * Clean up worker resources
 */
export async function terminateWorker(): Promise<void> {
  if (cachedWorker) {
    await cachedWorker.terminate();
    cachedWorker = null;
  }
}

/**
 * Extract addresses from OCR text using heuristics
 * Looks for common address patterns in Argentina
 */
export function extractAddressesFromText(ocrText: string): string[] {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  const addresses: string[] = [];
  
  // Common patterns for Argentine addresses
  const addressPatterns = [
    // Street + number: "Av. Corrientes 1234" or "Calle San Martín 567"
    /(?:calle|av\.?|avenida|paseo|boulevard|dr\.|gral\.)\s+([^,\n]+)\s+(\d+)/i,
    // Just number at end: "Some Street 1234"
    /^([^,\n]+)\s+(\d{3,5})(?:,|\s|$)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of addressPatterns) {
      const match = line.match(pattern);
      if (match) {
        addresses.push(line);
        break;
      }
    }
  }
  
  // If no pattern matched, return first non-empty lines as potential addresses
  if (addresses.length === 0 && lines.length > 0) {
    return lines.slice(0, 5);
  }
  
  return addresses;
}
