export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "rentix-theme";
export const THEME_STORAGE_KEY = "rentix-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Skrypt wstrzykiwany do <head> i wykonywany synchronicznie przed pierwszym
 * malowaniem strony.
 *
 * Serwer zna motyw tylko wtedy, gdy użytkownik ma już ciasteczko. Przy
 * pierwszej wizycie renderuje light, a ten skrypt zdąży podmienić atrybut,
 * zanim cokolwiek pojawi się na ekranie — dlatego nie ma białego mignięcia
 * przy wejściu w trybie ciemnym. Przy okazji zapisuje ciasteczko, żeby
 * kolejne żądania serwer renderował od razu poprawnie.
 */
export const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.cookie = ${JSON.stringify(THEME_COOKIE)} + '=' + theme
      + ';path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax';
  } catch (e) {}
})();
`.trim();
