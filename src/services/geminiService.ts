// ═══════════════════════════════════════════════
// Claude Haiku AI Service (reemplaza Gemini)
// ═══════════════════════════════════════════════

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

export async function processUniversalDocument(
  base64Content: string,
  mimeType: string
): Promise<{ expenses?: any[]; summary?: string }> {

  try {
    const isPDF = mimeType === 'application/pdf';

    const contentBlock: any = isPDF
      ? {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Content,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: base64Content,
          },
        };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANTHROPIC_API_KEY ? { 'x-api-key': ANTHROPIC_API_KEY } : {}),
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `Eres un experto en análisis de extractos bancarios españoles.
Extrae TODAS las transacciones y devuelve SOLO JSON válido sin markdown:
{
  "expenses": [{"vendor":"nombre","amount":12.50,"date":"YYYY-MM-DD","category":"Alimentación|Transporte|Vivienda|Ocio|Salud|Suscripciones|Nómina|Transferencia|Otros","description":"detalle"}],
  "summary": "X transacciones, gastos €XX, ingresos €XX"
}
Los gastos tienen amount POSITIVO. Los ingresos/abonos tienen amount NEGATIVO.`,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: 'Extrae todas las transacciones de este extracto bancario y devuelve el JSON.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    const text = data.content?.map((b: any) => b.text || '').join('') || '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { expenses: parsed.expenses || [], summary: parsed.summary || '' };

  } catch (error) {
    console.error('[FILEHUB] Claude Haiku error:', error);
    return { expenses: [], summary: `Error: ${error}` };
  }
}
