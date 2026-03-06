import type { Express } from "express";
import { type Server } from "http";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { generateFindings } from "./gemini";

// ─── Input validation schema ───
const lesionSchema = z.object({
  id: z.string(),
  severity: z.enum(["superficial", "deep"]),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  location: z.string().optional(),
  observacoes: z.string().optional(),
});

const generateFindingsSchema = z.object({
  lesions: z.array(lesionSchema).min(1, "Pelo menos uma lesão é obrigatória").max(50),
});

// ─── Rate limiting (relaxed in development) ───
const isDev = process.env.NODE_ENV === "development";

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 1000 : 10, // 1000/min in dev, 10/min in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em um minuto." },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api/", apiLimiter);

  app.post("/api/generate-findings", async (req, res) => {
    try {
      // Validate input
      const parsed = generateFindingsSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((i) => i.message).join("; ");
        return res.status(400).json({ error: `Dados inválidos: ${errors}` });
      }

      const findings = await generateFindings(parsed.data.lesions);
      res.json({ findings });
    } catch (error) {
      console.error("Error generating findings:", error);
      res.status(500).json({ error: "Erro ao gerar achados com IA" });
    }
  });

  return httpServer;
}
