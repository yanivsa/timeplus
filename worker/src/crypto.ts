export function generateId(): string {
  return crypto.randomUUID();
}

export function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(
  pin: string,
  saltHex: string,
  pepperSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(pin + pepperSecret);
  const salt = encoder.encode(saltHex);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return Array.from(derivedBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPin(
  pin: string,
  storedHashHex: string,
  saltHex: string,
  pepperSecret = 'timeplus_secure_pepper_seed'
): Promise<boolean> {
  const calculatedHashHex = await hashPin(pin, saltHex, pepperSecret);
  if (calculatedHashHex.length !== storedHashHex.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < calculatedHashHex.length; i++) {
    diff |= calculatedHashHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
  }
  return diff === 0;
}
