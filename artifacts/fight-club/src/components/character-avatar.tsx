import { useUser } from "@clerk/react";
import { useListCharacters } from "@workspace/api-client-react";
import type { Character } from "@workspace/api-client-react";

export function getAvatarCharacterId(user: ReturnType<typeof useUser>["user"]): number | null {
  const meta = user?.unsafeMetadata as { avatarCharacterId?: number } | undefined;
  const id = meta?.avatarCharacterId;
  return typeof id === "number" ? id : null;
}

export function useAvatarCharacter(): Character | null {
  const { user } = useUser();
  const { data: characters } = useListCharacters();
  const id = getAvatarCharacterId(user);
  if (!id || !characters) return null;
  return characters.find((c) => c.id === id) ?? null;
}

interface CharacterAvatarProps {
  size?: number;
  fallbackInitial?: string;
  className?: string;
  onClick?: () => void;
  showHover?: boolean;
}

export function CharacterAvatar({
  size = 32,
  fallbackInitial = "?",
  className = "",
  onClick,
  showHover = false,
}: CharacterAvatarProps) {
  const character = useAvatarCharacter();
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`relative rounded-full flex items-center justify-center font-display flex-shrink-0 overflow-hidden group transition-all ${onClick ? "hover:scale-105 cursor-pointer" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        background: "rgba(255,0,85,0.15)",
        border: `${Math.max(1, size / 22)}px solid rgba(255,0,85,0.5)`,
        color: "#ff0055",
        fontSize: size * 0.45,
      }}
      title={character?.name ?? "Pick your fighter"}
    >
      {character?.imageUrl ? (
        <img
          src={character.imageUrl}
          alt={character.name}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <span>{fallbackInitial}</span>
      )}
      {showHover && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold uppercase tracking-widest">
          Edit
        </span>
      )}
    </Wrapper>
  );
}
