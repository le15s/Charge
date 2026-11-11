import config from "@/config/config.json";
import TwSizeIndicator from "@/helpers/TwSizeIndicator";
import PwaRegister from "@/components/PwaRegister";
import Providers from "@/partials/Providers";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/instrument-sans/400";
import "@fontsource/instrument-sans/500";
import "@fontsource/instrument-sans/600";
import "@fontsource/instrument-sans/700";
import "@fontsource/permanent-marker/400";
import "@fontsource/instrument-serif/400";
import "@fontsource/instrument-serif/400-italic";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/space-grotesk";
import "@fontsource/big-shoulders-stencil-display/700";
import "@fontsource/big-shoulders-stencil-display/800";
import "@fontsource/big-shoulders-stencil-display/900";
import "@fontsource/special-elite/400";
import "@/styles/main.css";
import { GoogleTagManager } from "@next/third-parties/google";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning={true} lang="en" data-scroll-behavior="smooth">
      {/* google tag manager */}
      {config.google_tag_manager.enable && (
        <GoogleTagManager gtmId={config.google_tag_manager.gtm_id} />
      )}

      {/* head */}
      <head>
        {/* responsive meta */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* phone app */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Charge" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* favicon */}
        <link rel="shortcut icon" href={config.site.favicon} />
        {/* theme meta */}
        <meta name="theme-name" content="charge" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#e6e9ed"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#0c0e11"
        />

      </head>

      {/* body */}
      <body
        suppressHydrationWarning={true}
        className="min-h-screen flex flex-col"
      >
        <Providers>
          {children}
        </Providers>
        <PwaRegister />
        <TwSizeIndicator />
      </body>
    </html>
  );
}
