
export function If(props: { children: React.ReactNode, condition: any }) {
    if(props.condition) return props.children;
    return null;
}