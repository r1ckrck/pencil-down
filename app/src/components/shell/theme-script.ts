/** localStorage key for the theme choice. The only thing this app keeps in browser storage. */
export const THEME_KEY = "pd-theme";

/**
 * Runs in <head> before first paint: applies a stored "light" | "dark" choice to <html data-theme>.
 * No stored choice → no attribute → tokens follow prefers-color-scheme.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
