import { config, isAiConfigured } from "./config.js";

export class AiUnavailableError extends Error {
  constructor(message: string, public reason: "not_configured" | "provider_error" = "provider_error") {
    super(message);
  }
}

export interface TriageResult {
  title: string;
  summary: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  clarifyingQuestions: string[];
  language: string;
}

const CATEGORY_IDS = [
  "roads",
  "waste",
  "water",
  "drainage",
  "electricity",
  "infrastructure",
  "environment",
  "health",
  "safety",
  "gov_services",
  "corruption",
  "education",
  "other",
];

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
};

/**
 * Real provider call through an OpenAI-compatible chat-completions endpoint.
 * No key means no AI: callers receive a 503 and the UI shows a rule-based fallback.
 */
export async function triageComplaint(input: {
  text: string;
  language?: string;
  city?: string;
}): Promise<TriageResult> {
  if (!isAiConfigured()) {
    throw new AiUnavailableError(
      "AI is not configured. Set AI_API_KEY (and optionally AI_BASE_URL, AI_MODEL) on the server.",
      "not_configured"
    );
  }

  const language = input.language && LANGUAGE_NAMES[input.language] ? input.language : "en";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.ai.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You help a municipal civic-issue platform structure a citizen report.",
              "Return ONLY a JSON object with keys: title (max 80 chars), summary (2 sentences),",
              `category (one of: ${CATEGORY_IDS.join(", ")}),`,
              "severity (low|medium|high|critical), clarifyingQuestions (array of at most 2 strings), language (en|hi|te).",
              `Write title, summary and questions in ${LANGUAGE_NAMES[language]}. Never invent facts, addresses or evidence.`,
              "Do not ask for the citizen's name, phone or email: reports are privacy-protected.",
            ].join(" "),
          },
          {
            role: "user",
            content: `City: ${input.city ?? "unknown"}\nCitizen report:\n${input.text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `AI provider returned ${response.status}. ${detail.slice(0, 200)}`,
        "provider_error"
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Partial<TriageResult>;

    return {
      title: String(parsed.title ?? "").slice(0, 90) || input.text.slice(0, 80),
      summary: String(parsed.summary ?? "").slice(0, 500),
      category: CATEGORY_IDS.includes(String(parsed.category)) ? String(parsed.category) : "other",
      severity: ["low", "medium", "high", "critical"].includes(String(parsed.severity))
        ? (parsed.severity as TriageResult["severity"])
        : "medium",
      clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions)
        ? parsed.clarifyingQuestions.slice(0, 2).map(String)
        : [],
      language,
    };
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiUnavailableError("AI provider timed out.", "provider_error");
    }
    throw new AiUnavailableError(
      error instanceof Error ? error.message : "AI request failed.",
      "provider_error"
    );
  } finally {
    clearTimeout(timeout);
  }
}
