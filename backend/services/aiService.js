import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ESCALATE_MARKER = "[ESCALATE]";

export async function getAIReply(businessName, history) {
  const systemPrompt = `You are a friendly, concise support assistant for "${businessName}".
Answer the customer's question helpfully and briefly if you genuinely can.
Never invent specific facts about the business (like policies, prices, order details, hours, or what the business does) that you don't actually have.
If you cannot truthfully answer, your ENTIRE reply must be ONLY this, with nothing before it:
${ESCALATE_MARKER} followed by one short, polite sentence connecting the customer to a team member.
Do not add any explanation, apology, or extra text before the marker.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.sender === "customer" ? "user" : "assistant",
      content: m.text,
    })),
  ];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.4,
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "";

  const markerIndex = raw.indexOf(ESCALATE_MARKER);

  if (markerIndex !== -1) {
    const afterMarker = raw.slice(markerIndex + ESCALATE_MARKER.length).trim();
    return {
      escalate: true,
      text: afterMarker || "Let me connect you with a team member who can help with that.",
    };
  }

  return { escalate: false, text: raw };
}