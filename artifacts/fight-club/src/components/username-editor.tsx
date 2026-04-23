import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { X, Check, AtSign } from "lucide-react";

interface UsernameEditorProps {
  open: boolean;
  onClose: () => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function UsernameEditor({ open, onClose }: UsernameEditorProps) {
  const { user } = useUser();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(user?.username ?? "");
      setError(null);
    }
  }, [open, user?.username]);

  const localValid = USERNAME_RE.test(value);

  const submit = async () => {
    if (!user || saving) return;
    if (!localValid) {
      setError("3–20 letters, numbers, or underscores only");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await user.update({ username: value });
      onClose();
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string; longMessage?: string; code?: string }> };
      const first = e?.errors?.[0];
      if (first?.code === "form_identifier_exists") {
        setError("That username is already taken — try another");
      } else {
        setError(first?.longMessage ?? first?.message ?? "Couldn't save — try again");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md bg-background border-2 border-primary/40 sm:rounded-lg overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(255,0,85,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-primary/20 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg uppercase tracking-widest text-primary">
              Choose Your Tag
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Your unique fighter name
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

        <div className="px-4 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""));
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="ironfist_92"
                maxLength={20}
                className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
              3–20 letters, numbers, or underscores. Must be unique.
            </p>
            {error && (
              <p className="text-[11px] text-red-400 mt-2 font-bold">{error}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!localValid || saving}
              className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save tag
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
