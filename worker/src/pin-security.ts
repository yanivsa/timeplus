import { Env } from './types';
import { generateSalt, hashPin, verifyPin } from './crypto';

export function requireActivePepper(env: Env): string {
  if (!env.PEPPER_SECRET) {
    throw new Error('PEPPER_SECRET is not configured');
  }
  return env.PEPPER_SECRET;
}

export async function verifyPinWithPepperMigration(
  pin: string,
  storedHash: string,
  storedSalt: string,
  env: Env
): Promise<{ valid: boolean; migrated: boolean; hash?: string; salt?: string }> {
  const activePepper = requireActivePepper(env);

  if (await verifyPin(pin, storedHash, storedSalt, activePepper)) {
    return { valid: true, migrated: false };
  }

  const legacyPepper = env.LEGACY_PEPPER_SECRET;
  if (!legacyPepper || legacyPepper === activePepper) {
    return { valid: false, migrated: false };
  }

  const legacyValid = await verifyPin(pin, storedHash, storedSalt, legacyPepper);
  if (!legacyValid) {
    return { valid: false, migrated: false };
  }

  const salt = generateSalt(16);
  const hash = await hashPin(pin, salt, activePepper);
  return { valid: true, migrated: true, hash, salt };
}
