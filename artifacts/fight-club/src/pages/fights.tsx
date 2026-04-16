import { useListFights } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function Fights() {
  const { data: fights, isLoading } = useListFights();

  if (isLoading) {
    return <div className="p-8 text-center font-display text-2xl animate-pulse">Loading Fight History...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between border-b-2 border-primary pb-4">
        <h1 className="font-display text-4xl uppercase tracking-widest">Fight History</h1>
        <Badge variant="outline" className="rounded-none border-primary text-primary font-display text-xl uppercase px-4 py-1">
          {fights?.length || 0} Matches
        </Badge>
      </div>

      {fights?.length === 0 ? (
        <div className="text-center p-12 bg-card border-2 border-border border-dashed">
          <p className="text-2xl text-muted-foreground font-display uppercase">No fights recorded yet.</p>
          <p className="text-muted-foreground mt-2">Go to the Arena to simulate a match.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {fights?.map((fight) => (
            <Card 
              key={fight.id} 
              className={`rounded-none border-2 border-border relative overflow-hidden bg-card/50`}
            >
              {/* Winner indicator stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${fight.winner === 1 ? 'bg-team1' : 'bg-team2'}`} />
              
              <CardHeader className="p-4 pb-2 pl-6 bg-muted/20 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Match #{fight.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(fight.simulatedAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 pl-8">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between mb-6">
                  {/* Team 1 */}
                  <div className={`flex-1 text-center md:text-left ${fight.winner === 1 ? 'opacity-100' : 'opacity-60'}`}>
                    <h3 className="font-display text-xl text-team1 uppercase mb-2">Team 1 {fight.winner === 1 && <span className="text-white text-xs bg-team1 px-2 py-0.5 ml-2 align-middle">WINNER</span>}</h3>
                    <p className="font-bold text-sm text-muted-foreground">
                      {fight.team1Names.join(', ')}
                    </p>
                  </div>
                  
                  {/* VS */}
                  <div className="font-display text-3xl text-primary bg-primary/10 px-4 py-2 border border-primary shrink-0 rotate-12 italic">
                    VS
                  </div>
                  
                  {/* Team 2 */}
                  <div className={`flex-1 text-center md:text-right ${fight.winner === 2 ? 'opacity-100' : 'opacity-60'}`}>
                    <h3 className="font-display text-xl text-team2 uppercase mb-2">{fight.winner === 2 && <span className="text-white text-xs bg-team2 px-2 py-0.5 mr-2 align-middle">WINNER</span>} Team 2</h3>
                    <p className="font-bold text-sm text-muted-foreground">
                      {fight.team2Names.join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="bg-background p-4 border-l-4 border-primary/50 text-sm">
                  <span className="font-bold uppercase text-primary text-xs mr-2">Summary:</span>
                  {fight.summary}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
