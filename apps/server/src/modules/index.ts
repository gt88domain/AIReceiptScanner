import {
  novelForumRouter,
  novelPublicRouter,
  novelWorldRouter,
} from "./novels/router";

/**
 * Product-domain router registry.
 *
 * The public AINovel surfaces live here rather than in template/platform
 * routers, keeping reader data separate from accounts and billing.
 */
export const moduleRouters = {
  forums: novelForumRouter,
  novels: novelPublicRouter,
  worlds: novelWorldRouter,
};
