const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const NUMS  = '23456789';
const SYMS  = '!@#$%&*';

export function generatePassword(length = 16): string {
  const sets = [UPPER, LOWER, NUMS, SYMS];
  const all  = sets.join('');
  const required = sets.map(s => s[Math.floor(Math.random() * s.length)]);
  const rest = Array.from(
    { length: length - required.length },
    () => all[Math.floor(Math.random() * all.length)]
  );
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}
