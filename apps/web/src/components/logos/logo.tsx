// import { Image } from "@unpic/react";
import logoPng from "@/components/logos/png/logo.png";
import { webConfig } from "@/configs/web-config";
import { cn } from "@/lib/utils";

const DEFAULT_LOGO_SIZE = 40;

interface LogoProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

const Logo = ({
  src = logoPng,
  alt = `${webConfig.AppName} logo`,
  size = DEFAULT_LOGO_SIZE,
  className,
}: LogoProps) => {
  return (
    <img src={src} alt={alt} width={size} height={size} className={cn("shrink-0", className)} />
  );
};

export default Logo;
