---
name: easystarter-i18n
description: Add internationalization translations (en/zh/jp)
---

# i18n Translation Generator

Add internationalization translations following the project's patterns.

## Instructions

When the user asks to add translations, follow these steps:

1. **Gather Requirements**
   - Ask for the namespace/section (e.g., "dashboard.products")
   - Ask what text strings need translation
   - Ask which locales to support (default: en, zh, jp)

2. **Update Translation Files**

   Location: `packages/i18n/src/messages/web/{locale}.json`

   ### English (en.json)

   ```json
   {
     "dashboard": {
       "products": {
         "title": "Products",
         "description": "Manage your product catalog",
         "table": {
           "name": "Name",
           "price": "Price",
           "status": "Status",
           "actions": "Actions",
           "searchPlaceholder": "Search products...",
           "noResults": "No products found."
         },
         "status": {
           "active": "Active",
           "inactive": "Inactive",
           "draft": "Draft"
         },
         "actions": {
           "create": "Create Product",
           "edit": "Edit",
           "delete": "Delete",
           "deleting": "Deleting...",
           "deleteSuccess": "Product deleted successfully",
           "deleteError": "Failed to delete: {message}"
         },
         "form": {
           "name": "Product Name",
           "nameDescription": "The display name for this product.",
           "namePlaceholder": "Enter product name",
           "price": "Price",
           "priceDescription": "Set the product price in cents.",
           "save": "Save",
           "saving": "Saving...",
           "success": "Product saved successfully",
           "error": "Failed to save product"
         },
         "validation": {
           "nameRequired": "Product name is required",
           "nameMinLength": "Name must be at least 2 characters",
           "priceRequired": "Price is required",
           "priceMin": "Price must be greater than 0"
         }
       }
     }
   }
   ```

   ### Chinese (zh.json)

   ```json
   {
     "dashboard": {
       "products": {
         "title": "产品",
         "description": "管理您的产品目录",
         "table": {
           "name": "名称",
           "price": "价格",
           "status": "状态",
           "actions": "操作",
           "searchPlaceholder": "搜索产品...",
           "noResults": "未找到产品。"
         },
         "status": {
           "active": "启用",
           "inactive": "禁用",
           "draft": "草稿"
         },
         "actions": {
           "create": "创建产品",
           "edit": "编辑",
           "delete": "删除",
           "deleting": "删除中...",
           "deleteSuccess": "产品删除成功",
           "deleteError": "删除失败：{message}"
         },
         "form": {
           "name": "产品名称",
           "nameDescription": "此产品的显示名称。",
           "namePlaceholder": "输入产品名称",
           "price": "价格",
           "priceDescription": "设置产品价格（单位：分）。",
           "save": "保存",
           "saving": "保存中...",
           "success": "产品保存成功",
           "error": "保存产品失败"
         },
         "validation": {
           "nameRequired": "产品名称为必填项",
           "nameMinLength": "名称至少需要2个字符",
           "priceRequired": "价格为必填项",
           "priceMin": "价格必须大于0"
         }
       }
     }
   }
   ```

   ### Japanese (jp.json)

   ```json
   {
     "dashboard": {
       "products": {
         "title": "製品",
         "description": "製品カタログを管理",
         "table": {
           "name": "名前",
           "price": "価格",
           "status": "ステータス",
           "actions": "アクション",
           "searchPlaceholder": "製品を検索...",
           "noResults": "製品が見つかりません。"
         },
         "status": {
           "active": "有効",
           "inactive": "無効",
           "draft": "下書き"
         },
         "actions": {
           "create": "製品を作成",
           "edit": "編集",
           "delete": "削除",
           "deleting": "削除中...",
           "deleteSuccess": "製品を削除しました",
           "deleteError": "削除に失敗しました：{message}"
         },
         "form": {
           "name": "製品名",
           "nameDescription": "この製品の表示名です。",
           "namePlaceholder": "製品名を入力",
           "price": "価格",
           "priceDescription": "製品価格を設定（単位：セント）。",
           "save": "保存",
           "saving": "保存中...",
           "success": "製品を保存しました",
           "error": "製品の保存に失敗しました"
         },
         "validation": {
           "nameRequired": "製品名は必須です",
           "nameMinLength": "名前は2文字以上必要です",
           "priceRequired": "価格は必須です",
           "priceMin": "価格は0より大きい必要があります"
         }
       }
     }
   }
   ```

3. **Usage in Components**

   ```typescript
   import { useTranslations } from "@/i18n";

   function ProductForm() {
     const t = useTranslations("dashboard.products.form");

     return (
       <div>
         <h1>{t("title")}</h1>
         <p>{t("description")}</p>

         {/* With interpolation */}
         <p>{t("deleteError", { message: error.message })}</p>
       </div>
     );
   }
   ```

## Translation Key Conventions

### Namespacing

```
{area}.{feature}.{section}.{key}

Examples:
- dashboard.users.table.name
- dashboard.settings.profile.title
- auth.signIn.title
- common.actions.save
```

### Common Sections

- `title` - Page/section title
- `description` - Page/section description
- `table.*` - Table column headers and messages
- `form.*` - Form labels and messages
- `actions.*` - Action buttons and confirmations
- `status.*` - Status labels
- `validation.*` - Validation error messages

### Common Keys

```json
{
  "title": "Title",
  "description": "Description",
  "save": "Save",
  "saving": "Saving...",
  "cancel": "Cancel",
  "delete": "Delete",
  "deleting": "Deleting...",
  "edit": "Edit",
  "create": "Create",
  "success": "Operation successful",
  "error": "Operation failed",
  "noResults": "No results found.",
  "searchPlaceholder": "Search..."
}
```

### Interpolation

Use `{variable}` for dynamic values:

```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "{count} items",
  "errorMessage": "Error: {message}"
}
```

## Key Patterns

- Keep translations flat within their namespace
- Use consistent key naming across locales
- Always provide all three locales (en, zh, jp)
- Use interpolation `{variable}` for dynamic content
- Group related translations under common prefixes
- Include loading states (e.g., "saving", "deleting")
- Include success/error messages for all actions
