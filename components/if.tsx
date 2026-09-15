export function If(props: { children: React.ReactNode; condition: unknown }) {
  if (props.condition) return props.children;
  return null;
}
