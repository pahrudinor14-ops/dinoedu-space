type AssuranceLevel = "aal1" | "aal2";

interface AssuranceClient {
  auth: {
    mfa: {
      getAuthenticatorAssuranceLevel(jwt?: string): Promise<{
        data: {
          currentLevel: AssuranceLevel | null;
          nextLevel: AssuranceLevel | null;
        } | null;
        error: unknown;
      }>;
    };
  };
}

type JsonResponse = (body: unknown, status?: number) => Response;

/**
 * Enforce the user's opted-in MFA step-up before sensitive server actions.
 * Returns null when the current JWT satisfies the required assurance level.
 */
export async function requireMfaStepUp(
  authClient: AssuranceClient,
  jwt: string,
  jsonResponse: JsonResponse,
): Promise<Response | null> {
  try {
    const { data, error } = await authClient.auth.mfa
      .getAuthenticatorAssuranceLevel(jwt);

    if (error || !data) {
      console.error("Status autentikasi MFA tidak dapat diverifikasi.");
      return jsonResponse(
        { error: "Status autentikasi tidak dapat diverifikasi. Coba lagi." },
        503,
      );
    }

    if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      return jsonResponse(
        {
          error: "Verifikasi MFA diperlukan sebelum melanjutkan.",
          code: "mfa_required",
        },
        403,
      );
    }

    return null;
  } catch {
    console.error("Pemeriksaan level autentikasi MFA gagal.");
    return jsonResponse(
      { error: "Status autentikasi tidak dapat diverifikasi. Coba lagi." },
      503,
    );
  }
}
