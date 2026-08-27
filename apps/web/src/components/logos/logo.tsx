import { webConfig } from "@/configs/web-config";
import { cn } from "@/lib/utils";
import SvgLogo from "./svg/logo";

const DEFAULT_LOGO_SIZE = 40;

interface LogoProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

const Logo = ({
  src,
  alt = `${webConfig.AppName} logo`,
  size = DEFAULT_LOGO_SIZE,
  className,
}: LogoProps) => {
  if (!src) {
    return (
      <SvgLogo
        aria-label={alt}
        className={cn("shrink-0", className)}
        height={size}
        role="img"
        width={size}
      />
    );
  }

  return (
    <img src={src} alt={alt} width={size} height={size} className={cn("shrink-0", className)} />
  );
};

export default Logo;
