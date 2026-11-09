import mongoose, { Schema } from "mongoose"

const otpSchema = new Schema({
  userid:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  purpose:     { type: String, required: true },
  otp:         { type: String, required: true },
  createdAt:   { type: Date, default: Date.now },   // NO expires / TTL here
  attempt:     { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
})

otpSchema.index({ userid: 1, purpose: 1 }, { unique: true })

export default mongoose.models.Otp || mongoose.model("Otp", otpSchema)