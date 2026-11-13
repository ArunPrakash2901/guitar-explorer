// Use the formula spelling already assigned by Music Core, including extensions.
export function degreeLabel({ degree, alteration }) {
  const accidental = alteration < 0 ? "♭".repeat(-alteration) : "♯".repeat(alteration);
  return accidental + degree;
}
