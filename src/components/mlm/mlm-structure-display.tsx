import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MLMStructureDisplayProps {
  mlmStructure: {
    [key: string]: {
      percentage: number;
      description: string;
    };
  };
}

export const MLMStructureDisplay = ({ mlmStructure }: MLMStructureDisplayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>MLM Structure & Commission Rates</CardTitle>
        <CardDescription>
          30-level MLM structure with commission percentages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(mlmStructure).map(([level, data]) => (
            <div
              key={level}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">Level {level}</Badge>
                <span className="font-semibold text-primary">
                  {data.percentage}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
