import {
  Download,
  Eye,
  Heart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { type Template } from "@/lib/catalog";

type TemplateCardProps = {
  template: Template;
  isFavorite?: boolean;
  onToggleFavorite?: (
    template: Template,
  ) => void;
  onPreview?: (
    template: Template,
  ) => void;
  onDownload?: (
    template: Template,
    format: "pdf" | "pptx",
  ) => void;
};

export function TemplateCard({
  template,
  isFavorite = false,
  onToggleFavorite,
  onPreview,
  onDownload,
}: TemplateCardProps) {
  return (
    <article
      className="
        group
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-card
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-primary/50
        hover:shadow-xl
      "
    >
      {/* Preview WEBP */}
      <div
        className="relative aspect-[16/10] cursor-pointer overflow-hidden bg-muted"
        onClick={() =>
          onPreview?.(template)
        }
      >
        {template.preview_url ? (
          <img
            src={template.preview_url}
            alt={`Preview of ${template.name}`}
            loading="lazy"
            className="
              h-full
              w-full
              object-cover
              transition-transform
              duration-500
              group-hover:scale-105
            "
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        )}

        {/* Preview overlay */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-black/45
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
          "
        >
          <span
            className="
              inline-flex
              items-center
              gap-2
              rounded-md
              bg-background/90
              px-4
              py-2
              text-sm
              font-medium
              text-foreground
              shadow-lg
              backdrop-blur-sm
            "
          >
            <Eye className="h-4 w-4" />
            Aperçu
          </span>
        </div>

        {/* Favorite */}
        {onToggleFavorite && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="
              absolute
              right-3
              top-3
              rounded-full
              bg-background/90
              backdrop-blur-sm
            "
            onClick={(event) => {
              event.stopPropagation();

              onToggleFavorite(
                template,
              );
            }}
            aria-label={
              isFavorite
                ? "Retirer des favoris"
                : "Ajouter aux favoris"
            }
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorite
                  ? "fill-current"
                  : ""
              }`}
            />
          </Button>
        )}
      </div>

      {/* Informations / actions */}
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold">
            {template.name}
          </h3>

          {template.code && (
            <p className="mt-1 text-xs text-muted-foreground">
              {template.code}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            disabled={!template.pdf_url}
            onClick={() =>
              onDownload?.(
                template,
                "pdf",
              )
            }
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>

          <Button
            type="button"
            size="sm"
            className="flex-1 gap-2"
            disabled={!template.pptx_url}
            onClick={() =>
              onDownload?.(
                template,
                "pptx",
              )
            }
          >
            <Download className="h-4 w-4" />
            PPTX
          </Button>
        </div>
      </div>
    </article>
  );
}