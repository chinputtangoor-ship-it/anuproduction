export const FEATURE_FLAG_KEYS = [
  "realtime",
  "pwa_install_banner",
  "single_session",
  "swr_client_cache",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagMeta = {
  key: FeatureFlagKey;
  labelKey: string;
  descriptionKey: string;
  defaultEnabled: boolean;
};

/** Defaults used before DB load / if a row is missing. */
export const FEATURE_REGISTRY: FeatureFlagMeta[] = [
  {
    key: "realtime",
    labelKey: "features.realtime",
    descriptionKey: "features.realtime_desc",
    defaultEnabled: false,
  },
  {
    key: "pwa_install_banner",
    labelKey: "features.pwa_banner",
    descriptionKey: "features.pwa_banner_desc",
    defaultEnabled: true,
  },
  {
    key: "single_session",
    labelKey: "features.single_session",
    descriptionKey: "features.single_session_desc",
    defaultEnabled: true,
  },
  {
    key: "swr_client_cache",
    labelKey: "features.swr",
    descriptionKey: "features.swr_desc",
    defaultEnabled: true,
  },
];

export function defaultFlagMap(): Record<FeatureFlagKey, boolean> {
  return FEATURE_REGISTRY.reduce(
    (acc, f) => {
      acc[f.key] = f.defaultEnabled;
      return acc;
    },
    {} as Record<FeatureFlagKey, boolean>,
  );
}

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(key);
}
