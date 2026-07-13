# EasyStarter i18n Implementation Guide

## Overview

This project adopts a **per-platform runtime implementation** strategy, while translation message files are now centralized in `packages/i18n/src/messages`.

| Platform   | Library                     | Language Source          | Status       |
| ---------- | --------------------------- | ------------------------ | ------------ |
| **Web**    | use-intl                    | URL prefix / Cookie      | ✅ Completed |
| **Server** | Custom lightweight solution | Cookie / Accept-Language | ✅ Completed |
| **Native** | react-i18next               | AsyncStorage             | ⏳ Pending   |

---

## Web Implementation (Completed)

### Technical Approach

- **Library**: use-intl (~2kb)
- **URL Strategy**: Default language has no prefix `/about`, other languages have prefix `/zh/about`
- **Ignored Paths**: `/dashboard`, `/api`, `/rpc` read language from cookie
- **SSR**: Implemented via TanStack Router URL Rewrite

### File Structure

```
apps/web/src/i18n/
├── config.ts          # Configuration (language list, cookie name, path rules)
├── client.ts          # Client utilities (URL rewriting, locale detection)
├── server.ts          # Server middleware (redirects, cookie sync)
├── provider.tsx       # IntlProvider wrapper
├── index.ts           # Unified exports
└── messages/
    └── index.ts       # Message loader (reads from @repo/i18n/messages)

packages/i18n/src/messages/web/
├── en.json            # English translations
├── zh.json            # Chinese translations
└── jp.json            # Japanese translations

apps/web/src/components/i18n/
├── index.ts
└── locale-switcher.tsx  # Language switcher component

apps/web/src/router.tsx   # Locale URL rewrite (deLocalize/localize)
apps/web/src/i18n/server.ts # Locale middleware (redirect/cookie sync)
```

### Usage

```tsx
import { useTranslations } from "@/i18n";

function MyComponent() {
	const t = useTranslations();
	return <h1>{t("auth.signIn")}</h1>;
}
```

### Translation File Structure

```json
{
	"common": {
		"loading": "Loading...",
		"error": "Something went wrong"
	},
	"auth": {
		"signIn": "Sign In",
		"signUp": "Sign Up",
		"validation": {
			"invalidEmail": "Invalid email address"
		}
	},
	"dashboard": {
		"welcome": "Welcome back, {name}"
	}
}
```

---

## Server Implementation (Completed)

### Technical Approach

- **Library**: Custom lightweight solution (~50 lines of code)
- **Language Source**: Cookie > Accept-Language > Default language
- **Use Cases**: API error messages, email templates

### File Structure

```
apps/server/src/i18n/
└── index.ts           # Core utility functions (loads messages from @repo/i18n/messages)

packages/i18n/src/messages/server/
├── en.json            # English translations
├── zh.json            # Chinese translations
└── jp.json            # Japanese translations
```

### Core Implementation

```typescript
// apps/server/src/i18n/index.ts
import { serverMessages } from "@repo/i18n/messages";

const messages = serverMessages;
type Locale = keyof typeof messages;

const LOCALE_COOKIE = "locale";

/**
 * Get locale from request
 */
export function getLocaleFromRequest(request: Request): Locale {
	// 1. Read from cookie
	const cookie = request.headers.get("cookie");
	const cookieMatch = cookie?.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
	if (cookieMatch?.[1] && cookieMatch[1] in messages) {
		return cookieMatch[1] as Locale;
	}

	// 2. Read from Accept-Language
	const acceptLang = request.headers
		.get("accept-language")
		?.split(",")[0]
		?.split("-")[0];
	if (acceptLang && acceptLang in messages) {
		return acceptLang as Locale;
	}

	// 3. Default language
	return "en";
}

/**
 * Create translation function
 */
export function createT(locale: Locale) {
	const dict = messages[locale] ?? messages.en;

	return (key: string, params?: Record<string, string | number>) => {
		const keys = key.split(".");
		let value: unknown = dict;
		for (const k of keys) {
			value = (value as Record<string, unknown>)?.[k];
		}

		if (typeof value !== "string") return key;

		if (params) {
			return value.replace(/\{(\w+)\}/g, (_, k) =>
				String(params[k] ?? `{${k}}`),
			);
		}
		return value;
	};
}

/**
 * Export types
 */
export type { Locale };
export { messages };
```

### Hono Middleware

