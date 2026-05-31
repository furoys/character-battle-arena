import { useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface UniverseOption {
  name: string;
  count: number;
}

/**
 * Searchable universe filter. Replaces the old native <select> so users can
 * type to find one of the 100+ universes instead of scrolling a long menu.
 * `value` is "all" or a universe name.
 */
export function UniverseCombobox({
  value,
  onChange,
  options,
  totalCount,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: UniverseOption[];
  totalCount: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value === "all" ? "All universes" : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by universe"
          data-testid="button-universe-filter"
          className={cn(
            "flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-foreground transition-colors hover:border-white/30 focus:border-primary focus:outline-none",
            className,
          )}
        >
          <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 flex-shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search universes…" />
          <CommandList>
            <CommandEmpty>No universe found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All universes"
                onSelect={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1">All universes</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {totalCount}
                </span>
              </CommandItem>
              {options.map((u) => (
                <CommandItem
                  key={u.name}
                  value={u.name}
                  onSelect={() => {
                    onChange(u.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === u.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {u.count}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
