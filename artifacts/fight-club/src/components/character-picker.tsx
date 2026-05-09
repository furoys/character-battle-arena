import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { useListCharacters } from "@workspace/api-client-react";
import type { Character } from "@workspace/api-client-react";
import { X, Search, Check } from "lucide-react";
import { getAvatarCharacterId } from "./character-avatar";

interface CharacterPickerProps {
  open: boolean;
  onClose: () => void;
}

export function CharacterPicker({ open, onClose }: CharacterPickerProps) {
  const { user } = useUser();
  const { data: characters, isLoading } = useListCharacters();
  const [query, setQuery] = useState("");
  const [universe, setUniverse] = useState<string>("All");
  const [saving, setSaving] = useState(false);
  const currentId = getAvatarCharacterId(user);

  useEffect(() => {
    if (open) {
      setQuery("");
      setUniverse("All");
    }
  }, [open]);

  const universes = useMemo(() => {
    if (!characters) return ["All"];
    const set = new Set<string>();
    for (const c of characters) {
      if (c.universe) set.add(c.universe);
    }
    return ["All", ...Array.from(set).sort()];
  }, [characters]);

  const filtered = useMemo(() => {
    if (!characters) return [];
    const q = query.trim().toLowerCase();
    return characters.filter((c) => {
      if (universe !== "All" && c.universe !== universe) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.universe ?? "").toLowerCase().includes(q)
      );
    });
  }, [characters, query, universe]);

  const handlePick = async (c: Character) => {
    if (!user || saving) return;
    try {
      setSaving(true);
      await user.update({ unsafeMetadata: { ...user.unsafeMetadata, avatarCharacterId: c.id } });
      onClose();
    } catch (err) {
      console.error("Failed to save avatar character", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-background border-2 border-primary/40 sm:rounded-lg overflow-hidden"
        style={{
          boxShadow: "0 0 60px rgba(255,0,85,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-primary/20 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg uppercase tracking-widest text-primary">
              Choose Your Fighter
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Pick a character as your profile avatar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search characters..."
              className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              autoFocus
            />
          </div>
          {/* Universe filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {universes.slice(0, 30).map((u) => (
              <button
                key={u}
                onClick={() => setUniverse(u)}
                className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-full transition-colors ${
                  universe === u
                    ? "bg-primary/20 border-primary/60 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/30"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="font-display text-lg uppercase animate-pulse text-muted-foreground">
                Loading roster...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No characters match your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.slice(0, 200).map((c) => {
                const isCurrent = c.id === currentId;
                const initials = c.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={c.id}
                    onClick={() => handlePick(c)}
                    disabled={saving}
                    className={`relative aspect-[3/4] flex flex-col items-stretch overflow-hidden border-2 transition-all hover:scale-[1.03] disabled:opacity-50 ${
                      isCurrent
                        ? "border-primary"
                        : "border-white/10 hover:border-primary/50"
                    }`}
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      boxShadow: isCurrent ? "0 0 20px rgba(255,0,85,0.4)" : undefined,
                    }}
                  >
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center font-display text-3xl text-primary/40">
                        {initials}
                      </div>
                    )}
                    {/* Bottom name gradient */}
                    <div
                      className="absolute bottom-0 left-0 right-0 px-1.5 py-1.5"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)",
                      }}
                    >
                      <p className="text-[10px] font-bold leading-tight text-white truncate">
                        {c.name}
                      </p>
                      {c.universe && (
                        <p className="text-[8px] uppercase tracking-wider text-muted-foreground/80 truncate">
                          {c.universe}
                        </p>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
              {filtered.length > 200 && (
                <div className="col-span-full text-center text-[10px] text-muted-foreground/60 mt-2">
                  Showing first 200 of {filtered.length} — refine your search to see more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
