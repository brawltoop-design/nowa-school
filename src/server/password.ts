type BcryptModule = {
  hash: (password: string, rounds: number) => Promise<string>;
  compare: (password: string, hash: string) => Promise<boolean>;
};

async function loadBcrypt(): Promise<BcryptModule> {
  try {
    const bcrypt = await import("bcrypt");
    return (("default" in bcrypt ? bcrypt.default : bcrypt) ??
      bcrypt) as BcryptModule;
  } catch {
    const bcryptjs = await import("bcryptjs");
    return (("default" in bcryptjs ? bcryptjs.default : bcryptjs) ??
      bcryptjs) as BcryptModule;
  }
}

export async function hashPassword(password: string) {
  const bcrypt = await loadBcrypt();
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  const bcrypt = await loadBcrypt();
  return bcrypt.compare(password, hash);
}
