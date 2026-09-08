/** Minimal stubs so `tsc --noEmit` works without installing react-native. */
declare module 'react-native' {
  export const NativeModules: Record<string, unknown>;
  export const Platform: {
    select: <T>(specifics: { ios?: T; android?: T; default?: T }) => T | undefined;
  };
}
