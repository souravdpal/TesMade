import User from "@/lib/db/models/User";
import type { Types } from "mongoose";

export async function vemail(userId: Types.ObjectId) {
  const res = await User.updateOne({ _id: userId }, { $set: { emailVerified: true } });
  if (res.matchedCount !== 1) return { ok: false, status: 404, err: "User not found" };
  return { ok: true, status: 200 };
}