// app/actions.ts
'use server';

import { groq } from '@/lib/config/groq';

export async function askGroqWithSystem(systemPrompt: string, userPrompt: string) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
    });

    return {
      success: true,
      text: chatCompletion.choices[0]?.message?.content || '',
    };
  } catch (error) {
    console.error('Groq error:', error);
    return { success: false, error: 'Failed to fetch response' };
  }
}