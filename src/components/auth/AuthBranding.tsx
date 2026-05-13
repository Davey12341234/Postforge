import Image from "next/image";

/** Shared logo + title row for auth flows (keeps pages visually aligned on small screens). */
export function AuthBranding({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Image
        src="/bbgpt-logo.png"
        alt="bbGPT"
        width={72}
        height={72}
        priority
        style={{ width: "auto", height: "auto" }}
        className="drop-shadow-[0_0_26px_rgba(167,243,208,0.35)]"
      />
      <h1 className="max-w-[20ch] text-center text-base font-semibold leading-snug text-zinc-100 sm:text-lg">{title}</h1>
    </div>
  );
}
