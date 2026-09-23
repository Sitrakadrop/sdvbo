import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { type Template } from "@/lib/catalog";

type PreviewDialogProps = {
  template: Template | null;
  onOpenChange: (open: boolean) => void;
  onDownload?: (
    template: Template,
    format: "pdf" | "pptx",
  ) => void;
};

const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] || "";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";

const PREVIEW_FUNCTION = "preview-pdf";

/*
 * Temps maximum d'attente pour la fonction Supabase.
 * Cela évite que "Chargement de l'aperçu..." reste
 * affiché indéfiniment.
 */
const PREVIEW_TIMEOUT = 20_000;

export function PreviewDialog({
  template,
  onOpenChange,
  onDownload,
}: PreviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [iframeLoading, setIframeLoading] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    let objectUrl: string | null = null;

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, PREVIEW_TIMEOUT);

    async function loadPdf() {
      /*
       * Aucun template sélectionné.
       */
      if (!template) {
        setPdfUrl(null);
        setError(null);
        setLoading(false);
        setIframeLoading(false);

        window.clearTimeout(timeoutId);

        return;
      }

      /*
       * Réinitialisation avant chaque chargement.
       */
      setPdfUrl(null);
      setError(null);
      setLoading(true);
      setIframeLoading(false);

      /*
       * Identification du template.
       */
      const templateId =
        template.id ??
        template.template_id ??
        template.code;

      if (!templateId) {
        setLoading(false);

        setError(
          "Impossible d'identifier ce template.",
        );

        window.clearTimeout(timeoutId);

        return;
      }

      /*
       * Vérification de la configuration Supabase.
       */
      if (!SUPABASE_URL) {
        setLoading(false);

        setError(
          "La configuration Supabase est manquante. Vérifie VITE_SUPABASE_URL dans .env.local.",
        );

        window.clearTimeout(timeoutId);

        return;
      }

      if (!SUPABASE_PUBLISHABLE_KEY) {
        setLoading(false);

        setError(
          "La clé publique Supabase est manquante. Vérifie VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local.",
        );

        window.clearTimeout(timeoutId);

        return;
      }

      try {
        /*
         * URL de la fonction Edge Supabase.
         */
        const endpoint =
          `${SUPABASE_URL}/functions/v1/${PREVIEW_FUNCTION}` +
          `?template_id=${encodeURIComponent(
            String(templateId),
          )}`;

        console.info(
          "[Smart Point] Chargement aperçu PDF:",
          endpoint,
        );

        /*
         * Appel de la fonction preview-pdf.
         */
        const response = await fetch(endpoint, {
          method: "GET",

          signal: controller.signal,

          headers: {
            Accept: "application/pdf",

            apikey: SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
        });

        /*
         * Vérification HTTP.
         */
        if (!response.ok) {
          let message =
            `Impossible de charger l'aperçu PDF (${response.status}).`;

          try {
            const contentType =
              response.headers.get(
                "content-type",
              ) || "";

            /*
             * Erreur JSON Supabase.
             */
            if (
              contentType
                .toLowerCase()
                .includes("application/json")
            ) {
              const data =
                await response.json();

              if (
                typeof data?.error === "string"
              ) {
                message = data.error;
              } else if (
                typeof data?.message === "string"
              ) {
                message = data.message;
              }
            } else {
              /*
               * Erreur texte.
               */
              const text =
                await response.text();

              if (text.trim()) {
                message = text.trim();
              }
            }
          } catch {
            /*
             * Garder le message HTTP par défaut.
             */
          }

          throw new Error(message);
        }

        /*
         * Vérification du Content-Type.
         */
        const contentType =
          response.headers.get(
            "content-type",
          ) || "";

        console.info(
          "[Smart Point] Content-Type aperçu:",
          contentType,
        );

        if (
          !contentType
            .toLowerCase()
            .includes("application/pdf")
        ) {
          /*
           * Certains serveurs peuvent retourner
           * application/octet-stream.
           *
           * On vérifie alors les premiers octets
           * du fichier avant de déclarer l'erreur.
           */
          const rawBlob =
            await response.blob();

          if (rawBlob.size === 0) {
            throw new Error(
              "Le serveur a retourné un fichier PDF vide.",
            );
          }

          const headerBuffer =
            await rawBlob.slice(0, 5).arrayBuffer();

          const headerBytes =
            new Uint8Array(headerBuffer);

          const header = String.fromCharCode(
            ...headerBytes,
          );

          if (header !== "%PDF-") {
            throw new Error(
              `Le serveur n'a pas retourné un PDF valide (Content-Type: ${contentType || "inconnu"}).`,
            );
          }

          /*
           * Le fichier est bien un PDF malgré
           * le Content-Type incorrect.
           */
          objectUrl =
            URL.createObjectURL(
              new Blob([rawBlob], {
                type: "application/pdf",
              }),
            );
        } else {
          /*
           * Lecture normale du PDF.
           */
          const blob =
            await response.blob();

          if (blob.size === 0) {
            throw new Error(
              "Le fichier PDF retourné est vide.",
            );
          }

          objectUrl =
            URL.createObjectURL(
              new Blob([blob], {
                type: "application/pdf",
              }),
            );
        }

        /*
         * Vérifier que le composant est toujours actif.
         */
        if (cancelled) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }

          return;
        }

        /*
         * On possède maintenant une vraie URL PDF.
         */
        setPdfUrl(objectUrl);

        setIframeLoading(true);

        console.info(
          "[Smart Point] Aperçu PDF prêt.",
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "[Smart Point] PDF preview error:",
          err,
        );

        /*
         * Cas particulier du timeout.
         */
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          /*
           * Si un pdf_url public existe, on essaye
           * comme solution de secours.
           */
          if (
            template.pdf_url &&
            typeof template.pdf_url ===
              "string"
          ) {
            console.warn(
              "[Smart Point] preview-pdf timeout. Tentative avec pdf_url.",
            );

            setPdfUrl(template.pdf_url);

            setIframeLoading(true);

            setError(null);

            return;
          }

          setError(
            "Le serveur d'aperçu PDF ne répond pas après 20 secondes. Vérifie la fonction Supabase « preview-pdf ».",
          );

          return;
        }

        /*
         * Si preview-pdf échoue mais qu'un
         * pdf_url existe, tentative directe.
         */
        if (
          template.pdf_url &&
          typeof template.pdf_url ===
            "string" &&
          template.pdf_url.trim()
        ) {
          console.warn(
            "[Smart Point] Échec preview-pdf. Tentative avec pdf_url.",
          );

          setPdfUrl(template.pdf_url);

          setIframeLoading(true);

          setError(null);

          return;
        }

        /*
         * Erreur finale.
         */
        setPdfUrl(null);

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger l'aperçu PDF.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;

      controller.abort();

      window.clearTimeout(timeoutId);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [template, retryKey]);

  /*
   * Gestion de fermeture du dialogue.
   */
  function handleOpenChange(open: boolean) {
    if (!open) {
      setPdfUrl(null);

      setError(null);

      setLoading(false);

      setIframeLoading(false);

      setRetryKey(0);
    }

    onOpenChange(open);
  }

  /*
   * Relancer manuellement l'aperçu.
   */
  function handleRetry() {
    setPdfUrl(null);

    setError(null);

    setLoading(true);

    setIframeLoading(false);

    setRetryKey((value) => value + 1);
  }

  /*
   * Aucun template.
   */
  if (!template) {
    return null;
  }

  /*
   * Nom du template.
   */
  const templateName =
    template.name ||
    "Template Smart Point";

  /*
   * Code du template.
   */
  const templateCode =
    template.code ??
    template.template_id ??
    "";

  /*
   * Disponibilité des fichiers.
   */
  const hasPdf =
    Boolean(template.pdf_url);

  const hasPptx =
    Boolean(template.pptx_url);

  return (
    <Dialog
      open={Boolean(template)}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        className="
          flex
          h-[95vh]
          w-[96vw]
          max-w-7xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-border
          bg-background
          p-0
        "
      >
        {/* =====================================================
            HEADER
        ====================================================== */}
        <DialogHeader
          className="
            flex
            shrink-0
            flex-row
            items-center
            justify-between
            gap-4
            border-b
            border-border
            px-5
            py-4
            pr-14
          "
        >
          <div className="min-w-0">
            <DialogTitle
              className="
                truncate
                text-base
                font-semibold
                sm:text-lg
              "
            >
              {templateName}
            </DialogTitle>

            <DialogDescription
              className="
                mt-1
                truncate
                text-xs
                text-muted-foreground
              "
            >
              {templateCode
                ? `Template ${templateCode}`
                : "Aperçu du template"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* =====================================================
            ZONE PREVIEW
        ====================================================== */}
        <div
          className="
            relative
            min-h-0
            flex-1
            overflow-hidden
            bg-muted/30
          "
        >
          {/* ---------------------------------------------------
              CHARGEMENT INITIAL
          ---------------------------------------------------- */}
          {loading && (
            <div
              className="
                absolute
                inset-0
                z-20
                flex
                flex-col
                items-center
                justify-center
                gap-4
                bg-background
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-primary/10
                "
              >
                <Loader2
                  className="
                    h-8
                    w-8
                    animate-spin
                    text-primary
                  "
                />
              </div>

              <div className="text-center">
                <p
                  className="
                    text-sm
                    font-medium
                  "
                >
                  Chargement de l'aperçu...
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Préparation du PDF
                </p>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------
              CHARGEMENT DE L'IFRAME
          ---------------------------------------------------- */}
          {iframeLoading &&
            !loading &&
            !error &&
            pdfUrl && (
              <div
                className="
                  absolute
                  inset-0
                  z-10
                  flex
                  flex-col
                  items-center
                  justify-center
                  gap-3
                  bg-background/90
                "
              >
                <Loader2
                  className="
                    h-7
                    w-7
                    animate-spin
                    text-primary
                  "
                />

                <p
                  className="
                    text-sm
                    text-muted-foreground
                  "
                >
                  Affichage du PDF...
                </p>
              </div>
            )}

          {/* ---------------------------------------------------
              ERREUR
          ---------------------------------------------------- */}
          {error && !loading && (
            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                gap-5
                px-6
                text-center
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-destructive/10
                  text-destructive
                "
              >
                <FileText
                  className="
                    h-8
                    w-8
                  "
                />
              </div>

              <div className="max-w-lg">
                <h3
                  className="
                    text-base
                    font-semibold
                  "
                >
                  Aperçu indisponible
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {error}
                </p>
              </div>

              {!hasPdf && (
                <p
                  className="
                    max-w-md
                    text-xs
                    text-muted-foreground
                  "
                >
                  Aucun fichier PDF n'est
                  actuellement associé à ce
                  template.
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleRetry}
              >
                <RefreshCw
                  className="h-4 w-4"
                />

                Réessayer
              </Button>
            </div>
          )}

          {/* ---------------------------------------------------
              PDF
          ---------------------------------------------------- */}
          {pdfUrl &&
            !loading &&
            !error && (
              <iframe
                src={pdfUrl}
                title={`Aperçu PDF de ${templateName}`}
                className="
                  h-full
                  w-full
                  border-0
                  bg-white
                "
                onLoad={() => {
                  setIframeLoading(false);
                }}
                onError={() => {
                  setIframeLoading(false);

                  setPdfUrl(null);

                  setError(
                    "Le navigateur n'a pas réussi à afficher ce fichier PDF.",
                  );
                }}
              />
            )}
        </div>

        {/* =====================================================
            FOOTER
        ====================================================== */}
        <div
          className="
            flex
            shrink-0
            flex-col
            gap-3
            border-t
            border-border
            bg-background
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          {/* ---------------------------------------------------
              INFORMATIONS TEMPLATE
          ---------------------------------------------------- */}
          <div className="min-w-0">
            <p
              className="
                truncate
                text-sm
                font-medium
              "
            >
              {templateName}
            </p>

            <p
              className="
                text-xs
                text-muted-foreground
              "
            >
              Choisissez le format à
              télécharger
            </p>
          </div>

          {/* ---------------------------------------------------
              BOUTONS DOWNLOAD
          ---------------------------------------------------- */}
          <div
            className="
              flex
              w-full
              gap-2
              sm:w-auto
            "
          >
            {/* PDF */}
            <Button
              type="button"
              variant="outline"
              className="
                flex-1
                gap-2
                sm:flex-none
              "
              disabled={
                !hasPdf ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pdf",
                )
              }
            >
              <Download
                className="h-4 w-4"
              />

              PDF
            </Button>

            {/* PPTX */}
            <Button
              type="button"
              className="
                flex-1
                gap-2
                sm:flex-none
              "
              disabled={
                !hasPptx ||
                !onDownload
              }
              onClick={() =>
                onDownload?.(
                  template,
                  "pptx",
                )
              }
            >
              <Download
                className="h-4 w-4"
              />

              PPTX
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}