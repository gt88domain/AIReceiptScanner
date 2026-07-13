---
name: easystarter-component
description: Add or customize shadcn/ui components
---

# shadcn/ui Component Generator

Add or customize shadcn/ui components following the project's patterns.

## Instructions

When the user asks to add a UI component, follow these steps:

1. **Check if Component Exists**

   Look in `apps/web/src/components/ui/` for existing components.

2. **Add New shadcn Component**

   Run from the web app directory:

   ```bash
   cd apps/web && npx shadcn@latest add {component-name}
   ```

   Available components:
   - accordion, alert, alert-dialog, aspect-ratio, avatar
   - badge, breadcrumb, button, calendar, card
   - carousel, chart, checkbox, collapsible, command
   - context-menu, data-table, dialog, drawer, dropdown-menu
   - form, hover-card, input, input-otp, label
   - menubar, navigation-menu, pagination, popover, progress
   - radio-group, resizable, scroll-area, select, separator
   - sheet, sidebar, skeleton, slider, sonner
   - switch, table, tabs, textarea, toast
   - toggle, toggle-group, tooltip

3. **Component Pattern**

   Location: `apps/web/src/components/ui/{component}.tsx`

   ```typescript
   import * as React from "react";
   import { Slot } from "@radix-ui/react-slot";
   import { cva, type VariantProps } from "class-variance-authority";

   import { cn } from "@/lib/utils";

   const componentVariants = cva(
     "base-classes-here",
     {
       variants: {
         variant: {
           default: "default-variant-classes",
           secondary: "secondary-variant-classes",
           destructive: "destructive-variant-classes",
         },
         size: {
           default: "default-size-classes",
           sm: "small-size-classes",
           lg: "large-size-classes",
         },
       },
       defaultVariants: {
         variant: "default",
         size: "default",
       },
     }
   );

   function Component({
     className,
     variant,
     size,
     asChild = false,
     ...props
   }: React.ComponentProps<"div"> &
     VariantProps<typeof componentVariants> & {
       asChild?: boolean;
     }) {
     const Comp = asChild ? Slot : "div";

     return (
       <Comp
         data-slot="component"
         className={cn(componentVariants({ variant, size, className }))}
         {...props}
       />
     );
   }

   export { Component, componentVariants };
   ```

## Custom Component Examples

### Status Badge

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      },
    },
    defaultVariants: {
      status: "active",
    },
  }
);

function StatusBadge({
  className,
  status,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span
      className={cn(statusBadgeVariants({ status, className }))}
      {...props}
    >
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
```

### Loading Button

```typescript
import { Loader2Icon } from "lucide-react";
import { Button, type ButtonProps } from "./button";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}

export { LoadingButton };
```

### Empty State

```typescript
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground">{icon}</div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
```

## Feature Components

Location: `apps/web/src/components/{feature}/`

### Example: Product Card

```typescript
// apps/web/src/components/products/product-card.tsx
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    status: "active" | "inactive" | "draft";
    image?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold">{product.name}</h3>
        <StatusBadge status={product.status}>{product.status}</StatusBadge>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">${(product.price / 100).toFixed(2)}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

export { ProductCard };
```

## Key Patterns

- Use `cva` (class-variance-authority) for variant-based styling
- Use `cn` utility for merging classNames
- Use `data-slot` attribute for component identification
- Export both component and variants
- Use `asChild` pattern with Radix Slot for composition
- Follow shadcn/ui naming conventions
- Place UI primitives in `components/ui/`
- Place feature components in `components/{feature}/`
- Always include proper TypeScript types
- Use Lucide icons for consistency
