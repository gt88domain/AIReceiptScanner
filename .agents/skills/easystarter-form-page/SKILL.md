---
name: easystarter-form-page
description: Generate form pages with TanStack Form and Zod validation
---

# TanStack Form Page Generator

Generate a new form page using TanStack Form + Zod validation following the project's patterns.

## Instructions

When the user asks to create a form page, follow these steps:

1. **Gather Requirements**
   - Ask for the page name and route path
   - Ask what fields are needed
   - Ask if it's a create or edit form
   - Ask which API endpoint to call

2. **Create the Route File**

   Location: `apps/web/src/routes/_authed/(dashboard)/{path}.tsx`

   Follow this pattern:

   ```typescript
   import { useForm } from "@tanstack/react-form";
   import { useMutation, useQuery } from "@tanstack/react-query";
   import { createFileRoute } from "@tanstack/react-router";
   import { Loader2Icon } from "lucide-react";
   import { toast } from "sonner";
   import { z } from "zod";

   import { Button } from "@/components/ui/button";
   import {
     Card,
     CardContent,
     CardDescription,
     CardHeader,
     CardTitle,
   } from "@/components/ui/card";
   import {
     Field,
     FieldDescription,
     FieldError,
     FieldGroup,
     FieldLabel,
     FieldSeparator,
   } from "@/components/ui/field";
   import { Input } from "@/components/ui/input";
   import { Textarea } from "@/components/ui/textarea";
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from "@/components/ui/select";
   import { useTranslations } from "@/i18n";
   import { orpc, queryClient } from "@/utils/orpc";

   export const Route = createFileRoute("/_authed/(dashboard)/{path}")({
     component: RouteComponent,
   });

   function RouteComponent() {
     const t = useTranslations("{i18nNamespace}");
     const { user } = Route.useRouteContext();

     const mutation = useMutation({
       ...orpc.{resource}.{action}.mutationOptions(),
       onSuccess: () => {
         toast.success(t("success"));
         queryClient.invalidateQueries();
       },
       onError: (error: Error) => {
         toast.error(`${t("error")}: ${error.message}`);
       },
     });

     const form = useForm({
       defaultValues: {
         // field: defaultValue,
       },
       onSubmit: async ({ value }) => {
         mutation.mutate(value);
       },
       validators: {
         onSubmit: z.object({
           // field: z.string().min(1, t("validation.fieldRequired")),
         }),
       },
     });

     return (
       <div className="space-y-6">
         <Card>
           <CardHeader>
             <CardTitle>{t("title")}</CardTitle>
             <CardDescription>{t("description")}</CardDescription>
           </CardHeader>
           <CardContent>
             <form
               onSubmit={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 form.handleSubmit();
               }}
             >
               <FieldGroup>
                 {/* Text Input Field */}
                 <form.Field
                   name="fieldName"
                   children={(field) => {
                     const isInvalid =
                       field.state.meta.isTouched && !field.state.meta.isValid;

                     return (
                       <Field data-invalid={isInvalid}>
                         <FieldLabel htmlFor={field.name}>
                           {t("fieldLabel")}
                         </FieldLabel>
                         <Input
                           id={field.name}
                           placeholder={t("fieldPlaceholder")}
                           aria-invalid={isInvalid}
                           value={field.state.value}
                           onBlur={field.handleBlur}
                           onChange={(e) => field.handleChange(e.target.value)}
                         />
                         <FieldDescription>
                           {t("fieldDescription")}
                         </FieldDescription>
                         {isInvalid && (
                           <FieldError errors={field.state.meta.errors} />
                         )}
                       </Field>
                     );
                   }}
                 />

                 {/* Textarea Field */}
                 <form.Field
                   name="description"
                   children={(field) => {
                     const isInvalid =
                       field.state.meta.isTouched && !field.state.meta.isValid;

                     return (
                       <Field data-invalid={isInvalid}>
                         <FieldLabel htmlFor={field.name}>
                           {t("descriptionLabel")}
                         </FieldLabel>
                         <Textarea
                           id={field.name}
                           placeholder={t("descriptionPlaceholder")}
                           aria-invalid={isInvalid}
                           value={field.state.value}
                           onBlur={field.handleBlur}
                           onChange={(e) => field.handleChange(e.target.value)}
                         />
                         {isInvalid && (
                           <FieldError errors={field.state.meta.errors} />
                         )}
                       </Field>
                     );
                   }}
                 />

                 {/* Select Field */}
                 <form.Field
                   name="status"
                   children={(field) => {
                     const isInvalid =
                       field.state.meta.isTouched && !field.state.meta.isValid;

                     return (
                       <Field data-invalid={isInvalid}>
                         <FieldLabel htmlFor={field.name}>
                           {t("statusLabel")}
                         </FieldLabel>
                         <Select
                           value={field.state.value}
                           onValueChange={field.handleChange}
                         >
                           <SelectTrigger id={field.name}>
                             <SelectValue placeholder={t("selectStatus")} />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="active">
                               {t("status.active")}
                             </SelectItem>
                             <SelectItem value="inactive">
                               {t("status.inactive")}
                             </SelectItem>
                           </SelectContent>
                         </Select>
                         {isInvalid && (
                           <FieldError errors={field.state.meta.errors} />
                         )}
                       </Field>
                     );
                   }}
                 />

                 <FieldSeparator />

                 <div className="flex justify-end">
                   <form.Subscribe>
                     {(state) => (
                       <Button
                         type="submit"
                         disabled={
                           !state.canSubmit ||
                           state.isSubmitting ||
                           mutation.isPending
                         }
                       >
                         {(state.isSubmitting || mutation.isPending) && (
                           <Loader2Icon className="mr-2 size-4 animate-spin" />
                         )}
                         {mutation.isPending ? t("saving") : t("save")}
                       </Button>
                     )}
                   </form.Subscribe>
                 </div>
               </FieldGroup>
             </form>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

3. **Add i18n Translations**

   See the `/i18n` skill for adding translations.

## Field Patterns

### Disabled Field (read-only)

```tsx
<form.Field
  name="email"
  children={(field) => (
    <Field>
      <FieldLabel htmlFor={field.name}>{t("email")}</FieldLabel>
      <Input id={field.name} disabled value={field.state.value} />
      <FieldDescription>{t("emailDescription")}</FieldDescription>
    </Field>
  )}
/>
```

### Checkbox Field

```tsx
<form.Field
  name="isActive"
  children={(field) => (
    <Field className="flex items-center gap-2">
      <Checkbox id={field.name} checked={field.state.value} onCheckedChange={field.handleChange} />
      <FieldLabel htmlFor={field.name}>{t("isActive")}</FieldLabel>
    </Field>
  )}
/>
```

### Number Field

```tsx
<form.Field
  name="price"
  children={(field) => {
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor={field.name}>{t("price")}</FieldLabel>
        <Input
          id={field.name}
          type="number"
          min={0}
          aria-invalid={isInvalid}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(Number(e.target.value))}
        />
        {isInvalid && <FieldError errors={field.state.meta.errors} />}
      </Field>
    );
  }}
/>
```

## Key Patterns

- Use TanStack Form for form state management
- Use Zod for validation schemas
- Use TanStack Query mutations for API calls
- Use `toast` from sonner for success/error notifications
- Use `queryClient.invalidateQueries()` to refresh data after mutations
- Use `useTranslations` for i18n
- Always include loading states on submit buttons
- Use `data-invalid` attribute for styling invalid fields
- Use `aria-invalid` for accessibility
