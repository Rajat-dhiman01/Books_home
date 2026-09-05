export function isUniqueViolation(err: any): boolean {
  return err?.code === "23505" || err?.cause?.code === "23505";
}

export function isExclusionViolation(err: any): boolean {
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}

export function isForeignKeyViolation(err: any): boolean {
  return err?.code === "23503" || err?.cause?.code === "23503";
}