```typescript
// apps/server/src/middlewares/i18n.ts
import { createMiddleware } from "hono/factory";
import { getLocaleFromRequest, createT, type Locale } from "../i18n";

// Extend Hono Context type
declare module "hono" {
	interface ContextVariableMap {
		locale: Locale;
		t: ReturnType<typeof createT>;
	}
}

export const i18nMiddleware = createMiddleware(async (c, next) => {
	const locale = getLocaleFromRequest(c.req.raw);
	c.set("locale", locale);
	c.set("t", createT(locale));
	await next();
});
```

### Usage in Routes

```typescript
// apps/server/src/handlers/api.ts
import { Hono } from "hono";
import { i18nMiddleware } from "../middlewares/i18n";

const app = new Hono();

app.use("*", i18nMiddleware);

app.get("/api/user/:id", (c) => {
	const t = c.get("t");
	const user = getUserById(c.req.param("id"));

	if (!user) {
		return c.json({ error: t("errors.userNotFound") }, 404);
	}

	return c.json(user);
});
```

### Usage in Emails

```typescript
// apps/server/src/emails/senders/sign-up-verify-email.ts
import { createT, type Locale } from "../../i18n";

export async function sendVerificationEmail({
	to,
	name,
	verificationUrl,
	locale = "en",
}: {
	to: string;
	name: string;
	verificationUrl: string;
	locale?: Locale;
}) {
	const t = createT(locale);
	const appName = serverConfig.serverName;

	const html = await render(
		SignUpVerifyEmail({
			name,
			verificationUrl,
			appName,
			// Pass translations
			title: t("email.verification.title"),
			greeting: t("email.verification.greeting", { name }),
			body: t("email.verification.body"),
			button: t("email.verification.button"),
		}),
	);

	await resend.emails.send({
		from: fromEmail,
		to,
		subject: t("email.verification.subject", { appName }),
		html,
	});
}
```

### Translation Files

```json
// packages/i18n/src/messages/server/en.json
{
	"errors": {
		"unauthorized": "Unauthorized access",
		"notFound": "Resource not found",
		"invalidEmail": "Invalid email format",
		"rateLimited": "Too many requests, please try again later"
	},
	"email": {
		"verification": {
			"subject": "Verify your email for {appName}",
			"title": "Email Verification",
			"greeting": "Hello {name}",
			"body": "Click the button below to verify your email address",
			"button": "Verify Email",
			"expiry": "This link expires in 24 hours"
		},
		"passwordReset": {
			"subject": "Reset your password for {appName}",
			"title": "Password Reset",
			"greeting": "Hello {name}",
			"body": "Click the button below to reset your password",
			"button": "Reset Password"
		}
	}
}
```

```json
// packages/i18n/src/messages/server/zh.json
{
	"errors": {
		"unauthorized": "未授权访问",
		"notFound": "资源不存在",
		"invalidEmail": "邮箱格式错误",
		"rateLimited": "请求过于频繁，请稍后再试"
	},
	"email": {
		"verification": {
			"subject": "验证你的 {appName} 邮箱",
			"title": "邮箱验证",
			"greeting": "你好 {name}",
			"body": "点击下方按钮验证你的邮箱地址",
			"button": "验证邮箱",
			"expiry": "此链接 24 小时内有效"
		},
		"passwordReset": {
			"subject": "重置你的 {appName} 密码",
			"title": "密码重置",
			"greeting": "你好 {name}",
			"body": "点击下方按钮重置你的密码",
			"button": "重置密码"
		}
	}
}
```

---

## Native Implementation (Pending)

### Technical Approach

- **Library**: react-i18next
- **Language Storage**: AsyncStorage
- **Language Detection**: Device language > AsyncStorage > Default language

### Dependencies

```bash
cd apps/native
pnpm add i18next react-i18next @react-native-async-storage/async-storage
```

### File Structure

```
apps/native/src/i18n/
├── index.ts           # i18next initialization
└── languageDetector.ts # Language detector

packages/i18n/src/messages/native/
├── en.json            # English translations
├── zh.json            # Chinese translations
└── jp.json            # Japanese translations
```

### Core Implementation

