import { useState, useEffect, useRef } from "react";
import { Upload, Heart, RefreshCw, Check } from "lucide-react";
import { generateRecipe, detectIngredients, addFavorite, getStats } from "../api";
import type { Recipe, Stats } from "../api";
import { useToast } from "../context/ToastContext";

const ROTATING_MESSAGES = [
  "Preparing the tadka...",
  "Simmering in the kadhai...",
  "Checking the spice rack...",
  "Almost ready for the tawa...",
];

export const GeneratePage = () => {
  const { showToast } = useToast();

  // Form states
  const [ingredients, setIngredients] = useState<string[]>(["paneer", "capsicum", "tomato"]);
  const [useFirst, setUseFirst] = useState<string[]>(["paneer"]);
  const [inputValue, setInputValue] = useState("");
  const [diet, setDiet] = useState<"veg" | "non-veg" | "vegan" | "jain" | "vrat">("veg");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<string>("Punjabi");
  const [maxTime, setMaxTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(2);

  // Platform stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Loading & Vision states
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result recipe state
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});

  // Fetch initial stats
  useEffect(() => {
    getStats()
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  // Cycle loading messages when generating
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
      }, 2000);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle adding ingredient chip
  const handleAddIngredient = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddIngredient(inputValue);
    }
  };

  const handleRemoveIngredient = (indexToRemove: number) => {
    const ingToRemove = ingredients[indexToRemove];
    setIngredients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setUseFirst((prev) => prev.filter((item) => item !== ingToRemove));
  };

  // Toggle "Use Soon" (expiry awareness) for an ingredient
  const toggleUseFirst = (ing: string) => {
    setUseFirst((prev) =>
      prev.includes(ing) ? prev.filter((item) => item !== ing) : [...prev, ing]
    );
  };

  // Toggle allergy
  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  // Upload photo & detect ingredients
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPEG, PNG).", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Photo must be smaller than 5MB.", "error");
      return;
    }

    setIsDetecting(true);
    try {
      const detected = await detectIngredients(file);
      if (detected.length === 0) {
        showToast("Couldn't spot any clear food items. Try a closer shot?", "info");
      } else {
        const newItems = detected.filter((item) => !ingredients.includes(item));
        setIngredients((prev) => [...prev, ...newItems]);
        showToast(`Found ${detected.length} items from your photo!`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Could not read the photo. Try again?", "error");
    } finally {
      setIsDetecting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Generate recipe handler
  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      showToast("Add at least one ingredient first.", "error");
      return;
    }

    setIsGenerating(true);
    setIsFavorited(false);
    setCheckedIngredients({});

    try {
      const result = await generateRecipe({
        ingredients,
        diet,
        cuisine,
        max_time: maxTime,
        servings,
        allergies,
        use_first: useFirst,
      });
      setRecipe(result);
      showToast("Recipe ready! Smells like home.", "success");
      // Refresh platform stats
      getStats().then((data) => setStats(data)).catch(() => {});
    } catch (err: any) {
      showToast("That didn't work. Try once more?", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to favorites handler
  const handleSaveFavorite = async () => {
    if (!recipe) return;
    try {
      await addFavorite(recipe.id);
      setIsFavorited(true);
      showToast("Kept in your favorites notebook.", "success");
      getStats().then((data) => setStats(data)).catch(() => {});
    } catch {
      showToast("Could not save this one.", "error");
    }
  };

  const toggleIngredientCheck = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Asymmetric Hero + Food Saved Stamp */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#2B2118] dark:text-[#EFE7DA] max-w-2xl leading-[1.15]">
            What's in your fridge today?
          </h1>
          <p className="font-handwriting text-xl sm:text-2xl text-[#B5502F] dark:text-[#D98E04] mt-2 -rotate-1">
            tell us what's left, we'll figure out dinner.
          </p>
        </div>

        {/* Global Food Saved Stamp Badge */}
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
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[6px_10px_8px_12px] p-6 shadow-hard dark:shadow-hard-dark space-y-6">
          {/* Ingredient Chips & Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="ingredient-input" className="font-serif font-semibold text-lg text-[#2B2118] dark:text-[#EFE7DA]">
                Ingredients on hand
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDetecting}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B2118] dark:text-[#EFE7DA] hover:text-[#B5502F] dark:hover:text-[#D98E04] underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isDetecting ? "Scanning photo..." : "Upload fridge photo"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload photo of ingredients"
              />
            </div>

            <p className="text-[11px] text-[#2B2118]/60 dark:text-[#EFE7DA]/60 mb-2 font-mono">
              Click "use soon" on any ingredient nearing expiry to prioritize it:
            </p>

            {/* Chip input container */}
            <div className="min-h-[96px] p-3 border-1.5 border-dashed border-[#2B2118]/70 dark:border-[#4E4238] rounded-[6px_8px_6px_8px] bg-[#F6F0E4]/60 dark:bg-[#1E1915]/50 flex flex-wrap gap-2.5 items-center">
              {ingredients.map((ing, idx) => {
                const isUseFirst = useFirst.includes(ing);
                const rotClasses = [
                  "-rotate-1",
                  "rotate-1",
                  "-rotate-1.5",
                  "rotate-1.5",
                  "-rotate-0.5",
                  "rotate-1",
                ];
                const rot = rotClasses[idx % rotClasses.length];

                return (
                  <span
                    key={`${ing}-${idx}`}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium bg-[#FBF8F1] dark:bg-[#2E2721] border-1.5 ${
                      isUseFirst
                        ? "border-[#B5502F] dark:border-[#D98E04] shadow-[1px_2px_0px_#B5502F]"
                        : "border-[#2B2118] dark:border-[#4E4238] shadow-[1px_1px_0px_#2B2118]"
                    } text-[#2B2118] dark:text-[#EFE7DA] rounded-[4px_6px_4px_6px] ${rot} transition-all`}
                  >
                    {/* Small dot marker for use soon */}
                    {isUseFirst && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#B5502F] dark:bg-[#D98E04] shrink-0"
                        title="Expiring soon (prioritized)"
                      />
                    )}
                    <span className={isUseFirst ? "font-semibold" : ""}>{ing}</span>

                    {/* Use soon toggle button */}
                    <button
                      type="button"
                      onClick={() => toggleUseFirst(ing)}
                      className={`text-[10px] px-1 py-0.2 rounded border border-dashed transition-colors ${
                        isUseFirst
                          ? "border-[#B5502F] text-[#B5502F] dark:border-[#D98E04] dark:text-[#D98E04] bg-[#B5502F]/10 font-bold"
                          : "border-[#2B2118]/30 dark:border-[#EFE7DA]/30 text-[#2B2118]/50 dark:text-[#EFE7DA]/50 hover:text-[#B5502F]"
                      }`}
                      title={isUseFirst ? "Prioritized for cooking" : "Mark to use soon before it spoils"}
                    >
                      {isUseFirst ? "use soon ✓" : "use soon"}
                    </button>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-[#2B2118]/60 dark:text-[#EFE7DA]/60 hover:text-[#B5502F] dark:hover:text-[#D98E04] p-0.5 leading-none font-bold ml-0.5"
                      aria-label={`Remove ${ing}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}

              <input
                id="ingredient-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ingredients.length === 0 ? "paneer, capsicum, methi..." : "add more (Enter)..."}
                className="flex-1 min-w-[150px] bg-transparent text-sm text-[#2B2118] dark:text-[#EFE7DA] placeholder:text-[#2B2118]/40 dark:placeholder:text-[#EFE7DA]/40 focus:outline-none py-1 px-1"
              />
            </div>
          </div>

          {/* Dietary Filter (Indian kitchen-first) */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70">
                Dietary Preference
              </label>
              {diet === "jain" && (
                <span className="font-handwriting text-xs text-[#B5502F] dark:text-[#D98E04] -rotate-1">
                  no onion, garlic, or root veg
                </span>
              )}
              {diet === "vrat" && (
                <span className="font-handwriting text-xs text-[#7A8B69] dark:text-[#D98E04] -rotate-1">
                  fasting friendly, sendha namak
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(["veg", "non-veg", "vegan", "jain", "vrat"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiet(d)}
                  className={`py-2 px-1 text-[11px] font-semibold uppercase tracking-wider rounded-[4px_6px_5px_4px] border-1.5 border-[#2B2118] dark:border-[#4E4238] transition-all text-center ${
                    diet === d
                      ? "bg-[#2B2118] dark:bg-[#D98E04] text-[#F6F0E4] dark:text-[#1E1915] shadow-hard-sm dark:shadow-hard-dark-sm font-bold"
                      : "bg-[#FBF8F1] dark:bg-[#27221E] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] dark:hover:bg-[#1E1915]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Allergy Checkboxes */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70 mb-2">
              Allergies to Avoid
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: "nuts", label: "No Nuts (Peanuts/Cashews)" },
                { id: "dairy", label: "No Dairy (Lactose)" },
                { id: "gluten", label: "No Gluten (Wheat/Atta)" },
              ].map((item) => {
                const isSelected = allergies.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAllergy(item.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-[4px_6px_5px_4px] border-1.5 border-[#2B2118] dark:border-[#4E4238] transition-all ${
                      isSelected
                        ? "bg-[#B5502F] text-[#FBF8F1] dark:bg-[#B5502F] font-semibold shadow-hard-sm"
                        : "bg-[#FBF8F1] dark:bg-[#27221E] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4]"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-sm border border-[#2B2118] dark:border-[#EFE7DA] flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-white text-[#B5502F]" : "bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuisine & Time & Servings */}
          <div className="space-y-4 pt-1 border-t border-[#2B2118]/20 dark:border-[#4E4238]">
            {/* Cuisine Selector (Regional Indian first) */}
            <div>
              <label htmlFor="cuisine-select" className="block text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70 mb-1.5">
                Cuisine Style
              </label>
              <select
                id="cuisine-select"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full bg-[#F6F0E4] dark:bg-[#1E1915] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[4px_6px_5px_4px] px-3 py-2 text-sm font-medium text-[#2B2118] dark:text-[#EFE7DA] focus:outline-none"
              >
                <option value="Any">Any Style (Chef's Choice)</option>
                <option value="Sindhi">Sindhi (Kadhi, Tuk, Koki & Sai Bhaji)</option>
                <option value="Punjabi">Punjabi (Dhaba & Homestyle)</option>
                <option value="Maharashtrian">Maharashtrian (Ghati / Malvani)</option>
                <option value="Gujarati">Gujarati (Sweet & Savory)</option>
                <option value="South Indian">South Indian (Tadka & Curry Leaf)</option>
                <option value="Bengali">Bengali (Panch Phoron & Mustard)</option>
                <option value="Indo-Chinese">Indo-Chinese (Desi Street Wok)</option>
                <option value="Italian">Italian</option>
                <option value="Mexican">Mexican</option>
              </select>
            </div>

            {/* Max Cooking Time Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="time-slider" className="text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70">
                  Max Cooking Time
                </label>
                <span className="font-mono text-xs font-bold text-[#B5502F] dark:text-[#D98E04] border border-dashed border-[#B5502F] dark:border-[#D98E04] px-1.5 py-0.5 rounded">
                  {maxTime} min
                </span>
              </div>
              <input
                id="time-slider"
                type="range"
                min="10"
                max="90"
                step="5"
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                className="w-full accent-[#B5502F] dark:accent-[#D98E04] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#2B2118]/50 dark:text-[#EFE7DA]/50 mt-1">
                <span>10m</span>
                <span>45m</span>
                <span>90m</span>
              </div>
            </div>

            {/* Servings Stepper */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70">
                Number of Servings
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="w-8 h-8 rounded border-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#FBF8F1] dark:bg-[#1E1915] text-base font-bold text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] dark:hover:bg-[#27221E] active:translate-y-0.5 transition-all flex items-center justify-center"
                  aria-label="Decrease servings"
                >
                  -
                </button>
                <span className="font-serif font-bold text-base w-4 text-center text-[#2B2118] dark:text-[#EFE7DA]">{servings}</span>
                <button
                  type="button"
                  onClick={() => setServings((s) => Math.min(12, s + 1))}
                  className="w-8 h-8 rounded border-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#FBF8F1] dark:bg-[#1E1915] text-base font-bold text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] dark:hover:bg-[#27221E] active:translate-y-0.5 transition-all flex items-center justify-center"
                  aria-label="Increase servings"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || ingredients.length === 0}
            className="w-full py-3.5 px-6 bg-[#D98E04] hover:bg-[#c47f03] text-[#2B2118] font-serif font-bold text-lg rounded-[6px_10px_8px_12px] border-1.5 border-[#2B2118] dark:border-[#4E4238] shadow-hard dark:shadow-hard-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? ROTATING_MESSAGES[loadingMessageIndex] : "Cook something up"}
          </button>
        </div>

        {/* Right Column: Recipe Card Result (7 cols) */}
        <div className="lg:col-span-7">
          {recipe ? (
            /* Printed Recipe Card */
            <article className="bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[8px_12px_6px_10px] p-6 sm:p-8 shadow-hard dark:shadow-hard-dark relative animate-fade-in space-y-4">
              {/* Header section */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2118] dark:text-[#EFE7DA] leading-tight">
                    {recipe.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <p className="font-handwriting text-lg text-[#B5502F] dark:text-[#D98E04]">
                      serves {recipe.servings}, about {recipe.cooking_time} min
                    </p>
                    {recipe.estimated_food_saved_grams && recipe.estimated_food_saved_grams > 0 ? (
                      <span className="font-handwriting text-base text-[#7A8B69] dark:text-[#7A8B69] -rotate-1">
                        • saves about {recipe.estimated_food_saved_grams} g
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Calorie stamp badge */}
                {recipe.calories && (
                  <div className="border border-dashed border-[#2B2118] dark:border-[#4E4238] px-2.5 py-1 text-xs font-mono tracking-widest uppercase self-start rounded-[3px_5px_4px_3px] text-[#2B2118]/80 dark:text-[#EFE7DA]/80 bg-[#F6F0E4]/60 dark:bg-[#1E1915]/60">
                    {recipe.calories} kcal / serving
                  </div>
                )}
              </div>

              {/* Double Rule */}
              <div className="double-rule my-3 text-[#2B2118] dark:text-[#4E4238]" />

              {/* Description */}
              {recipe.description && (
                <p className="text-sm text-[#2B2118]/90 dark:text-[#EFE7DA]/90 italic leading-relaxed">
                  "{recipe.description}"
                </p>
              )}

              {/* Two-part layout: Ingredients (Left) and Steps (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                {/* Ingredients column */}
                <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-[#2B2118]/20 dark:border-[#4E4238] pb-6 md:pb-0 md:pr-4">
                  <h3 className="font-serif font-bold text-base text-[#2B2118] dark:text-[#EFE7DA] mb-3 uppercase tracking-wide">
                    Ingredients
                  </h3>
                  <ul className="space-y-1.5 notebook-ruled text-xs sm:text-sm">
                    {recipe.ingredients.map((ing, idx) => {
                      const isChecked = checkedIngredients[idx];
                      return (
                        <li
                          key={idx}
                          onClick={() => toggleIngredientCheck(idx)}
                          className="flex items-center gap-2.5 cursor-pointer py-1 group select-none"
                        >
                          <span
                            className={`w-4 h-4 rounded-sm border-1.5 border-[#2B2118] dark:border-[#EFE7DA] flex items-center justify-center shrink-0 transition-colors ${
                              isChecked ? "bg-[#7A8B69] text-[#FBF8F1]" : "bg-transparent"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span
                            className={`transition-colors ${
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

                {/* Method / Steps column */}
                <div className="md:col-span-7">
                  <h3 className="font-serif font-bold text-base text-[#2B2118] dark:text-[#EFE7DA] mb-3 uppercase tracking-wide">
                    Method
                  </h3>
                  <ol className="space-y-4">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed text-[#2B2118] dark:text-[#EFE7DA]">
                        <span className="font-serif text-lg font-bold text-[#B5502F] dark:text-[#D98E04] leading-none shrink-0 w-5">
                          {idx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Feature 4: Substitutions block ("Missing something?") */}
              {recipe.substitutions && recipe.substitutions.length > 0 && (
                <div className="mt-4 p-4 border border-dashed border-[#2B2118]/50 dark:border-[#4E4238] rounded-[6px_8px_6px_8px] bg-[#F6F0E4]/70 dark:bg-[#1E1915]/60">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#2B2118] dark:text-[#EFE7DA]">
                      Missing something?
                    </h4>
                    <span className="font-handwriting text-sm text-[#B5502F] dark:text-[#D98E04] -rotate-1">
                      easy kitchen swaps
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#2B2118]/80 dark:text-[#EFE7DA]/80 font-mono">
                    {recipe.substitutions.map((sub, i) => (
                      <li key={i} className="flex items-baseline gap-1.5">
                        <span className="text-[#B5502F] dark:text-[#D98E04]">›</span>
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Card Bottom Actions */}
              <div className="mt-6 pt-4 border-t-1.5 border-[#2B2118]/30 dark:border-[#4E4238] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSaveFavorite}
                  disabled={isFavorited}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-[4px_6px_5px_4px] border-1.5 border-[#2B2118] dark:border-[#4E4238] transition-all ${
                    isFavorited
                      ? "bg-[#7A8B69] text-[#FBF8F1] cursor-default"
                      : "bg-[#FBF8F1] dark:bg-[#1E1915] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] active:translate-y-0.5"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`} />
                  <span>{isFavorited ? "Saved in notebook" : "Keep this one"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-[4px_6px_5px_4px] border-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#FBF8F1] dark:bg-[#1E1915] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] active:translate-y-0.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try another</span>
                </button>
              </div>
            </article>
          ) : (
            /* Empty State */
            <div className="border-1.5 border-dashed border-[#2B2118]/40 dark:border-[#4E4238] rounded-[8px_12px_6px_10px] p-12 text-center bg-[#F6F0E4]/30 dark:bg-[#27221E]/30 min-h-[380px] flex flex-col items-center justify-center">
              <p className="font-serif text-xl font-medium text-[#2B2118]/70 dark:text-[#EFE7DA]/70">
                Nothing here yet. Your fridge is a mystery.
              </p>
              <p className="font-handwriting text-2xl text-[#7A8B69] dark:text-[#D98E04] mt-2 -rotate-1">
                add a few ingredients on the left and hit cook.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
