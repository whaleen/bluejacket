import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

type Props = {
  title?: string;
  config?: Record<string, unknown>;
};

export function ClockWidget({ title, config }: Props) {
  const [time, setTime] = useState(new Date());
  const showDate = config?.showDate !== false;
  const showSeconds = config?.showSeconds !== false;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  const dateString = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="p-4 h-full flex flex-col">
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold font-mono">{timeString}</p>
        {showDate && (
          <p className="text-lg text-muted-foreground mt-2">{dateString} sup dog</p> 
        )}
      </div>
    </Card>
  );
}
