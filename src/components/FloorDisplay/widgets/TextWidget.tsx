import { Card } from '@/components/ui/card';

type Props = {
  title?: string;
  config?: Record<string, unknown>;
};

export function TextWidget({ title, config }: Props) {
  const text = (config?.text as string) || 'Welcome';

  return (
    <Card className="p-4 h-full flex flex-col">
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-3xl font-bold text-center">{text}</p>
      </div>
    </Card>
  );
}
