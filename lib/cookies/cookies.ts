import { v4 as uuidv4 } from "uuid"
import cookiesdb from "../db/models/cookiesdb"
import { connectDB } from "@/lib/config/mongodb"
import { cookies } from "next/headers"
import { Types } from "mongoose"

const day = 60 * 60 * 24



export async function createSession_token(refToken: string) {
    const session_token = uuidv4()
    const sdays = day * 7
    const sessionExpThread = Date.now() + 1000 * sdays
    try {
        if (!refToken) {
            return {
                ok: false,
                status: 401
            }
        }
        await connectDB()
        const ref_exp = await cookiesdb.findOne({ refid: refToken }, { refexp: 1 })
        const ref_valid = ref_exp ? ref_exp.refexp > Date.now() : false
        if (!ref_valid) {
            if (ref_exp) {
                await cookiesdb.deleteOne({ refid: refToken })

            }
            return {
                ok: false,
                status: 401
            }
        }
        const k = await cookiesdb.findOneAndUpdate(
            {
                refid: refToken, refexp: { $gt: Date.now() }
            },
            {
                sessionid: session_token,
                sessionexp: sessionExpThread,

            }
        )
        if (!k) {
            return { ok: false, status: 401 }
        }
        const jar = await cookies()
        jar.set(
            '__sessionToken', session_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: sdays
        }
        )
        return {
            ok: true,
            status: 201,
            token: session_token
        }

    } catch (e) {
        return {
            ok: false,
            status: 501
        }
    }






}


export async function createRefToken(ip: String, userId: Types.ObjectId) {
    const refToken = uuidv4()
    const refExp = Date.now() + 1000 * day * 30
    try {
        await connectDB()
        const jar = await cookies()

        await cookiesdb.create({
            refid: refToken,
            userid: userId,
            refexp: refExp,
            ip : ip

        })

        jar.set("__refToken", refToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: '/',
            sameSite: "lax",
            maxAge: day * 30

        })

        return {
            ok: true,
            status: 201,
            refToken,
        }

    } catch (e) {
        return {
            ok: false,
            status: 501
        }

    }


}


export async function validate_session() {
    try {
        await connectDB()

        const jar = await cookies()
        const userSession = jar.get("__sessionToken")?.value
        const refToken = jar.get("__refToken")?.value

        if (!userSession) {
            if (!refToken) {
                return {
                    ok: false,
                    status: 401
                }
            }
            const creation_res = await createSession_token(refToken)
            if (creation_res.ok) {
                return {
                    ok: true,
                    status: 201,
                    id: (await cookiesdb.findOne({ sessionid: creation_res.token }, { userid: 1 }))?.userid
                }
            }
            return {
                ok: false,
                status: 401
            }


        }
        const session_Data = await cookiesdb.findOne({ sessionid: userSession }, { sessionexp: 1, refexp: 1, userid: 1 })
        if (
            !session_Data ||
            session_Data.sessionexp < Date.now() ||
            session_Data.refexp < Date.now()
        ) {
            return { ok: false, status: 401 }
        }

        return {
            ok: true,
            status: 200,
            id: session_Data.userid
        }




    } catch (e) {
        return {
            ok: false,
            status: 501
        }

    }
}