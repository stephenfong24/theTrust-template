export function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials}</span>;
}