```typescript
// apps/native/src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { nativeMessages } from "@repo/i18n/messages";

const LOCALE_STORAGE_KEY = "locale";

const resources = {
	en: { translation: nativeMessages.en },
	zh: { translation: nativeMessages.zh },
};

export const supportedLocales = ["en", "zh"] as const;
export type Locale = (typeof supportedLocales)[number];

// Language detector
const languageDetector = {
	type: "languageDetector" as const,
	async: true,
	detect: async (callback: (lng: string) => void) => {
		try {
			// 1. Read from AsyncStorage
			const storedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
			if (storedLocale && supportedLocales.includes(storedLocale as Locale)) {
				callback(storedLocale);
				return;
			}

			// 2. Read from device language
			const deviceLocale = Localization.locale.split("-")[0];
			if (supportedLocales.includes(deviceLocale as Locale)) {
				callback(deviceLocale);
				return;
			}

			// 3. Default language
			callback("en");
		} catch {
			callback("en");
		}
	},
	init: () => {},
	cacheUserLanguage: async (lng: string) => {
		try {
			await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng);
		} catch {
			// ignore
		}
	},
};

i18n
	.use(languageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		interpolation: {
			escapeValue: false,
		},
	});

export default i18n;

/**
 * Change language
 */
export async function changeLanguage(locale: Locale) {
	await i18n.changeLanguage(locale);
	await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Get current locale
 */
export function getCurrentLocale(): Locale {
	return i18n.language as Locale;
}
```

### Provider Setup

```typescript
// apps/native/app/_layout.tsx
import '../src/i18n' // Initialize i18n

export default function RootLayout() {
  return (
    // ... other providers
    <Stack>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
    </Stack>
  )
}
```

### Usage

```typescript
// In components
import { useTranslation } from 'react-i18next'

function MyScreen() {
  const { t } = useTranslation()

  return (
    <View>
      <Text>{t('tabs.home')}</Text>
    </View>
  )
}
```

### Language Switcher Component

```typescript
// apps/native/src/components/LocaleSwitcher.tsx
import { useTranslation } from 'react-i18next'
import { View, Text, TouchableOpacity } from 'react-native'
import { changeLanguage, supportedLocales, type Locale } from '../i18n'

const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
}

export function LocaleSwitcher() {
  const { i18n } = useTranslation()
  const currentLocale = i18n.language as Locale

  const handleChange = async (locale: Locale) => {
    await changeLanguage(locale)
  }

  return (
    <View>
      {supportedLocales.map((locale) => (
        <TouchableOpacity
          key={locale}
          onPress={() => handleChange(locale)}
          style={{
            padding: 10,
            backgroundColor: currentLocale === locale ? '#eee' : 'transparent',
          }}
        >
          <Text>{localeNames[locale]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

### Translation Files

```json
// packages/i18n/src/messages/native/en.json
{
	"tabs": {
		"home": "Home",
		"profile": "Profile"
	},
	"drawer": {
		"settings": "Settings",
		"about": "About"
	},
	"permissions": {
		"camera": "Camera permission is required",
		"notification": "Enable notifications to receive important updates"
	},
	"common": {
		"loading": "Loading...",
		"error": "Something went wrong",
		"retry": "Retry"
	}
}
```

```json
// packages/i18n/src/messages/native/zh.json
{
	"tabs": {
		"home": "首页",
		"profile": "我的"
	},
	"drawer": {
		"settings": "设置",
		"about": "关于"
	},
	"permissions": {
		"camera": "需要相机权限",
		"notification": "开启通知以接收重要消息"
	},
	"common": {
		"loading": "加载中...",
		"error": "出错了",
		"retry": "重试"
	}
}
```

---

## Configuration Consistency

### Supported Languages

All platforms should maintain consistency:

```typescript
export const supportedLocales = ["en", "zh"] as const;
export const defaultLocale = "en";
export const LOCALE_COOKIE = "locale"; // Shared by Web/Server
```

### Translation Key Naming Convention

```
{namespace}.{feature}.{element}

Examples:
- auth.signIn
- auth.validation.invalidEmail
- dashboard.welcome
- email.verification.subject
```

---

## Implementation Checklist

### Server

- [ ] Create `apps/server/src/i18n/index.ts`
- [ ] Create `packages/i18n/src/messages/server/en.json`
- [ ] Create `packages/i18n/src/messages/server/zh.json`
- [ ] Create `apps/server/src/middlewares/i18n.ts`
- [ ] Apply middleware to API routes
- [ ] Update email sending functions to support multiple languages

### Native

- [ ] Install dependencies `i18next react-i18next @react-native-async-storage/async-storage`
- [ ] Create `apps/native/src/i18n/index.ts`
- [ ] Create `packages/i18n/src/messages/native/en.json`
- [ ] Create `packages/i18n/src/messages/native/zh.json`
- [ ] Initialize i18n in `_layout.tsx`
- [ ] Create language switcher component
- [ ] Replace hardcoded text with translations
