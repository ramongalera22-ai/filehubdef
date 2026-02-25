// ═══════════════════════════════════════════════
// Gemini AI Service
// ═══════════════════════════════════════════════

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

export async function processUniversalDocument(
  base64Content: string,
  mimeType: string
): Promise<{ expenses?: any[]; summary?: string }> {
  if (!GEMINI_API_KEY) {
    console.warn('[FILEHUB] Gemini API key not configured. AI features disabled.');
    return { expenses: [], summary: 'AI not configured' };
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Content,
              },
            },
            {
              text: `Analiza este documento y extrae transacciones financieras.
Devuelve un JSON con este formato:
{
  "expenses": [{ "vendor": "...", "amount": 0.00, "date": "YYYY-MM-DD", "category": "...", "description": "..." }],
  "summary": "Resumen breve del documento"
}
Solo devuelve JSON válido, sin markdown ni texto adicional.`,
            },
          ],
        },
      ],
    });

    const text = response.text || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[FILEHUB] Gemini processing error:', error);
    return { expenses: [], summary: 'Error processing document' };
  }
}
