import { NextResponse } from "next/server";
import { EnhancePayload } from "@/app/(main)/test/new/components/Api";
import { askGroqWithSystem } from "@/lib/ai/groqRespone";
import next from "next";



export async function POST(request: NextResponse) {
  try {
    const body = await request.json();
    const { text, field, context }: EnhancePayload = body;
    const sysemP:string = `you are advance text completion and enhacing system you have you ehance use text and ehnace user text as better prompt or better language and spellings , context : ${context} , field : ${field}`
    const res = await askGroqWithSystem(sysemP, text)
    if (!res.success) {
      return NextResponse.json({
        ok: false,
        text : "Server Error"
      })
    }
    return NextResponse.json({
      ok: true,
      text: res.text
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
    })
  }
}
