import { useEffect, useState } from "react";

export function UserAvatar({ name, avatarUrl, className = "h-9 w-9 text-sm" }: { name: string; avatarUrl?: string | null; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedAvatarUrl = avatarUrl?.trim();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  useEffect(() => {
    setImageFailed(false);
  }, [normalizedAvatarUrl]);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-white ${className}`}>
      {normalizedAvatarUrl && !imageFailed ? (
        <img src={normalizedAvatarUrl} alt={name ? `${name} avatar` : "Profile avatar"} className="h-full w-full rounded-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        initials
      )}
    </span>
  );
}
