import { useEffect, useState } from "react";
import { getFavorites, removeFavorite, getStats } from "../api";
import type { Recipe, Stats } from "../api";
import { useToast } from "../context/ToastContext";
import { Trash2, Clock, Users, Check, X } from "lucide-react";

export const FavoritesPage = () => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const { showToast } = useToast();

  const loadFavoritesAndStats = () => {
    setLoading(true);
    Promise.all([getFavorites(), getStats()])
      .then(([favs, st]) => {
        setFavorites(favs);
        setStats(st);
      })
      .catch(() => showToast("Could not load your favorites.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFavoritesAndStats();
  }, []);

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await removeFavorite(id);
      setFavorites((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }
      showToast("Removed from your notebook.", "info");
      getStats().then((st) => setStats(st)).catch(() => {});
    } catch {
      showToast("Failed to remove recipe.", "error");
    }
  };

  const handleOpenModal = (r: Recipe) => {
    setSelectedRecipe(r);
    setCheckedIngredients({});
  };

  const toggleCheck = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const rotationClasses = [
    "rotate-1",
    "-rotate-1",
    "rotate-1.5",
    "-rotate-1.5",
    "rotate-0.5",
    "-rotate-2",
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header + Stamp Badge */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#2B2118] dark:text-[#EFE7DA] leading-tight">
            Favorite Recipes
          </h1>
          <p className="font-handwriting text-xl sm:text-2xl text-[#7A8B69] dark:text-[#D98E04] mt-1 -rotate-1">
            the dishes worth making again and again.
          </p>
        </div>

        {/* Global Food Saved Badge */}
        {stats && stats.total_grams_saved > 0 && (
          <div className="self-start md:self-end border-1.5 border-dashed border-[#B5502F] dark:border-[#D98E04] bg-[#FBF8F1] dark:bg-[#27221E] px-3.5 py-2 rounded-[4px_6px_5px_4px] shadow-hard-sm dark:shadow-hard-dark-sm">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70">
              Food saved so far
            </span>
            <span className="font-serif font-bold text-base text-[#B5502F] dark:text-[#D98E04]">
              {stats.total_grams_saved} g
            </span>
          </div>
        )}
      </header>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118]/40 dark:border-[#4E4238] rounded-[6px_10px_8px_12px] p-6 shadow-hard dark:shadow-hard-dark animate-pulse space-y-4"
            >
              <div className="w-12 h-3 bg-[#2B2118]/10 dark:bg-[#EFE7DA]/10 rounded" />
              <div className="w-3/4 h-6 bg-[#2B2118]/15 dark:bg-[#EFE7DA]/15 rounded" />
              <div className="w-full h-12 bg-[#2B2118]/10 dark:bg-[#EFE7DA]/10 rounded" />
              <div className="w-1/2 h-3 bg-[#2B2118]/10 dark:bg-[#EFE7DA]/10 rounded pt-2" />
            </div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        /* Empty State */
        <div className="border-1.5 border-dashed border-[#2B2118]/40 dark:border-[#4E4238] rounded-[8px_12px_6px_10px] p-12 text-center bg-[#F6F0E4]/40 dark:bg-[#27221E]/30 max-w-xl mx-auto">
          <p className="font-serif text-xl font-medium text-[#2B2118]/80 dark:text-[#EFE7DA]/80">
            No favorites bookmarked yet.
          </p>
          <p className="font-handwriting text-2xl text-[#B5502F] dark:text-[#D98E04] mt-2 -rotate-1">
            click "keep this one" on any recipe card to save it here.
          </p>
        </div>
      ) : (
        /* Pinned Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {favorites.map((r, i) => {
            const rot = rotationClasses[i % rotationClasses.length];
            return (
              <article
                key={r.id}
                onClick={() => handleOpenModal(r)}
                className={`bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[6px_10px_8px_12px] p-6 shadow-hard dark:shadow-hard-dark hover:rotate-0 hover:scale-[1.02] hover:shadow-hard-lg dark:hover:shadow-hard-dark-lg transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${rot}`}
              >
                {/* Pin hole */}
                <div className="w-2.5 h-2.5 rounded-full border border-[#2B2118]/40 dark:border-[#4E4238] bg-[#E8DFC8] dark:bg-[#1E1915] absolute top-3 left-1/2 -translate-x-1/2 shadow-inner" />

                <div>
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#2B2118]/60 dark:text-[#EFE7DA]/60 mb-3 mt-1">
                    <span className="font-semibold text-[#7A8B69] dark:text-[#D98E04]">
                      {r.cuisine || "Custom"}
                    </span>
                    <span className="border border-dashed border-[#2B2118]/40 dark:border-[#4E4238] px-2 py-0.5 rounded-[3px_4px_3px_4px]">
                      {r.diet}
                    </span>
                  </div>

                  <h2 className="font-serif text-xl font-bold text-[#2B2118] dark:text-[#EFE7DA] mb-2 leading-snug group-hover:text-[#B5502F] dark:group-hover:text-[#D98E04] transition-colors">
                    {r.title}
                  </h2>

                  {r.description && (
                    <p className="text-xs text-[#2B2118]/80 dark:text-[#EFE7DA]/75 line-clamp-2 leading-relaxed italic">
                      "{r.description}"
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#2B2118]/20 dark:border-[#4E4238] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs font-mono text-[#2B2118]/70 dark:text-[#EFE7DA]/65">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {r.cooking_time}m
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {r.servings}p
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, r.id)}
                    className="text-xs font-mono inline-flex items-center gap-1 text-[#B5502F] hover:underline"
                    aria-label={`Remove ${r.title} from favorites`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Opened Recipe Card Modal */}
      {selectedRecipe && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#2B2118]/50 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-[1px] animate-fade-in"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[8px_12px_6px_10px] p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-hard-lg dark:shadow-hard-dark-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 p-1.5 rounded border-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#F6F0E4] dark:bg-[#1E1915] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#2B2118] hover:text-[#F6F0E4] dark:hover:bg-[#EFE7DA] dark:hover:text-[#1E1915] transition-colors"
              aria-label="Close recipe card"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pr-8">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2118] dark:text-[#EFE7DA]">
                  {selectedRecipe.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <p className="font-handwriting text-lg text-[#7A8B69] dark:text-[#D98E04]">
                    serves {selectedRecipe.servings}, about {selectedRecipe.cooking_time} min
                  </p>
                  {selectedRecipe.estimated_food_saved_grams && selectedRecipe.estimated_food_saved_grams > 0 ? (
                    <span className="font-handwriting text-base text-[#B5502F] dark:text-[#D98E04] -rotate-1">
                      • saves about {selectedRecipe.estimated_food_saved_grams} g
                    </span>
                  ) : null}
                </div>
              </div>

              {selectedRecipe.calories && (
                <div className="border border-dashed border-[#2B2118] dark:border-[#4E4238] px-2.5 py-1 text-xs font-mono tracking-widest uppercase self-start rounded text-[#2B2118]/80 dark:text-[#EFE7DA]/80 bg-[#F6F0E4]/60 dark:bg-[#1E1915]/60">
                  {selectedRecipe.calories} kcal / serving
                </div>
              )}
            </div>

            {/* Double Rule */}
            <div className="double-rule my-4 text-[#2B2118] dark:text-[#4E4238]" />

            {/* Description */}
            {selectedRecipe.description && (
              <p className="text-sm text-[#2B2118]/90 dark:text-[#EFE7DA]/90 italic mb-5 leading-relaxed">
                "{selectedRecipe.description}"
              </p>
            )}

            {/* Ingredients & Steps */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-[#2B2118]/20 dark:border-[#4E4238] pb-5 md:pb-0 md:pr-4">
                <h3 className="font-serif font-bold text-sm text-[#2B2118] dark:text-[#EFE7DA] uppercase tracking-wide mb-3">
                  Ingredients
                </h3>
                <ul className="space-y-1.5 notebook-ruled text-xs sm:text-sm">
                  {selectedRecipe.ingredients.map((ing, idx) => {
                    const isChecked = checkedIngredients[idx];
                    return (
                      <li
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className="flex items-center gap-2 cursor-pointer py-1 select-none"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-sm border-1.5 border-[#2B2118] dark:border-[#EFE7DA] flex items-center justify-center shrink-0 ${
                            isChecked ? "bg-[#7A8B69] text-[#FBF8F1]" : "bg-transparent"
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span
                          className={`${
                            isChecked ? "line-through text-[#2B2118]/40 dark:text-[#EFE7DA]/40" : "text-[#2B2118] dark:text-[#EFE7DA]"
                          }`}
                        >
                          {ing}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="md:col-span-7">
                <h3 className="font-serif font-bold text-sm text-[#2B2118] dark:text-[#EFE7DA] uppercase tracking-wide mb-3">
                  Method
                </h3>
                <ol className="space-y-3.5">
                  {selectedRecipe.steps.map((st, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-[#2B2118] dark:text-[#EFE7DA]">
                      <span className="font-serif text-base font-bold text-[#7A8B69] dark:text-[#D98E04] leading-none shrink-0 w-4">
                        {idx + 1}.
                      </span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Substitutions Block */}
            {selectedRecipe.substitutions && selectedRecipe.substitutions.length > 0 && (
              <div className="mt-5 p-4 border border-dashed border-[#2B2118]/50 dark:border-[#4E4238] rounded-[6px_8px_6px_8px] bg-[#F6F0E4]/70 dark:bg-[#1E1915]/60">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#2B2118] dark:text-[#EFE7DA]">
                    Missing something?
                  </h4>
                  <span className="font-handwriting text-sm text-[#B5502F] dark:text-[#D98E04] -rotate-1">
                    easy kitchen swaps
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-[#2B2118]/80 dark:text-[#EFE7DA]/80 font-mono">
                  {selectedRecipe.substitutions.map((sub, i) => (
                    <li key={i} className="flex items-baseline gap-1.5">
                      <span className="text-[#B5502F] dark:text-[#D98E04]">›</span>
                      <span>{sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="mt-8 pt-4 border-t-1.5 border-[#2B2118]/30 dark:border-[#4E4238] flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => handleRemove(e, selectedRecipe.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#B5502F] hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from favorites</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="text-xs font-mono text-[#2B2118]/70 dark:text-[#EFE7DA]/70 hover:underline"
              >
                Close recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
