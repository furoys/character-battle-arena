import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Send, Info } from "lucide-react";
import { useState } from "react";

const suggestionSchema = z.object({
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

type SuggestionFormValues = z.infer<typeof suggestionSchema>;

const STAT_LABELS: Record<string, string> = {
  strength: "STR",
  speed: "SPD",
  intelligence: "INT",
  durability: "DUR",
};

const STAT_DESCRIPTIONS: Record<string, string> = {
  strength: "Raw physical force",
  speed: "Movement & reaction time",
  intelligence: "Strategy, tactics & cunning",
  durability: "Resistance to damage",
};

export function NewCharacter() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const form = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionSchema),
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

  async function onSubmit(data: SuggestionFormValues) {
    setPending(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      toast({ title: "Error", description: "Could not submit suggestion. Try again.", variant: "destructive" });
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 border-b border-border/30">
          <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Suggest a Fighter</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Send className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl uppercase tracking-widest text-emerald-400">Suggestion Sent</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your fighter will be reviewed before being added to the roster. Thanks for the submission.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-none font-display uppercase tracking-widest"
            onClick={() => { setSubmitted(false); form.reset(); }}
          >
            Suggest Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-2 border-b border-border/30">
        <h1 className="font-display text-2xl uppercase tracking-widest text-primary">Suggest a Fighter</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Submissions are reviewed before being added to the roster.</p>
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
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Universe / Series</FormLabel>
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
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">Combat Stats</h3>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Info className="w-3 h-3" />
                  <span>1–100 scale</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {(["strength", "speed", "intelligence", "durability"] as const).map((stat) => (
                  <FormField
                    key={stat}
                    control={form.control}
                    name={stat}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <FormLabel className="font-display text-sm uppercase tracking-wider">{STAT_LABELS[stat]}</FormLabel>
                            <p className="text-[9px] text-muted-foreground/60 leading-none mt-0.5">{STAT_DESCRIPTIONS[stat]}</p>
                          </div>
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
                    <FormLabel className="font-bold uppercase text-xs tracking-widest text-muted-foreground">Lore / Background</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief backstory or context..."
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
              disabled={pending}
              className="w-full font-display text-xl uppercase tracking-widest h-14 rounded-none"
            >
              {pending ? "Submitting..." : "Submit for Review"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
