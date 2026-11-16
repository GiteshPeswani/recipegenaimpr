export const Footer = () => {
  return (
    <footer className="border-t-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#F6F0E4] dark:bg-[#1E1915] mt-16 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#2B2118]/70 dark:text-[#EFE7DA]/70 font-mono">
        <p>
          RecipeGenie — hand-crafted kitchen notebook
        </p>
        <p className="font-handwriting text-base text-[#7A8B69] dark:text-[#D98E04] -rotate-1">
          zero wasted ingredients
        </p>
      </div>
    </footer>
  );
};
