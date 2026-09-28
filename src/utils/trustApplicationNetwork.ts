export type NetworkTypeCode = "V" | "W";

export interface TrustApplicationNetworkOptionLike {
  ReferenceID?: number | string | null;
  Type?: string | null;
  NetworkType?: string | null;
  NetworkName?: string | null;
  ReferralCode?: string | null;
}

export interface TrustApplicationNetworkSnapshotLike {
  ReferenceID?: number | string | null;
  NetworkType?: string | null;
  NetworkName?: string | null;
  ReferralCode?: string | null;
}

export interface SubmissionNetworkSelectOption {
  value: string;
  label: string;
  networkType: NetworkTypeCode;
  networkName: string;
  referralCode: string;
}

export function mapSubmissionNetworkOptions(options: TrustApplicationNetworkOptionLike[] | undefined | null): SubmissionNetworkSelectOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      const networkType = normalizeNetworkType(option.NetworkType ?? option.Type);
      const referenceId = normalizeReferenceId(option.ReferenceID);
      if (!networkType || !referenceId) return null;

      const networkName = formatSubmissionNetworkName(networkType, option.NetworkName);
      const referralCode = String(option.ReferralCode ?? "").trim();

      return {
        value: referenceId,
        label: formatSubmissionNetworkLabel({ networkType, networkName, referralCode }, true),
        networkType,
        networkName,
        referralCode
      };
    })
    .filter((option): option is SubmissionNetworkSelectOption => Boolean(option));
}

export function formatSubmissionNetworkName(networkType?: string | null, networkName?: string | null) {
  const explicitName = String(networkName ?? "").trim();
  if (explicitName) return explicitName;

  const normalizedType = normalizeNetworkType(networkType);
  if (normalizedType === "V") return "The Trust";
  if (normalizedType === "W") return "The Will";
  return "";
}

export function formatSubmissionNetworkLabel(
  network: { networkType?: string | null; networkName?: string | null; referralCode?: string | null },
  includeReferralCode = false
) {
  const networkType = normalizeNetworkType(network.networkType);
  const networkName = formatSubmissionNetworkName(networkType, network.networkName);
  const referralCode = String(network.referralCode ?? "").trim();
  const nameWithType = networkName && networkType ? `${networkName} (${networkType})` : networkName || (networkType ? `(${networkType})` : "");

  if (includeReferralCode && referralCode) return `${nameWithType} - ${referralCode}`;
  return nameWithType;
}

export function getSubmissionNetworkSnapshotDisplay(network?: TrustApplicationNetworkSnapshotLike | null) {
  if (!network) {
    return {
      networkTree: "",
      referralCode: ""
    };
  }

  return {
    networkTree: formatSubmissionNetworkLabel({
      networkType: network.NetworkType,
      networkName: network.NetworkName,
      referralCode: network.ReferralCode
    }),
    referralCode: String(network.ReferralCode ?? "").trim()
  };
}

export function parseSubmissionNetworkReferenceId(value: string | number | null | undefined): number | null {
  const referenceId = Number(value);
  return Number.isFinite(referenceId) && referenceId > 0 ? referenceId : null;
}

export function hasSubmissionNetworkSnapshot(network?: TrustApplicationNetworkSnapshotLike | null) {
  if (!network) return false;
  return Boolean(normalizeReferenceId(network.ReferenceID) || network.NetworkType || network.NetworkName || network.ReferralCode);
}

function normalizeNetworkType(value: string | null | undefined): NetworkTypeCode | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "V" || normalized === "W" ? normalized : "";
}

function normalizeReferenceId(value: number | string | null | undefined) {
  const referenceId = Number(value);
  return Number.isFinite(referenceId) && referenceId > 0 ? String(referenceId) : "";
}
