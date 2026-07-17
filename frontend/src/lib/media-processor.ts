import { groq } from "@/lib/groq-client";

/**
 * Transcribes audio using Groq's Whisper model.
 * @param arrayBuffer The binary audio data
 * @param filename The filename (e.g., 'audio.ogg')
 */
export async function transcribeAudio(arrayBuffer: ArrayBuffer, filename: string): Promise<string> {
  try {
    // We can pass a File object to the Groq SDK
    const blob = new Blob([arrayBuffer]);
    const file = new File([blob], filename, { type: 'audio/ogg' });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      prompt: "The audio might contain Hindi, English, or mixed languages discussing scams, fraud, money, threats, or cybercrime.",
      response_format: "json",
      temperature: 0.0,
    });
    
    return transcription.text || "";
  } catch (err: any) {
    console.error("[media-processor] Audio transcription failed:", err.message);
    throw new Error("Failed to transcribe audio.");
  }
}

/**
 * Extracts text and context from an image using Groq's Vision model.
 * @param imageUrl URL to the image (e.g. from Telegram getFileLink)
 */
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  throw new Error("extractTextFromImage is no longer implemented using URL fetch, please use processImageWithGroq");
}

export async function processImageWithGroq(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all visible text from this image exactly as written. If this is a screenshot of a chat, SMS, or notification, capture the conversation and context. If it's a payment screenshot, capture amounts and IDs. Output ONLY the extracted text and relevant context, nothing else.",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (err: any) {
    console.error("[media-processor] Image extraction failed:", err.message);
    throw new Error("Failed to process image.");
  }
}
