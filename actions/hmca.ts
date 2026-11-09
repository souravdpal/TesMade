import crypto from 'crypto';

const SECRET_KEY = process.env.sc ?? "062508333879787d733762a8a0c28b74caa7bb869e3374aa38110d76eae90e5e";

export async function hashHmca(data: string): Promise<string> {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
}

export async function matchHmca(data: string, hash: string): Promise<boolean> {
  const newHash = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');

  // Convert both to buffers to safely compare them and prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex');
  const newHashBuffer = Buffer.from(newHash, 'hex');

  // Buffers must be the same length for timingSafeEqual to avoid throwing an error
  if (hashBuffer.length !== newHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, newHashBuffer);
}