import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateCharacter, getListCharactersQueryKey, getGetCharacterStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const characterSchema = z.object({
  name: z.string().min(1, "Required").max(100),
  universe: z.string().min(1, "Required").max(100),
  strength: z.number().min(1).max(100),
  speed: z.number().min(1).max(100),
  intelligence: z.number().min(1).max(100),
  durability: z.number().min(1).max(100),
  specialAbility: z.string().min(1, "Required"),
  weaknesses: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
});

type CharacterFormValues = z.infer<typeof characterSchema>;

const STAT_LABELS: Record<string, string> = {
  strength: "STR",
  speed: "SPD",
  intelligence: "INT",
  durability: "DUR",
};

export function NewCharacter() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCharacter = useCreateCharacter({
    mutation: {
      onSuccess: () => {
        toast({ title: "Fighter Registered", description: "New fighter added to the roster." });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
        setLocation("/roster");
      },
      onError: (error) => {
        toast({ title: "Error", description: error.error || "Failed to add fighter.", variant: "destructive" });
      },
    },
  });

  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: "",
      universe: "",
      strength: 50,
      speed: 50,
      intelligence: 50,
      durability: 50,
      specialAbility: "",
      weaknesses: "",
      description: "",
    },
  });

  function onSubmit(data: CharacterFormValues) {
    createCharacter.mutate({ data });
  }

  return (
    <div className="flex flex-col">
      {/* Page title */}
      <div className="px-4 pt-4 pb-2 border-b border-border/30">
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Register Fighter</h1>
      </div>

      <div className="p-4 overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Fighter Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Goku" className="rounded-none border-2 font-display text-lg h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="universe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Universe</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Dragon Ball" className="rounded-none border-2 font-display text-lg h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stats */}
            <div className="border-2 border-border/50 bg-card/50 p-4">
              <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">Combat Stats (1–100)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {(["strength", "speed", "intelligence", "durability"] as const).map((stat) => (
                  <FormField
                    key={stat}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="font-display text-sm uppercase tracking-wider">{STAT_LABELS[stat]}</FormLabel>
                          <span className="font-display text-2xl text-primary leading-none">{field.value}</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={1}
                            max={100}
                            step={1}
                            defaultValue={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-2"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="specialAbility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Special Ability</FormLabel>
                    <FormControl>
                      <Input placeholder="Signature power or move" className="rounded-none border-2 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weaknesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Weaknesses</FormLabel>
                    <FormControl>
                      <Input placeholder="Vulnerabilities or limits" className="rounded-none border-2 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Lore</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief backstory..."
                        className="rounded-none border-2 min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={createCharacter.isPending}
              className="w-full font-display text-xl uppercase tracking-widest h-14 rounded-none"
            >
              {createCharacter.isPending ? "Registering..." : "Register Fighter"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
