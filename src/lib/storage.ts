export const LS_PREFIX = "babygpt_";

export function lsKey(name: string): string {
  return `${LS_PREFIX}${name}`;
}
