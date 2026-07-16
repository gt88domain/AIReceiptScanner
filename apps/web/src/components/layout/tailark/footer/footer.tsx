import { Link } from "@tanstack/react-router";
import type React from "react";
import { BrandLogo } from "@/components/logos/brand-logo";
import { webConfig } from "@/configs/web-config";
import { useTranslations } from "@/i18n";

interface Footer7Props {
  logo?: {
    url: string;
    alt: string;
    title: string;
  };
  sections?: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
}

const currentYear = new Date().getFullYear();

export const Footer = ({
  logo = {
    url: webConfig.AppUrl,
    alt: "logo",
    title: webConfig.AppName,
  },
  sections,
  description,
  socialLinks,
  copyright,
  legalLinks,
}: Footer7Props) => {
  const authT = useTranslations("auth");
  const footerT = useTranslations("landingPage.footer");
  const resolvedSections = sections ?? [
    {
      title: footerT("sections.product.title"),
      links: [
        { name: footerT("sections.product.links.overview"), href: "/" },
        { name: footerT("sections.product.links.pricing"), href: "/#pricing" },
        { name: footerT("sections.product.links.listingTemplate"), href: "/templates/listing" },
        { name: footerT("sections.product.links.features"), href: "/#features" },
      ],
    },
    {
      title: footerT("sections.resources.title"),
      links: [
        { name: footerT("sections.resources.links.privacy"), href: "/privacy" },
        { name: footerT("sections.resources.links.terms"), href: "/terms" },
        { name: footerT("sections.resources.links.docs"), href: "/docs" },
        { name: footerT("sections.resources.links.blog"), href: "/blog" },
      ],
    },
  ];
  const resolvedDescription = description ?? footerT("description");
  // ponytail: social accounts belong to the template adopter, so no upstream profile is rendered by default.
  const resolvedSocialLinks = socialLinks ?? [];
  const resolvedCopyright = copyright ?? footerT("copyright", { year: currentYear });
  const resolvedLegalLinks = legalLinks ?? [
    { name: authT("termsOfService"), href: "/terms" },
    { name: authT("privacyPolicy"), href: "/privacy" },
  ];

  return (
    <section className="border-t py-12 sm:py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Single Row Layout - Everything in one horizontal line */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 sm:gap-12">
          {/* Left Side - Logo and Description */}
          <div className="flex flex-col gap-4 text-center sm:text-left sm:shrink-0 sm:max-w-xs">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <a href={logo.url}>
                <BrandLogo alt={logo.alt} title={logo.title} />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">{resolvedDescription}</p>
            {resolvedSocialLinks.length > 0 ? (
              <ul className="flex items-center justify-center space-x-4 text-muted-foreground sm:justify-start">
                {resolvedSocialLinks.map((social) => (
                  <li key={social.href} className="font-medium hover:text-primary transition-colors">
                    <a href={social.href} aria-label={social.label}>
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Right Side - Navigation Sections in Left-Right Layout */}
          <div className="grid grid-cols-2 gap-6 sm:gap-12 flex-1 sm:max-w-md sm:ml-auto">
            {resolvedSections.map((section, sectionIdx) => (
              <div
                key={sectionIdx}
                className="flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <h3 className="mb-3 sm:mb-4 font-semibold text-foreground text-sm sm:text-base">
                  {section.title}
                </h3>
                <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx} className="font-medium hover:text-primary transition-colors">
                      {link.href.startsWith("/#") ? (
                        <a href={link.href}>{link.name}</a>
                      ) : link.href.startsWith("/") ? (
                        <Link to={link.href}>{link.name}</Link>
                      ) : (
                        <a href={link.href}>{link.name}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section - Copyright and Legal Links */}
        <div className="mt-12 flex flex-col justify-between gap-4 border-t pt-8 text-center text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:text-left">
          <p className="order-2 sm:order-1">{resolvedCopyright}</p>
          <ul className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:order-2 sm:justify-end">
            {resolvedLegalLinks.map((link, idx) => (
              <li key={idx} className="hover:text-primary transition-colors">
                {link.href.startsWith("/") ? (
                  <Link to={link.href}>{link.name}</Link>
                ) : (
                  <a href={link.href}>{link.name}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
