import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  X,
  Briefcase,
  BarChart3,
  Utensils,
  PieChart,
  HeartPulse,
  Share2,
  Package,
  Rocket,
  Monitor,
  Plane,
  type LucideIcon,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "sonner";

import {
  useWhopUser,
} from "@/components/app-shell";

import {
  PreviewDialog,
} from "@/components/preview-dialog";

import {
  TemplateCard,
} from "@/components/template-card";

import {
  Button,
} from "@/components/ui/button";

import {
  categoriesQuery,
  categoryCountsQuery,
  templatesQuery,
  favoritesQuery,
  toggleFavorite,
  type Category,
  type Template,
} from "@/lib/catalog";


/* =========================================================
   ROUTE
   ========================================================= */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Smart Point — Premium PowerPoint Templates",
      },
      {
        name: "description",
        content:
          "Professional PowerPoint templates for Smart Point members.",
      },
      {
        property: "og:title",
        content:
          "Smart Point — Premium PowerPoint Templates",
      },
      {
        property: "og:description",
        content:
          "Browse professional PowerPoint templates by category.",
      },
      {
        property: "og:type",
        content: "website",
      },
    ],
  }),

  component: HomePage,
});


/* =========================================================
   HERO VIDEO
   ========================================================= */

/**
 * Place the video file here:
 *
 * public/assets/smart-point-hero.mp4
 *
 * If your video has another filename, change only this
 * constant.
 */
const HERO_VIDEO_SRC =
  "/assets/smart-point-hero.mp4";


/* =========================================================
   CATEGORY ORDER
   ========================================================= */

const CATEGORY_ORDER = [
  "BC",
  "DA",
  "FR",
  "IF",
  "MH",
  "PS",
  "PP",
  "SI",
  "TI",
  "TT",
];


/* =========================================================
   CATEGORY NAMES
   ========================================================= */

const CATEGORY_NAMES: Record<
  string,
  string
> = {
  BC:
    "Business & Corporate",

  DA:
    "Data & Analytics",

  FR:
    "Food & Restaurant",

  IF:
    "Infographic",

  MH:
    "Medical & Healthcare",

  PS:
    "Portfolio & Social Media",

  PP:
    "Product Presentation",

  SI:
    "Startup & Investment",

  TI:
    "Technology & IT",

  TT:
    "Travel & Tourism",
};


/* =========================================================
   CATEGORY ICONS
   ========================================================= */

const CATEGORY_ICONS: Record<
  string,
  LucideIcon
> = {
  BC:
    Briefcase,

  DA:
    BarChart3,

  FR:
    Utensils,

  IF:
    PieChart,

  MH:
    HeartPulse,

  PS:
    Share2,

  PP:
    Package,

  SI:
    Rocket,

  TI:
    Monitor,

  TT:
    Plane,
};


/* =========================================================
   CATEGORY HELPERS
   ========================================================= */

function getCategoryCode(
  category: Category,
): string {
  const name =
    category.name
      .trim()
      .toLowerCase();

  const known =
    CATEGORY_ORDER.find(
      (code) =>
        (
          CATEGORY_NAMES[code] ??
          ""
        ).toLowerCase() ===
        name,
    );

  if (known) {
    return known;
  }

  return category.id;
}


/* =========================================================
   CATEGORY TONES
   ========================================================= */

function getCategoryTone(
  category: Category,
): string {
  const code =
    getCategoryCode(category);

  const tones: Record<
    string,
    string
  > = {
    BC:
      "category-blue",

    DA:
      "category-cyan",

    FR:
      "category-orange",

    IF:
      "category-violet",

    MH:
      "category-pink",

    PS:
      "category-magenta",

    PP:
      "category-amber",

    SI:
      "category-green",

    TI:
      "category-indigo",

    TT:
      "category-teal",
  };

  return (
    tones[code] ??
    "category-blue"
  );
}


/* =========================================================
   CATEGORY DESCRIPTION
   ========================================================= */

