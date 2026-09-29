import { SearchForm } from "@/components/home/search-form";
import { appConfig } from "@/config/app";

const HERO_EMOJIS = ["🍔", "🍕", "🍣", "🌮", "🍜", "🥑"];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10">
      <header className="mb-8 mt-4">
        <div className="mb-3 flex items-center gap-2 text-xl" aria-hidden="true">
          {HERO_EMOJIS.map((emoji) => (
            <span key={emoji}>{emoji}</span>
          ))}
        </div>
        <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight">
          {appConfig.heroTitle}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">{appConfig.heroSubtitle}</p>
      </header>

      <SearchForm />
    </div>
  );
}