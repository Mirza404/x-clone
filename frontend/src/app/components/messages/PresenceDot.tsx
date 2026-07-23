interface PresenceDotProps {
  online: boolean;
}

export default function PresenceDot({ online }: PresenceDotProps) {
  if (!online) {
    return null;
  }

  return (
    <span
      aria-label="Online"
      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg bg-green-500"
    />
  );
}
