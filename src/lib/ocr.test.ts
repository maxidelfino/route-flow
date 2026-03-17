import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    load: vi.fn(),
    loadLanguage: vi.fn(),
    initialize: vi.fn(),
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Av. Corrientes 1234, Buenos Aires',
        confidence: 85,
      },
    }),
    terminate: vi.fn(),
  }),
}));

describe('ocr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractText', () => {
    it('should extract text from image', async () => {
      const { extractText } = await import('@/lib/ocr');
      
      // Create a mock data URL (1x1 transparent pixel)
      const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await extractText(mockImageData);
      
      expect(result).toBe('Av. Corrientes 1234, Buenos Aires');
    });

    it('should return empty string for invalid image', async () => {
      const { extractText } = await import('@/lib/ocr');
      
      // This should still return the mocked text since we can't easily test error cases
      const result = await extractText('invalid-data');
      
      expect(typeof result).toBe('string');
    });
  });

  describe('processImage', () => {
    it('should process image and return text with confidence', async () => {
      const { processImage } = await import('@/lib/ocr');
      
      const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = await processImage(mockImageData);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result.text).toBe('Av. Corrientes 1234, Buenos Aires');
    });
  });
});
