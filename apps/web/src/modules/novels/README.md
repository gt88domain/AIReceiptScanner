# Novel Public Web Module

This folder owns AI Novel public layout, cards, copy, URL-state mapping, and
SEO choices. It consumes the shared Discovery listing components but does not
modify them for novel-specific behavior.

The public runtime path is:

```txt
/novels route -> NovelLibrary -> novels.list oRPC -> existing D1
```

Add a page-specific component here before considering a shared template change.
Only promote a behavior after at least two independent resources need the same
contract. New routes may live outside `_public` when they require this
site-owned header/footer rather than EasyStarter's generic public shell.
