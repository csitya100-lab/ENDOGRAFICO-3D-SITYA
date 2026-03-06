import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy-key",
      baseURL: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    });
  }
  return _openai;
}

export async function generateFindings(lesions: Array<{
  id: string;
  severity: string;
  position: { x: number; y: number; z: number };
  location?: string;
  observacoes?: string;
}>) {
  const superficialCount = lesions.filter(l => l.severity === 'superficial').length;
  const deepCount = lesions.filter(l => l.severity === 'deep').length;

  const lesionDescriptions = lesions.map((l, i) =>
    `- Lesão ${i + 1}: ${l.location || 'localização não especificada'} (${l.severity === 'superficial' ? 'superficial' : 'profunda'})`
  ).join('\n');

  const prompt = `Você é um médico especialista em endometriose. Com base nos achados do mapeamento cirúrgico abaixo, gere um texto descritivo médico profissional em português brasileiro para a seção "Achados" de um relatório cirúrgico.

Dados do mapeamento:
- Total de lesões: ${lesions.length}
- Lesões superficiais: ${superficialCount}
- Lesões profundas (infiltrativas): ${deepCount}

Lesões identificadas:
${lesionDescriptions}

Gere um parágrafo descritivo médico conciso (3-5 frases) descrevendo os achados, mencionando localização, severidade e padrão de distribuição das lesões. Use terminologia médica adequada. Não inclua recomendações de tratamento, apenas descreva os achados.`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8192,
  });

  return response.choices[0]?.message?.content || "Não foi possível gerar os achados.";
}
