import { getRequestHeader } from "@tanstack/react-start/server";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
  isAdmin?: boolean;
};

type WhopJwtPayload = {
  sub?: string;
  user_id?: string;
  exp?: number;
};

const WHOP_PRODUCT_ID =
  process.env["WHOP_PRODUCT_ID"] ??
  "prod_JklFk53fvcISG";

/**
 * ADMIN LOCAL UNIQUEMENT
 *
 * Cet ID doit être présent uniquement dans .env.local.
 * Il n'est jamais envoyé au frontend.
 */
const LOCAL_ADMIN_WHOP_USER_ID =
  process.env["SMART_POINT_LOCAL_ADMIN_WHOP_USER_ID"];

/**
 * Vérifie que la requête vient réellement de notre
 * environnement de développement local.
 *
 * IMPORTANT :
 * En production, même si quelqu'un connaît l'ID admin,
 * cette fonction ne pourra jamais activer le mode admin.
 */
function isLocalDevelopmentRequest(): boolean {
  const nodeEnv =
    process.env["NODE_ENV"];

  if (nodeEnv !== "development") {
    return false;
  }

  const host =
    getRequestHeader("host") ??
    "";

  const hostname =
    (
      host
        .split(":")[0] ??
      ""
    ).toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

/**
 * Résout l'identité admin locale.
 *
 * Aucun abonnement Whop n'est requis en local pour l'admin.
 */
function resolveLocalAdmin(): WhopIdentity | null {
  if (!isLocalDevelopmentRequest()) {
    return null;
  }

  if (!LOCAL_ADMIN_WHOP_USER_ID) {
    return null;
  }

  return {
    id: LOCAL_ADMIN_WHOP_USER_ID,
    name: "Smart Point Admin",
    plan: "Admin",
    isAdmin: true,
  };
}

function decodeJwtPayload(
  token: string,
): WhopJwtPayload | null {
  try {
    const parts =
      token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payloadPart =
      parts[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload =
      payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddedPayload =
      normalizedPayload +
      "=".repeat(
        (4 -
          (normalizedPayload.length % 4)) %
          4,
      );

    const decodedPayload =
      Buffer.from(
        paddedPayload,
        "base64",
      ).toString("utf8");

    return JSON.parse(
      decodedPayload,
    ) as WhopJwtPayload;
  } catch {
    return null;
  }
}

async function getWhopUser(
  userId: string,
  apiKey: string,
): Promise<{
  id: string;
  name: string;
} | null> {
  try {
    const response =
      await fetch(
        `https://api.whop.com/api/v5/app/users/${encodeURIComponent(
          userId,
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
        },
      );

    if (!response.ok) {
      console.error(
        `[Smart Point] Whop user lookup failed: ${response.status}`,
      );

      return null;
    }

    const user =
      (await response.json()) as {
        id?: string;
        username?: string;
        name?: string;
      };

    return {
      id: user.id ?? userId,
      name:
        user.username ??
        user.name ??
        "Member",
    };
  } catch (error) {
    console.error(
      "[Smart Point] Whop user lookup failed:",
      error,
    );

    return null;
  }
}

/**
 * Vérifie si un utilisateur possède un abonnement
 * actif au produit Smart Point.
 *
 * IMPORTANT :
 * Cette fonction n'est PAS utilisée pour bloquer
 * l'accès à l'interface publique.
 *
 * Elle est destinée aux actions protégées comme
 * le téléchargement des fichiers.
 */
export async function hasWhopProductAccess(
  userId: string,
  apiKey: string,
): Promise<boolean> {
  try {
    const response =
      await fetch(
        `https://api.whop.com/api/v5/memberships?user_id=${encodeURIComponent(
          userId,
        )}&product_id=${encodeURIComponent(
          WHOP_PRODUCT_ID,
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            "Content-Type":
              "application/json",
          },
        },
      );

    if (!response.ok) {
      const text =
        await response.text();

      console.error(
        `[Smart Point] Whop membership check failed: ${response.status}`,
        text,
      );

      return false;
    }

    const result =
      (await response.json()) as {
        data?: Array<{
          status?: string;
        }>;
      };

    const memberships =
      result.data ?? [];

    return memberships.some(
      (membership) => {
        const status =
          membership.status?.toLowerCase();

        return (
          status === "active" ||
          status === "trialing" ||
          status === "completed"
        );
      },
    );
  } catch (error) {
    console.error(
      "[Smart Point] Whop membership verification failed:",
      error,
    );

    return false;
  }
}

export async function resolveWhopIdentity(): Promise<WhopIdentity | null> {
  /**
   * ============================================================
   * 1. ADMIN LOCAL
   * ============================================================
   *
   * Cette branche est volontairement exécutée AVANT Whop.
   *
   * Elle ne fonctionne que :
   * - NODE_ENV=development
   * - host = localhost / 127.0.0.1 / ::1
   * - SMART_POINT_LOCAL_ADMIN_WHOP_USER_ID existe
   *
   * Donc aucun bypass admin en production.
   */
  const localAdmin =
    resolveLocalAdmin();

  if (localAdmin) {
    console.log(
      "[Smart Point] Local admin access granted.",
    );

    return localAdmin;
  }

  /**
   * ============================================================
   * 2. UTILISATEUR WHOP NORMAL
   * ============================================================
   *
   * Ici, Whop sert uniquement à identifier l'utilisateur.
   *
   * L'abonnement n'est PAS vérifié ici.
   *
   * Cela permet :
   * - accès public au catalogue
   * - accès public aux aperçus
   * - consultation sans abonnement
   *
   * La vérification de l'abonnement doit être effectuée
   * uniquement lorsqu'une action protégée est demandée,
   * notamment le téléchargement.
   */
  const token =
    getRequestHeader(
      "x-whop-user-token",
    ) ??
    getRequestHeader(
      "X-Whop-User-Token",
    );

  if (!token) {
    console.error(
      "[Smart Point] Missing x-whop-user-token.",
    );

    return null;
  }

  const apiKey =
    process.env["WHOP_API_KEY"];

  if (!apiKey) {
    console.error(
      "[Smart Point] WHOP_API_KEY is missing.",
    );

    return null;
  }

  const jwtPayload =
    decodeJwtPayload(token);

  if (!jwtPayload) {
    console.error(
      "[Smart Point] Invalid Whop token.",
    );

    return null;
  }

  if (
    jwtPayload.exp &&
    jwtPayload.exp * 1000 <
      Date.now()
  ) {
    console.error(
      "[Smart Point] Whop token has expired.",
    );

    return null;
  }

  const userId =
    jwtPayload.sub ??
    jwtPayload.user_id;

  if (!userId) {
    console.error(
      "[Smart Point] Whop token does not contain a user ID.",
    );

    return null;
  }

  const user =
    await getWhopUser(
      userId,
      apiKey,
    );

  if (!user) {
    return null;
  }

  /**
   * IMPORTANT :
   * Aucun contrôle de membership ici.
   *
   * Tout utilisateur Whop authentifié peut donc
   * consulter l'application.
   *
   * Le contrôle d'abonnement reste disponible via
   * hasWhopProductAccess() pour les téléchargements.
   */
  return {
    id: user.id,
    name: user.name,
    plan: "Whop User",
    isAdmin: false,
  };
}

