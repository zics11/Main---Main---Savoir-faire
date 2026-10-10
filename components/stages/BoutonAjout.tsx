import { PlusIcon } from "lucide-react";

/** « Ajouter une date », « Ajouter un moment » : le même bouton en pointillés. */
export function BoutonAjout({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 rounded-sm border border-dashed border-primary/50 px-3.5 py-2 text-sm font-medium text-primary hover:bg-accent"
    >
      <PlusIcon aria-hidden className="h-4 w-4" />
      {children}
    </button>
  );
}
