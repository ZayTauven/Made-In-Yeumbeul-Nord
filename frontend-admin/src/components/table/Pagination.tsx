'use client';
/*
 * Pagination de liste — le composant `.ax-pagination` du template, câblé.
 *
 * Le template livre le balisage avec des `<a href="#">` figés sur cinq pages.
 * Ici les numéros sont calculés et les boutons agissent : c'est le même rendu,
 * mais utilisable.
 *
 * Partagé par tous les écrans de liste ; chacun garde son état de page, ce
 * composant ne fait que l'afficher et le faire changer.
 */

export interface EtiquettesPagination {
  navigation: string;
  precedente: string;
  suivante: string;
  /** Fonction d'étiquetage d'un numéro de page, pour les lecteurs d'écran. */
  page: (numero: number) => string;
}

export function Pagination({
  courante,
  total,
  onChanger,
  etiquettes,
}: {
  courante: number;
  total: number;
  onChanger: (page: number) => void;
  etiquettes: EtiquettesPagination;
}) {
  if (total <= 1) return null;

  return (
    <nav className="ax-pagination" aria-label={etiquettes.navigation}>
      <button
        type="button"
        className="ax-pagination__prev"
        disabled={courante === 1}
        aria-disabled={courante === 1}
        aria-label={etiquettes.precedente}
        onClick={() => onChanger(Math.max(1, courante - 1))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6l6 6" /></svg>
      </button>
      <ul className="ax-pagination__pages">
        {numerosDePage(courante, total).map((numero, index) =>
          numero === null ? (
            // Une ellipse n'a pas d'identité propre : sa position est sa clé.
            <li key={`ellipse-${index}`}>
              <span className="ax-pagination__ellipsis">…</span>
            </li>
          ) : (
            <li key={numero}>
              <button
                type="button"
                className={`ax-pagination__page${numero === courante ? ' is-active' : ''}`}
                aria-current={numero === courante ? 'page' : undefined}
                aria-label={etiquettes.page(numero)}
                onClick={() => onChanger(numero)}
              >
                {numero}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className="ax-pagination__next"
        disabled={courante === total}
        aria-disabled={courante === total}
        aria-label={etiquettes.suivante}
        onClick={() => onChanger(Math.min(total, courante + 1))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6l-6 6" /></svg>
      </button>
    </nav>
  );
}

/**
 * Numéros à afficher : la première, la dernière, la courante et ses voisines,
 * séparées par des ellipses (`null`). Vingt et une pages côte à côte ne tiennent
 * pas sur un écran de vidéoprojecteur.
 */
export function numerosDePage(courante: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const retenues = new Set([1, total, courante, courante - 1, courante + 1]);
  const triees = [...retenues].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const resultat: Array<number | null> = [];
  let precedente = 0;
  for (const n of triees) {
    if (precedente && n - precedente > 1) resultat.push(null);
    resultat.push(n);
    precedente = n;
  }
  return resultat;
}

export default Pagination;
