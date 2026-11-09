import User from "@/lib/db/models/User"

export async function vemail(userId: any) {
  await User.updateOne({ _id: userId }, { $set: { isVerified: true } })
  return { ok: true, status: 200 }
}