import { cn } from "@/lib/utils";

interface StateViewProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ emoji, title, description, action, className }: StateViewProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-16 text-center", className)}>
      {emoji ? <div className="text-5xl" role="img" aria-hidden="true">{emoji}</div> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Oups, une erreur est survenue", description, retry, className }: {
  title?: string;
  description?: string;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-16 text-center", className)}>
      <div className="text-5xl" role="img" aria-hidden="true">😵</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {retry ? (
        <button
          onClick={retry}
          className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer hover:bg-primary/90"
        >
          Réessayer
        </button>
      ) : null}
    </div>
  );
}