export function escapeNonLatin1(source: string): string;

export function escapeNonLatin1Plugin(): {
  name: string;
  setup: (build: {
    initialOptions: { outfile?: string };
    onEnd: (
      callback: (result: { errors: readonly unknown[] }) => Promise<void>
    ) => void;
  }) => void;
};
