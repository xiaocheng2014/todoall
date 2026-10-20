export function canDeletePlan(status: string): boolean {
  return status === "ENDED";
}

export function canDeleteGoal(status: string): boolean {
  return status === "COMPLETED" || status === "ABANDONED";
}
