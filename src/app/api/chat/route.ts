import { NextResponse } from "next/server";

import { getSystemPrompt } from "@/lib/prompts";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log(`🚀 ~ POST ~ messages:`, messages);

    if (!messages) {
      return NextResponse.json(
        { error: "Messages field are required." },
        { status: 400 }
      );
    }

    const client = await new OpenAI({
      baseURL: "https://api.studio.nebius.com/v1/",
      apiKey: process.env.NEXT_PUBLIC_NEBIUS_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct",
      // model: "mistralai/Mistral-Nemo-Instruct-2407",
      max_tokens: 10000,
      temperature: 0.6,
      top_p: 0.9,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(),
        },
        {
          role: "user",
          content: messages,
        },
      ],
    });
    console.log(`🚀 ~ POST ~ response:`, response.choices);

    return NextResponse.json({
      response: response.choices[0]?.message,
    });
  } catch (error) {
    console.error("Error in chat assistant:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
