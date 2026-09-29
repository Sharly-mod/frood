/**
 * Application configuration.
 * Change the app name / strings here to rebrand the whole app.
 */
export const appConfig = {
  name: "Frood",
  tagline: "Décide enfin où manger",
  description:
    "Trouve les meilleurs restaurants autour de toi selon ton budget et laisse le tournoi décider.",
  heroTitle: "Tu manges quoi aujourd'hui ?",
  heroSubtitle: "On trouve les restaurants. Tu choisis le gagnant.",
  shareMessage: (winnerName: string, cuisineEmoji: string) =>
    `🏆 J'ai laissé ${appConfig.name} décider où manger.\n\nLe gagnant : ${winnerName} ${cuisineEmoji}`,
  shareUrl: (restaurantId: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/restaurants?winner=${restaurantId}`
      : "/restaurants",
  nav: {
    home: "Accueil",
    tournament: "Tournoi",
    favorites: "Favoris",
    profile: "Profil",
  } as const,
} as const;