function getCategoryDescription(
  category: Category,
): string {
  if (category.description) {
    return category.description;
  }

  const code =
    getCategoryCode(category);

  const descriptions: Record<
    string,
    string
  > = {
    BC:
      "Professional business and corporate presentations.",

    DA:
      "Present data, metrics and insights clearly.",

    FR:
      "Modern presentations for food and restaurant projects.",

    IF:
      "Visual infographics and information-rich slides.",

    MH:
      "Professional medical and healthcare presentations.",

    PS:
      "Portfolio, personal brand and social media decks.",

    PP:
      "Present products, offers and features with impact.",

    SI:
      "Startup, pitch deck and investment presentations.",

    TI:
      "Technology, software and IT presentations.",

    TT:
      "Travel, tourism and destination presentations.",
  };

  return (
    descriptions[code] ??
    "Professional PowerPoint templates."
  );
}


/* =========================================================
   CATEGORY ICON
   ========================================================= */

function getCategoryIcon(
  category: Category,
): LucideIcon {
  const code =
    getCategoryCode(category);

  return (
    CATEGORY_ICONS[code] ??
    Briefcase
  );
}


/* =========================================================
   DOWNLOAD
   ========================================================= */

async function downloadTemplate(
  template: Template,
  format: "pdf" | "pptx",
  queryClient: ReturnType<
    typeof useQueryClient
  >,
  userId: string,
) {
  const templateId =
    template.id ??
    template.template_id;

  if (!templateId) {
    toast.error(
      "Impossible d'identifier ce template.",
    );

    return;
  }

  const toastId =
    "smart-point-download";

  try {
    toast.loading(
      `Préparation du ${format.toUpperCase()}...`,
      {
        id: toastId,
      },
    );

    const response =
      await fetch(
        `/api/download?template_id=${encodeURIComponent(
          templateId,
        )}&file_type=${encodeURIComponent(
          format,
        )}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept:
              "application/octet-stream",
          },
        },
      );

    if (!response.ok) {
      let message =
        "Impossible de télécharger ce fichier.";

      try {
        const contentType =
          response.headers.get(
            "content-type",
          );

        if (
          contentType?.includes(
            "application/json",
          )
        ) {
          const data =
            await response.json();

          if (
            typeof data?.message ===
            "string"
          ) {
            message =
              data.message;
          } else if (
            typeof data?.error ===
            "string"
          ) {
            message =
              data.error;
          }
        } else {
          const text =
            await response.text();

          if (text.trim()) {
            message =
              text.trim();
          }
        }
      } catch {
        // Message par défaut conservé.
      }

      throw new Error(message);
    }

    const blob =
      await response.blob();

    if (blob.size === 0) {
      throw new Error(
        "Le fichier téléchargé est vide.",
      );
    }

    const disposition =
      response.headers.get(
        "content-disposition",
      );

    let filename =
      `${templateId}.${format}`;

    const match =
      disposition?.match(
        /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i,
      );

    if (match) {
      try {
        filename =
          decodeURIComponent(
            match[1] ??
              match[2] ??
              filename,
          );
      } catch {
        filename =
          match[1] ??
          match[2] ??
          filename;
      }
    }

    const objectUrl =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      objectUrl;

    anchor.download =
      filename;

    anchor.style.display =
      "none";

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      objectUrl,
    );

    toast.success(
      `${format.toUpperCase()} téléchargé avec succès.`,
      {
        id: toastId,
      },
    );

    await queryClient.invalidateQueries(
      {
        queryKey: [
          "downloads",
          userId,
        ],
      },
    );
  } catch (error) {
    console.error(
      "[Smart Point] download:",
      error,
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Impossible de télécharger le fichier.",
      {
        id: toastId,
      },
    );
  }
}


/* =========================================================
   CATEGORY CARD
   ========================================================= */

function CategoryTile({
  category,
  count,
  active,
  onClick,
}: {
  category: Category;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const Icon =
    getCategoryIcon(category);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "category-tile",
        "group",
        "relative",
        "w-full",
        "overflow-hidden",
        "rounded-xl",
        "border",
        "p-4",
        "text-left",
        "transition-all",
        active
          ? "is-active border-primary/60 bg-primary/10"
          : "border-border bg-surface hover:border-primary/50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">

        <span
          className={[
            "category-icon",
            "grid",
            "h-10",
            "w-10",
            "shrink-0",
            "place-items-center",
            "rounded-lg",
            "text-white",
            getCategoryTone(
              category,
            ),
          ].join(" ")}
        >
          <Icon
            className="h-5 w-5"
            strokeWidth={2}
          />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {category.name}
          </span>

          <span className="mt-1 block text-xs text-muted-foreground">
            {count} template
            {count !== 1
              ? "s"
              : ""}
          </span>
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {getCategoryDescription(
          category,
        )}
      </p>
    </button>
  );
}


/* =========================================================
   TEMPLATE SKELETON
   ========================================================= */

function TemplateSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({
        length: 8,
      }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="aspect-[16/10] animate-pulse bg-muted" />

          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />

            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />

            <div className="flex gap-2">
              <div className="h-9 flex-1 animate-pulse rounded bg-muted" />

              <div className="h-9 flex-1 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


/* =========================================================
   HOME PAGE
   ========================================================= */

function HomePage() {
  const user =
    useWhopUser();

  const queryClient =
    useQueryClient();


  /* -------------------------------------------------------
     STATE
     ------------------------------------------------------- */

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState("newest");

  const [
    preview,
    setPreview,
  ] = useState<
    Template | null
  >(null);

  const [
    showAllCategories,
    setShowAllCategories,
  ] = useState(false);


  /* -------------------------------------------------------
     HEADER SEARCH
     ------------------------------------------------------- */

  useEffect(() => {
    function handleSearch(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<string>;

      setSearch(
        customEvent.detail ?? "",
      );

      setSelectedCategory(
        undefined,
      );
    }

    window.addEventListener(
      "smartpoint:search",
      handleSearch,
    );

    return () => {
      window.removeEventListener(
        "smartpoint:search",
        handleSearch,
      );
    };
  }, []);


  /* -------------------------------------------------------
     SUPABASE QUERIES
     ------------------------------------------------------- */

  const categories =
    useQuery(
      categoriesQuery(),
    );

  const categoryCounts =
    useQuery(
      categoryCountsQuery(),
    );

  const templates =
    useQuery(
      templatesQuery({
        ...(selectedCategory
          ? {
              categoryId:
                selectedCategory,
            }
          : {}),
        search,
        sort,
      }),
    );

  const favorites =
    useQuery(
      favoritesQuery(
        user.id,
      ),
    );


  /* -------------------------------------------------------
     FAVORITE IDS
     ------------------------------------------------------- */

  const favoriteIds =
    useMemo(() => {
      const set =
        new Set<string>();

      for (
        const item of
          favorites.data ??
          []
      ) {
        if (
          item.template_id
        ) {
          set.add(
            String(
              item.template_id,
            ),
          );
        }
      }

      return set;
    }, [favorites.data]);


  /* -------------------------------------------------------
     CATEGORY DISPLAY
     ------------------------------------------------------- */

  const orderedCategories =
    useMemo(() => {
      const list =
        categories.data ??
        [];

      return [...list].sort(
        (a, b) => {
          const aCode =
            getCategoryCode(a);

          const bCode =
            getCategoryCode(b);

          const aIndex =
            CATEGORY_ORDER.indexOf(
              aCode,
            );

          const bIndex =
            CATEGORY_ORDER.indexOf(
              bCode,
            );

          if (
            aIndex === -1 &&
            bIndex === -1
          ) {
            return a.name.localeCompare(
              b.name,
            );
          }

          if (aIndex === -1) {
            return 1;
          }

          if (bIndex === -1) {
            return -1;
          }

          return (
            aIndex - bIndex
          );
        },
      );
    }, [categories.data]);


  const visibleCategories =
    showAllCategories
      ? orderedCategories
      : orderedCategories.slice(
          0,
          10,
        );


  /* -------------------------------------------------------
     ACTIVE CATEGORY
     ------------------------------------------------------- */

  const activeCategory =
    useMemo(() => {
      if (
        !selectedCategory
      ) {
        return null;
      }

      return (
        orderedCategories.find(
          (category) =>
            category.id ===
            selectedCategory,
        ) ?? null
      );
    }, [
      orderedCategories,
      selectedCategory,
    ]);


  /* -------------------------------------------------------
     FAVORITES
     ------------------------------------------------------- */

  async function handleToggleFavorite(
    template: Template,
  ) {
    const templateId =
      template.id ??
      template.template_id;

    if (!templateId) {
      toast.error(
        "Impossible d'identifier ce template.",
      );

      return;
    }

    const isFavorite =
      favoriteIds.has(
        String(templateId),
      );

    try {
      await toggleFavorite(
        user.id,
        String(templateId),
        isFavorite,
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "favorites",
            user.id,
          ],
        },
      );

      toast.success(
        isFavorite
          ? "Retiré des favoris."
          : "Ajouté aux favoris.",
      );
    } catch (error) {
      console.error(
        "[Smart Point] favorite:",
        error,
      );

      toast.error(
        "Impossible de modifier les favoris.",
      );
    }
  }


  /* -------------------------------------------------------
     CATEGORY CLICK
     ------------------------------------------------------- */

  function handleCategoryClick(
    categoryId: string,
  ) {
    setSelectedCategory(
      (current) =>
        current === categoryId
          ? undefined
          : categoryId,
    );

    setSearch("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  /* -------------------------------------------------------
     CLEAR FILTERS
     ------------------------------------------------------- */

  function clearFilters() {
    setSelectedCategory(
      undefined,
    );

    setSearch("");
    setSort("newest");
  }


  /* -------------------------------------------------------
     COUNTS
     ------------------------------------------------------- */

  const totalTemplates =
    useMemo(() => {
      return Object.values(
        categoryCounts.data ??
          {},
      ).reduce(
        (total, count) =>
          total + count,
        0,
      );
    }, [
      categoryCounts.data,
    ]);


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-8 p-4 lg:p-6">

      {/* ===================================================
          HERO
          =================================================== */}

      <section
        className="
          hero-gradient
          hero-depth
          relative
          mx-auto
          min-h-[250px]
          w-full
          max-w-[1100px]
          overflow-hidden
          rounded-2xl
          border
          border-border
          md:min-h-[270px]
        "
      >

        {/* Background glow */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

          <div className="absolute -bottom-40 right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>


        {/* HERO CONTENT + VIDEO */}

        <div className="relative z-10 grid h-full min-h-[250px] grid-cols-1 md:min-h-[270px] md:grid-cols-[42%_58%]">

          {/* =================================================
              TEXT SIDE
              ================================================= */}

          <div className="relative z-20 flex items-center p-5 sm:p-7 lg:p-8">

            <div className="max-w-xl">

              {/* Premium label */}

              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />

                Premium PowerPoint Library
              </div>


              {/* Title */}

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[42px] lg:leading-[1.05]">

                Create presentations

                <span className="block text-primary">
                  that stand out.
                </span>

              </h1>


              {/* Description */}

              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                Explore professional PowerPoint templates designed for business,
                startups, data, technology and more.
              </p>


              {/* Stats */}

              <div className="mt-5 flex flex-wrap gap-2.5">

                <div className="rounded-lg border border-border bg-background/30 px-3.5 py-2 backdrop-blur-sm">

                  <span className="block text-base font-bold">
                    {totalTemplates}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Templates
                  </span>

                </div>


                <div className="rounded-lg border border-border bg-background/30 px-3.5 py-2 backdrop-blur-sm">

                  <span className="block text-base font-bold">
                    {orderedCategories.length}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Categories
                  </span>

                </div>


                <div className="rounded-lg border border-border bg-background/30 px-3.5 py-2 backdrop-blur-sm">

                  <span className="block text-base font-bold">
                    PDF + PPTX
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Formats
                  </span>

                </div>

              </div>

            </div>

          </div>


          {/* =================================================
              VIDEO SIDE
              ================================================= */}

          <div className="relative hidden min-h-[250px] overflow-hidden md:block">

            <video
              src={HERO_VIDEO_SRC}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Smart Point premium PowerPoint templates preview"
              className="
                hero-visual
                absolute
                inset-0
                h-full
                w-full
                object-cover
                object-center
                opacity-95
              "
            />

            {/* Video overlay */}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent" />

          </div>

        </div>

      </section>


      {/* ===================================================
          CATEGORIES
          =================================================== */}

      <section>

        <div className="mb-4 flex items-end justify-between gap-4">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Browse
            </p>

            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Explore categories
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Find the right visual style
              for your presentation.
            </p>

          </div>


          {orderedCategories.length >
            10 && (

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setShowAllCategories(
                  (value) =>
                    !value,
                )
              }
            >

              {showAllCategories
                ? "Show less"
                : "View all"}

            </Button>

          )}

        </div>


        {/* CATEGORY LOADING */}

        {categories.isPending ? (

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            {Array.from({
              length: 10,
            }).map((_, index) => (

              <div
                key={index}
                className="h-[142px] animate-pulse rounded-xl border border-border bg-surface"
              />

            ))}

          </div>

        ) : categories.isError ? (

          <div className="panel p-6">

            <p className="font-semibold">
              Impossible de charger les
              catégories.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Vérifiez la connexion
              Supabase.
            </p>

          </div>

        ) : (

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            {visibleCategories.map(
              (category) => (

                <CategoryTile
                  key={
                    category.id
                  }
                  category={
                    category
                  }
                  count={
                    categoryCounts
                      .data?.[
                      category.id
                    ] ?? 0
                  }
                  active={
                    selectedCategory ===
                    category.id
                  }
                  onClick={() =>
                    handleCategoryClick(
                      category.id,
                    )
                  }
                />

              ),
            )}

          </div>

        )}

      </section>


      {/* ===================================================
          TEMPLATE HEADER
          =================================================== */}

      <section>

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Library
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">

              <h2 className="text-xl font-bold sm:text-2xl">

                {activeCategory
                  ? activeCategory.name
                  : search
                    ? "Search results"
                    : "All templates"}

              </h2>


              {templates.data && (

                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">

                  {
                    templates.data
                      .length
                  }

                </span>

              )}

            </div>


            {activeCategory && (

              <p className="mt-1 text-sm text-muted-foreground">

                {
                  getCategoryDescription(
                    activeCategory,
                  )
                }

              </p>

            )}

          </div>


          <div className="flex flex-wrap items-center gap-2">

            {(search ||
              selectedCategory) && (

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={
                  clearFilters
                }
              >

                <X className="h-4 w-4" />

                Clear filters

              </Button>

            )}


            <div className="relative">

              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value,
                  )
                }
                className="h-9 appearance-none rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus:border-ring"
                aria-label="Sort templates"
              >

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="az">
                  Name A–Z
                </option>

                <option value="za">
                  Name Z–A
                </option>

              </select>

              <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

            </div>

          </div>

        </div>


        {/* SEARCH STATUS */}

        {search && (

          <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">

            <Search className="h-4 w-4 text-primary" />

            <span>
              Results for{" "}
              <strong>
                "{search}"
              </strong>
            </span>

          </div>

        )}


        {/* =================================================
            TEMPLATES
            ================================================= */}

        {templates.isPending ? (

          <TemplateSkeleton />

        ) : templates.isError ? (

          <div className="panel p-8 text-center">

            <h3 className="font-semibold">
              Impossible de charger les
              templates.
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              La connexion entre
              Smart Point et Supabase
              doit être vérifiée.
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() =>
                templates.refetch()
              }
            >
              Réessayer
            </Button>

          </div>

        ) : (

          <>

            {(
              templates.data ??
              []
            ).length === 0 ? (

              <div className="panel p-10 text-center">

                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary">

                  <Search className="h-5 w-5 text-muted-foreground" />

                </div>


                <h3 className="mt-4 font-semibold">
                  Aucun template trouvé
                </h3>


                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Aucun template ne
                  correspond aux
                  filtres actuels.
                </p>


                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={
                    clearFilters
                  }
                >
                  Réinitialiser
                </Button>

              </div>

            ) : (

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

                {(
                  templates.data ??
                  []
                ).map(
                  (template) => {

                    const templateId =
                      template.id ??
                      template.template_id;

                    return (

                      <TemplateCard
                        key={
                          templateId
                        }
                        template={
                          template
                        }
                        isFavorite={favoriteIds.has(
                          String(
                            templateId,
                          ),
                        )}
                        onToggleFavorite={
                          handleToggleFavorite
                        }
                        onPreview={
                          setPreview
                        }
                        onDownload={(
                          item,
                          format,
                        ) =>
                          downloadTemplate(
                            item,
                            format,
                            queryClient,
                            user.id,
                          )
                        }
                      />

                    );

                  },
                )}

              </div>

            )}

          </>

        )}

      </section>


      {/* ===================================================
          PREVIEW DIALOG
          =================================================== */}

      <PreviewDialog
        template={
          preview
        }
        onOpenChange={(
          open,
        ) => {

          if (!open) {
            setPreview(null);
          }

        }}
        onDownload={(
          template,
          format,
        ) =>
          downloadTemplate(
            template,
            format,
            queryClient,
            user.id,
          )
        }
      />

    </div>
  );
}