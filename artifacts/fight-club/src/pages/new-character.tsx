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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const characterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  universe: z.string().min(1, "Universe is required").max(100),
  strength: z.number().min(1).max(100),
  speed: z.number().min(1).max(100),
  intelligence: z.number().min(1).max(100),
  durability: z.number().min(1).max(100),
  specialAbility: z.string().min(1, "Special ability is required"),
  weaknesses: z.string().min(1, "Weaknesses are required"),
  description: z.string().min(1, "Description is required"),
});

type CharacterFormValues = z.infer<typeof characterSchema>;

export function NewCharacter() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createCharacter = useCreateCharacter({
    mutation: {
      onSuccess: () => {
        toast({ title: "Fighter Added", description: "Character added to the roster successfully." });
        queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterStatsQueryKey() });
        setLocation("/roster");
      },
      onError: (error) => {
        toast({ title: "Error", description: error.error || "Failed to add character.", variant: "destructive" });
      }
    }
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
    <div className="max-w-3xl mx-auto">
      <Card className="rounded-none border-2 bg-card">
        <CardHeader className="border-b-2 border-border pb-6 bg-muted/30">
          <CardTitle className="font-display text-4xl uppercase tracking-widest text-primary">Add New Fighter</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold uppercase text-xs tracking-widest">Character Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Goku" className="rounded-none border-2 font-display text-xl h-12 uppercase" {...field} />
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
                      <FormLabel className="font-bold uppercase text-xs tracking-widest">Universe / Franchise</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dragon Ball" className="rounded-none border-2 font-display text-xl h-12 uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6 bg-muted/20 p-6 border-2 border-border">
                <h3 className="font-display text-2xl uppercase text-secondary">Combat Stats (1-100)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {(['strength', 'speed', 'intelligence', 'durability'] as const).map((stat) => (
                    <FormField
                      key={stat}
                      control={form.control}
                      name={stat}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center mb-2">
                            <FormLabel className="font-bold uppercase text-xs tracking-widest">{stat}</FormLabel>
                            <span className="font-display text-xl text-primary">{field.value}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={1}
                              max={100}
                              step={1}
                              defaultValue={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="py-4"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="specialAbility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-widest">Special Ability</FormLabel>
                    <FormControl>
                      <Input placeholder="Signature move or power" className="rounded-none border-2 h-12" {...field} />
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
                    <FormLabel className="font-bold uppercase text-xs tracking-widest">Weaknesses</FormLabel>
                    <FormControl>
                      <Input placeholder="Vulnerabilities or limitations" className="rounded-none border-2 h-12" {...field} />
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
                    <FormLabel className="font-bold uppercase text-xs tracking-widest">Lore / Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief backstory..." 
                        className="rounded-none border-2 min-h-[100px] resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                size="lg" 
                disabled={createCharacter.isPending}
                className="w-full font-display text-2xl uppercase tracking-widest h-16 rounded-none shadow-[4px_4px_0_0_hsl(var(--primary))] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0_0_hsl(var(--primary))] transition-all"
              >
                {createCharacter.isPending ? "Registering..." : "Register Fighter"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
