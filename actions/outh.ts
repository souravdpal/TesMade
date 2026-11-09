'use server'
import { formRegData } from "@/interface/outh_interfaces";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import Otp from "@/lib/db/models/Otp";
import argon2 from "argon2";
import crypto from "crypto";
import { Types } from "mongoose";
import { transporter } from "@/lib/mail";
import { createRefToken, createSession_token } from "@/lib/cookies/cookies";
import { getClientIp } from "@/lib/client_ip";

const MAX_ATTEMPTS = 5
const LOCK_MS = 24 * 60 * 60 * 1000
const EXPIRY_MS = 5 * 60 * 1000

// Runs after a successful OTP check.
// Not exported: 'use server' files may only export async functions.
async function vemail(userId: Types.ObjectId) {
  await User.updateOne({ _id: userId }, { $set: { emailVerified: true } })
  return { ok: true, status: 200 }
}

const handlers = { vemail } as const
type Purpose = keyof typeof handlers

function isPurpose(value: string): value is Purpose {
  return Object.hasOwn(handlers, value)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function otpEmailHtml(code: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="padding: 36px 40px 20px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <span style="font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">
                Test<span style="color: #4f46e5;">Cart</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #111827;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 22px; color: #6b7280;">
                Use the verification code below to complete your sign in. This code is valid for <strong style="color: #111827;">5 minutes</strong>.
              </p>
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px 24px; display: inline-block; margin-bottom: 28px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 10px; color: #4f46e5; margin-left: 10px;">
                  ${code}
                </span>
              </div>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 18px;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} TestCart Inc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function registerUser(formData: formRegData) {
  if (!formData) {
    return { ok: false, status: 400, error: "Invalid data" }
  }
  try {
    await connectDB()
    const { name, password } = formData
    const email = normalizeEmail(formData.email)

    if (await User.findOne({ email })) {
      return { ok: false, status: 409, error: "Email already in use" }
    }

    const key = await argon2.hash(password, { type: argon2.argon2id })
    const userid = crypto.randomUUID() // public identifier, separate from _id

    await User.create({ userid, name, email, key, emailVerified: false })
    return { ok: true, status: 201 }
  } catch (e) {
    console.error("registerUser error:", e)
    return { ok: false, status: 500, error: "Registration failed" }
  }
}

export async function sendOtp(email: string, purpose: string) {
  if (!isPurpose(purpose)) {
    return { ok: false, status: 400, message: "Invalid request" }
  }
  try {
    await connectDB()
    const user = await User.findOne({ email: normalizeEmail(email) }, { _id: 1 })
    if (!user) {
      return { ok: false, status: 404, message: "User not found" }
    }

    const old = await Otp.findOne({ userid: user._id, purpose })
    if (old?.lockedUntil) {
      if (old.lockedUntil > new Date()) {
        return { ok: false, status: 429, message: "Max attempts reached. Try again later." }
      }
      await Otp.deleteOne({ _id: old._id })
    }

    const code = crypto.randomInt(1000, 10000).toString()

    // attempt is only set on insert, so resending a code does not reset the counter
    await Otp.findOneAndUpdate(
      { userid: user._id, purpose },
      {
        $set: { otp: code, createdAt: new Date() },
        $setOnInsert: { attempt: 0 },
      },
      { upsert: true, returnDocument: "after" }
    )

    await transporter.sendMail({
      from: `"TestCart" <${process.env.EMAIL_USER}>`,
      to: normalizeEmail(email),
      subject: `${code} is your TestCart verification code`,
      html: otpEmailHtml(code),
    })

    return { ok: true, status: 200 }
  } catch (e) {
    console.error("sendOtp error:", e)
    return { ok: false, status: 500, message: "Could not send code" }
  }
}

export async function verifyOtp(email: string, code: string, purpose: string) {
  if (!isPurpose(purpose)) {
    return { ok: false, status: 400, err: "Invalid request" }
  }
  try {
    await connectDB()
    const user = await User.findOne({ email: normalizeEmail(email) }, { _id: 1 })
    if (!user) {
      return { ok: false, status: 400, err: "Invalid or expired code" }
    }

    const record = await Otp.findOne({ userid: user._id, purpose })
    if (!record) {
      return { ok: false, status: 400, err: "Invalid or expired code" }
    }

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return { ok: false, status: 429, err: "Too many attempts. Try again later." }
    }

    // Expired: reject but keep the record so attempt count is not reset
    if (Date.now() - record.createdAt.getTime() > EXPIRY_MS) {
      return { ok: false, status: 400, err: "OTP has expired" }
    }

    if (record.otp !== code) {
      const updated = await Otp.findOneAndUpdate(
        { _id: record._id },
        { $inc: { attempt: 1 } },
        { returnDocument: "after" }
      )
      if (updated && updated.attempt >= MAX_ATTEMPTS) {
        await Otp.updateOne(
          { _id: record._id },
          { $set: { lockedUntil: new Date(Date.now() + LOCK_MS) } }
        )
        return { ok: false, status: 429, err: "Too many attempts. Try again later." }
      }
      return { ok: false, status: 400, err: "Invalid code" }
    }

    // Deleting is the gate: only one concurrent request can win it
    const del = await Otp.deleteOne({ _id: record._id })
    if (del.deletedCount !== 1) {
      return { ok: false, status: 400, err: "Invalid or expired code" }
    }

    const result = await handlers[purpose](user._id)
    if (!result.ok) return result

    // Email verified: start a real session so the proxy lets the user into /
    const ip = await getClientIp()
    const refRes = await createRefToken(ip, user._id)
    if (!refRes.ok || !refRes.refToken) {
      return { ok: false, status: 500, err: "could not start session" }
    }

    const sessionRes = await createSession_token(refRes.refToken)
    if (!sessionRes.ok) {
      return { ok: false, status: 500, err: "could not start session" }
    }

    return { ok: true, status: 200 }
  } catch (e) {
    console.error("verifyOtp error:", e)
    return { ok: false, status: 500, err: "Server verification error" }
  }
}

export async function login(email: string, password: string) {
  try {
    await connectDB()

    const user = await User.findOne({ email: normalizeEmail(email) }, { key: 1, _id: 1, emailVerified: 1 })
    const valid = user ? await argon2.verify(user.key, password) : false

    // Same response for unknown email and wrong password
    if (!user || !valid) {
      return { ok: false, status: 401, err: "invalid email or password" }
    }

    if (!user.emailVerified) {
      return { ok: false, status: 403, err: "email not verified" }
    }

    // TODO: add rate limiting per account and per IP here

    const ip = await getClientIp()
    const refRes = await createRefToken(ip, user._id)
    if (!refRes.ok || !refRes.refToken) {
      return { ok: false, status: 500, err: "could not create session" }
    }

    const sessionRes = await createSession_token(refRes.refToken)
    if (!sessionRes.ok) {
      return { ok: false, status: 500, err: "could not create session" }
    }

    return { ok: true, status: 200 }
  } catch (e) {
    console.error("login error:", e)
    return { ok: false, status: 500, err: "internal server error" }
  }
}