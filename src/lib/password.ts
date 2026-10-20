import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "密码至少需要 8 个字符";
  }

  if (password.length > 128) {
    return "密码不能超过 128 个字符";
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(
    password,
    salt,
    KEY_LENGTH,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
  );

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] =
    storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const expectedHash = Buffer.from(hashValue, "base64url");
  const actualHash = await deriveKey(
    password,
    Buffer.from(saltValue, "base64url"),
    expectedHash.length,
    Number(cost),
    Number(blockSize),
    Number(parallelization),
  );

  return (
    actualHash.length === expectedHash.length &&
    timingSafeEqual(actualHash, expectedHash)
  );
}
