import { NextResponse } from "next/server";

import { BASE_PROMPT } from "@/lib/prompts";
import { basePrompt as nodeBasePrompt } from "@/lib/defaults/node";
import { basePrompt as reactBasePrompt } from "@/lib/defaults/react";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const client = await new OpenAI({
      baseURL: "https://api.studio.nebius.com/v1/",
      apiKey: process.env.NEXT_PUBLIC_NEBIUS_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.chat.completions.create({
      model: "mistralai/Mistral-Nemo-Instruct-2407",
      messages: [
        {
          role: "system",
          content:
            "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra, No explanations.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 10,
    });

    console.log(`🚀 ~ POST ~ response meee:`, response.choices[0].message);
    const answer = response.choices[0]?.message?.content?.trim(); // 'react' or 'node'
    console.log(`🚀 ~ POST ~ answer:`, answer);

    if (answer?.toLowerCase() === "react") {
      return NextResponse.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      });
    }

    if (answer?.toLowerCase() === "node") {
      return NextResponse.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      });
    }

    return NextResponse.json(
      { error: "Invalid response from AI" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error in template detection:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
