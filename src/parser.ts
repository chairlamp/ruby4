export type MoveToken =
  | "U"
  | "D"
  | "L"
  | "R"
  | "F"
  | "B"
  | "U'"
  | "D'"
  | "L'"
  | "R'"
  | "F'"
  | "B'"
  | "U2"
  | "D2"
  | "L2"
  | "R2"
  | "F2"
  | "B2";

const VALID_TOKENS: MoveToken[] = [
  "U",
  "D",
  "L",
  "R",
  "F",
  "B",
  "U'",
  "D'",
  "L'",
  "R'",
  "F'",
  "B'",
  "U2",
  "D2",
  "L2",
  "R2",
  "F2",
  "B2",
];

export function isToken(value: string): value is MoveToken {
  return (VALID_TOKENS as readonly string[]).includes(value);
}

export function tokenize(input: string): MoveToken[] {
  if (!input.trim()) {
    return [];
  }

  const tokens = input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  tokens.forEach((token) => {
    if (!isToken(token)) {
      throw new Error(`Invalid move token: "${token}"`);
    }
  });

  return tokens as MoveToken[];
}
